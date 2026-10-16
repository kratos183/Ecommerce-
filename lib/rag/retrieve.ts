/**
 * Retrieval.
 *
 * `match_knowledge` in supabase/rag.sql does the hybrid search and the RRF
 * fusion. This module embeds the question, calls that function, and applies the
 * two decisions that cannot be done in SQL:
 *
 *   1. Fallback — if the index is empty (never re-indexed, or the SQL script was
 *      not applied) retrieval degrades to a plain product search so the assistant
 *      still works, just without semantic ranking.
 *
 *   2. Cutoff — bge similarity scores for *everything* sit high (an unrelated
 *      pair still scores around 0.46), so an absolute threshold cannot separate
 *      a good hit from a bad one. Relevance is therefore judged relative to the
 *      best result in the batch, which is what the margin check below uses.
 */

import { db } from "@/lib/db";
import { listProducts, toProducts, PRODUCT_COLUMNS } from "@/lib/products";
import type { Product, ProductRow } from "@/lib/product-shape";
import { asRow, asRows, describeError } from "@/lib/supabase";
import { embedOne } from "./embeddings";
import { isIndexed } from "./ingest";

export type RetrievedChunk = {
  id: number;
  docId: string;
  source: string;
  title: string;
  content: string;
  url: string | null;
  metadata: Record<string, unknown>;
  score: number;
  /** Raw cosine similarity, 0–1. Useful for explaining a result. */
  vectorScore: number;
  keywordScore: number;
};

/** How many chunks to aim for. More context slows the model and dilutes it. */
const DEFAULT_LIMIT = 6;

/**
 * A hit must be within this fraction of the best hit to be kept.
 *
 * With bge, absolute similarity is not a usable filter, but the gap between the
 * top hit and the rest is: if nothing is a clear winner, the question probably
 * is not answerable from the knowledge base at all.
 */
const RELEVANCE_MARGIN = 0.82;

/**
 * Retrieves the chunks most relevant to a question.
 *
 * @param question The user's message, used verbatim for both the embedding and
 *        the keyword search. Rewriting it is left to the caller's prompt.
 */
export async function retrieve(
  question: string,
  options: { limit?: number; sources?: string[] } = {}
): Promise<{ chunks: RetrievedChunk[]; degraded: boolean }> {
  const limit = options.limit ?? DEFAULT_LIMIT;

  try {
    if (!(await isIndexed())) {
      return { chunks: await keywordFallback(question, limit), degraded: true };
    }

    const embedding = await embedOne(question);

    const { data, error } = await db().rpc("match_knowledge", {
      p_embedding: embedding,
      p_query: question,
      p_limit: limit * 2, // Over-fetch, then apply the margin cutoff below.
      p_sources: options.sources ?? null,
    });

    if (error) throw error;

    const rows = asRows<Record<string, unknown>>(data);
    if (rows.length === 0) {
      return { chunks: [], degraded: false };
    }

    const chunks = rows.map((row) => ({
      id: Number(row.id),
      docId: String(row.doc_id ?? ""),
      source: String(row.source ?? ""),
      title: String(row.title ?? ""),
      content: String(row.content ?? ""),
      url: (row.url as string) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      score: Number(row.score ?? 0),
      vectorScore: Number(row.vector_score ?? 0),
      keywordScore: Number(row.keyword_score ?? 0),
    }));

    return { chunks: applyMarginCutoff(chunks, limit), degraded: false };
  } catch (error) {
    // A retriever failure must not take the assistant down — the model can still
    // answer from the personal context and its own knowledge of the business.
    console.error("retrieve() failed:", describeError(error));
    return { chunks: await keywordFallback(question, limit), degraded: true };
  }
}

/**
 * Keeps the hits that are competitive with the best one, capped at `limit`.
 *
 * Always keeps at least one chunk: returning nothing makes the model either
 * refuse everything or, worse, invent something.
 */
function applyMarginCutoff(chunks: RetrievedChunk[], limit: number): RetrievedChunk[] {
  const best = chunks[0]?.vectorScore ?? 0;
  const floor = best * RELEVANCE_MARGIN;

  return chunks
    .filter((chunk, index) => index === 0 || chunk.vectorScore >= floor)
    .slice(0, limit);
}

/**
 * Retrieval without embeddings: matches the question against the live catalogue.
 *
 * Used when the index has not been built. Weaker — it cannot match a paraphrase —
 * but it keeps the assistant answering questions about real products with real
 * prices rather than refusing everything.
 */
async function keywordFallback(question: string, limit: number): Promise<RetrievedChunk[]> {
  try {
    const terms = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      // Drop question scaffolding that would match every product.
      .filter((word) => word.length > 2)
      .slice(0, 8);

    const products = await listProducts(terms.length ? { search: terms[0] } : {});
    const pool = products.length ? products : await listProducts();

    return rankByKeywordOverlap(question, pool, limit).map((product, index) => ({
      id: product.id,
      docId: `product-${product.slug}`,
      source: "product",
      title: product.name,
      content: [
        product.name,
        `Category: ${product.category}. Brand: ${product.brand}.`,
        product.description_intro,
      ]
        .filter(Boolean)
        .join("\n"),
      url: `/product/${product.slug}`,
      metadata: { slug: product.slug, price: product.price, degraded: true },
      score: 1 - index * 0.1,
      vectorScore: 0,
      keywordScore: 0,
    }));
  } catch (error) {
    console.error("keywordFallback() failed:", describeError(error));
    return [];
  }
}

/** Ranks products by how many of the question's words appear in their text. */
function rankByKeywordOverlap(question: string, products: Product[], limit: number): Product[] {
  const words = new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
  );

  return [...products]
    .map((product) => {
      const haystack = `${product.name} ${product.category} ${product.brand} ${product.description_intro}`
        .toLowerCase();
      let hits = 0;
      for (const word of words) if (haystack.includes(word)) hits += 1;
      return { product, hits };
    })
    .filter((scored) => scored.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((scored) => scored.product);
}

/** Looks a product up by slug, used to cite a specific product in an answer. */
export async function getProduct(slug: string): Promise<Product | null> {
  const { data, error } = await db()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getProduct() failed:", describeError(error));
    return null;
  }

  return data ? toProducts([asRow<Record<string, unknown>>(data)])[0] : null;
}