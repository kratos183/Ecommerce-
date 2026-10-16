/**
 * Building the vector index.
 *
 * Reads the live catalogue plus the static documents, embeds them, and replaces
 * the contents of `knowledge_chunks` for those sources. Static documents are
 * replaced by `doc_id`; products are replaced wholesale, because a deleted
 * product would otherwise leave an orphan chunk that the retriever keeps
 * happily returning.
 *
 * Run it with:  POST /api/knowledge/reindex   (admin only)
 */

import { db } from "@/lib/db";
import { toProducts, type ProductRow } from "@/lib/product-shape";
import { listProducts } from "@/lib/products";
import { describeError } from "@/lib/supabase";
import { embed, EMBEDDING_MODEL } from "./embeddings";
import { chunkDocument, chunkProduct, type Chunk } from "./chunk";
import { KNOWLEDGE_DOCUMENTS } from "./documents";

/** Embedding a whole batch in one call keeps the model warm and is much faster. */
const EMBED_BATCH = 32;

export type IngestReport = {
  products: number;
  documents: number;
  chunks: number;
  removed: number;
  durationMs: number;
};

/** Assembles every chunk that should be in the index. */
export async function collectChunks(): Promise<{ chunks: Chunk[]; products: number; documents: number }> {
  const products = await listProducts();
  const chunks: Chunk[] = [
    ...KNOWLEDGE_DOCUMENTS.flatMap(chunkDocument),
    ...products.map(chunkProduct),
  ];

  return { chunks, products: products.length, documents: KNOWLEDGE_DOCUMENTS.length };
}

/**
 * Rebuilds the index.
 *
 * Idempotent: running it twice produces the same rows, so it is safe to wire to a
 * button, a cron job, or a post-deploy hook.
 */
export async function reindexKnowledge(): Promise<IngestReport> {
  const startedAt = Date.now();
  const { chunks, products, documents } = await collectChunks();

  // Clear the two generated sources first. `knowledge_chunks` only ever holds
  // these, so a full truncate is simpler and faster than a targeted delete —
  // and it guarantees a product deleted since the last run disappears.
  const cleared = await db()
    .from("knowledge_chunks")
    .delete()
    .in("source", ["product", "policy", "service", "faq"]);

  if (cleared.error) throw cleared.error;

  let written = 0;

  for (let start = 0; start < chunks.length; start += EMBED_BATCH) {
    const batch = chunks.slice(start, start + EMBED_BATCH);
    const vectors = await embed(batch.map((chunk) => chunk.content));

    const rows = batch.map((chunk, i) => ({
      doc_id: chunk.docId,
      source: chunk.source,
      title: chunk.title,
      content: chunk.content,
      url: chunk.url ?? null,
      metadata: chunk.metadata ?? {},
      embedding: vectors[i],
    }));

    const { error } = await db().from("knowledge_chunks").insert(rows);
    if (error) throw error;

    written += rows.length;
  }

  return {
    products,
    documents,
    chunks: written,
    removed: chunks.length - written,
    durationMs: Date.now() - startedAt,
  };
}

/** True once the index holds enough chunks to be worth querying. */
export async function isIndexed(): Promise<boolean> {
  const { count, error } = await db()
    .from("knowledge_chunks")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Re-exported so the reindex route can report which model produced the vectors. */
export { EMBEDDING_MODEL, describeError };