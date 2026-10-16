/**
 * Local text embeddings for the RAG retriever.
 *
 * Uses `Xenova/bge-small-en-v1.5` through transformers.js, running on this
 * server. No API key, no per-request cost, and no product or customer text is
 * sent to a third party — which is why this is here rather than a hosted
 * embedding API.
 *
 * Output is mean-pooled and L2-normalised, so cosine similarity is a plain dot
 * product and pgvector's `<=>` operator lines up with it.
 *
 * DIMENSIONS is asserted against the model at load time. If the model is ever
 * swapped, that check fails loudly instead of letting a mismatched vector into
 * a `vector(384)` column and silently degrading every answer.
 */

import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/** Must match `vector(384)` in supabase/rag.sql. */
export const EMBEDDING_DIMENSIONS = 384;
export const EMBEDDING_MODEL = "Xenova/bge-small-en-v1.5";

/**
 * Max tokens per chunk. bge-small has a 512-token limit; chunks are built to sit
 * well inside it (see lib/rag/chunk.ts) so nothing is silently truncated.
 */
export const MAX_CHUNK_CHARS = 1200;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Loads the model once per server process and reuses it.
 *
 * The first call downloads roughly 90 MB (then reads from the transformers.js
 * cache, so subsequent boots are ~250 ms). The pipeline is cached in a module
 * variable rather than re-created per request.
 */
export function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    // Fetch from the HuggingFace hub rather than looking for files on disk —
    // this app never ships the model as an asset.
    env.allowLocalModels = false;
    extractorPromise = pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
  }
  return extractorPromise;
}

/** Warms the model up so the first user question does not pay the load cost. */
export async function warmUp(): Promise<void> {
  await getExtractor();
}

/**
 * Embeds a batch of strings into L2-normalised vectors.
 *
 * transformers.js returns one flat Float32Array for the whole batch, so each
 * vector is sliced out by hand — indexing it directly would silently return the
 * concatenated buffer and give every chunk the same meaningless vector.
 *
 * @throws if the model does not produce {@link EMBEDDING_DIMENSIONS} dimensions.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });

  const [batchSize, width] = output.dims as [number, number];

  if (width !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `${EMBEDDING_MODEL} produced ${width} dimensions but the database column is ` +
        `vector(${EMBEDDING_DIMENSIONS}). Re-apply supabase/rag.sql with the new width, ` +
        `or change EMBEDDING_DIMENSIONS in lib/rag/embeddings.ts.`
    );
  }

  return Array.from({ length: batchSize }, (_, i) =>
    Array.from(output.data.slice(i * width, (i + 1) * width))
  );
}

/** Embeds a single string into one vector. */
export async function embedOne(text: string): Promise<number[]> {
  const [vector] = await embed([text]);
  return vector;
}