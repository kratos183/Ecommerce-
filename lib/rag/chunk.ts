/**
 * Turning the knowledge base into embeddable chunks.
 *
 * Chunking is deliberately simple: paragraph-aware splitting with overlap, not a
 * tokeniser. bge-small has a 512-token limit and our documents are short, so
 * splitting on paragraph boundaries with a little overlap keeps every chunk
 * self-contained — a chunk that starts mid-sentence retrieves badly and reads
 * badly to the model.
 */

import { MAX_CHUNK_CHARS } from "./embeddings";
import type { KnowledgeDocument } from "./documents";
import type { Product } from "@/lib/product-shape";
import { inr } from "@/lib/site";

export type Chunk = {
  docId: string;
  source: KnowledgeDocument["source"];
  title: string;
  content: string;
  url?: string;
  metadata: Record<string, unknown>;
};

/** How much of the end of one chunk is repeated at the start of the next. */
const OVERLAP_CHARS = 180;

/**
 * Splits text into chunks of at most `max` characters, preferring to break on a
 * blank line, then on a sentence end, and only splitting mid-sentence as a last
 * resort.
 */
export function splitText(text: string, max: number = MAX_CHUNK_CHARS): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= max) return [trimmed];

  const parts: string[] = [];
  let remaining = trimmed;

  while (remaining.length > max) {
    const window = remaining.slice(0, max);

    // Prefer a paragraph break, then a sentence break, then any space.
    const paragraph = window.lastIndexOf("\n\n");
    const sentence = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf(".\n"),
      window.lastIndexOf("! "),
      window.lastIndexOf("? ")
    );
    const space = window.lastIndexOf(" ");

    let cut: number;
    if (paragraph > max * 0.4) cut = paragraph + 2;
    else if (sentence > max * 0.4) cut = sentence + 1;
    else if (space > 0) cut = space + 1;
    else cut = max;

    parts.push(remaining.slice(0, cut).trim());
    // Carry a little of the tail forward so a fact split across the boundary
    // still appears whole in one of the two chunks.
    remaining = remaining.slice(Math.max(0, cut - OVERLAP_CHARS));
  }

  if (remaining.trim()) parts.push(remaining.trim());
  return parts.filter(Boolean);
}

/** Chunks a static document. Short documents produce a single chunk. */
export function chunkDocument(doc: KnowledgeDocument): Chunk[] {
  return splitText(doc.content).map((content, index) => ({
    docId: doc.docId,
    source: doc.source,
    title: doc.title,
    content,
    url: doc.url,
    metadata: {
      ...doc.metadata,
      // Lets the UI label a citation with the section it came from.
      section: index === 0 ? "intro" : `part ${index + 1}`,
    },
  }));
}

/**
 * Builds a retrievable chunk from a product.
 *
 * Price is included because "is this under X" is a real question — but the system
 * prompt instructs the model never to state a price it did not read here, so a
 * stale index degrades to "that looks stale" rather than a confident wrong number.
 */
export function chunkProduct(product: Product): Chunk {
  const specs = Object.entries(product.specifications ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const lines = [
    `${product.name}.`,
    `Brand: ${product.brand || "Obryn"}. Category: ${product.category}.`,
    `Price: ${product.price > 0 ? inr(product.price) : "priced on request"}${
      product.mrp > product.price ? ` (was ${inr(product.mrp)})` : ""
    }.`,
    product.description_intro || "",
    specs,
  ].filter(Boolean);

  return {
    docId: `product-${product.slug}`,
    source: "product",
    title: product.name,
    content: lines.join("\n"),
    url: `/product/${product.slug}`,
    metadata: {
      slug: product.slug,
      category: product.category,
      brand: product.brand,
      price: product.price,
      mrp: product.mrp,
      in_stock: product.inStock,
      badge: product.badge,
    },
  };
}