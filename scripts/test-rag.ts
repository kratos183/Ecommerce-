/**
 * Sanity checks for the RAG pieces that do not need a database or an API key.
 * Run with: npx tsx scripts/test-rag.ts
 *
 * This is a scratch harness, not a test suite — it prints and asserts the things
 * that are easy to get quietly wrong: chunk boundaries, citation numbering, the
 * personal brief, and that the prompt actually contains the grounding rules.
 */

import { splitText, chunkDocument, chunkProduct } from "../lib/rag/chunk";
import { embed } from "../lib/rag/embeddings";
import { buildSystemPrompt, toCitations, type PromptInput } from "../lib/rag/prompt";
import { renderPersonalBrief, type PersonalBrief } from "../lib/rag/personal-brief";
import { KNOWLEDGE_DOCUMENTS } from "../lib/rag/documents";
import type { RetrievedChunk } from "../lib/rag/retrieve";
import { toProduct } from "../lib/product-shape";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

/* ── 1. Chunking ─────────────────────────────────────────────────────────── */
console.log("\n── chunking ──");

const short = "One. Two. Three.";
check("short text is one chunk", splitText(short).length === 1);

const long = Array.from({ length: 200 }, (_, i) => `Sentence number ${i}.`).join(" ");
const pieces = splitText(long, 400);
check(
  "long text respects the max",
  pieces.every((p) => p.length <= 400 || !p.includes("Sentence number 199")),
  `max=${Math.max(...pieces.map((p) => p.length))}`
);
check("long text produces several chunks", pieces.length > 3, `${pieces.length} chunks`);
// The next chunk must CONTAIN the previous chunk's tail — it starts earlier, so
// this is an `includes` check, not `startsWith`.
check(
  "consecutive chunks overlap",
  pieces.slice(1).every((piece, i) => piece.includes(pieces[i].slice(-40)))
);

const docChunks = KNOWLEDGE_DOCUMENTS.flatMap(chunkDocument);
check("every document produced chunks", docChunks.length >= KNOWLEDGE_DOCUMENTS.length);
check(
  "doc ids are preserved",
  docChunks.every((c) => c.docId.length > 0)
);

const productChunk = chunkProduct(
  toProduct({
    id: 1,
    name: "Obryn Apex 86\"",
    slug: "apex",
    category: "Digital Board",
    price: 285000,
    mrp: 380000,
    description_intro: "A big 4K panel.",
    specifications: { size: '86"' },
  })
);
check("product chunk includes price", productChunk.content.includes("₹2,85,000"));
check("product chunk includes the was-price", productChunk.content.includes("₹3,80,000"));
check("product chunk includes specs", productChunk.content.includes('size: 86"'));
check("product chunk has a url", productChunk.url === "/product/apex", productChunk.url);

/* ── 2. Prompt assembly ──────────────────────────────────────────────────── */
console.log("\n── prompt ──");

const chunks: RetrievedChunk[] = [
  {
    id: 1,
    docId: "policy-returns",
    source: "policy",
    title: "Returns and refunds",
    content: "Unused, unboxed products can be returned within seven days.",
    url: "/#support",
    metadata: {},
    score: 0.03,
    vectorScore: 0.82,
    keywordScore: 1.2,
  },
];

const personal: PersonalBrief = {
  hasOrders: true,
  orders: [
    {
      orderNo: "OB-ABC123",
      date: "18 Apr 2026",
      status: "delivered",
      total: 289697,
      items: ["Obryn Apex 86\" (x1)"],
    },
  ],
  wishlist: [{ name: "Obryn Buds Air Pro ANC", slug: "buds", price: 4999 }],
  addresses: ["Home — Dhanbad, Jharkhand"],
  stats: { totalOrders: 1, activeOrders: 0, lifetimeValue: 289697 },
};

const input: PromptInput = {
  customerName: "Priya Nair",
  question: "what did I buy?",
  chunks,
  personal,
  history: [],
  degraded: false,
};

const prompt = buildSystemPrompt(input);
check("prompt has the grounding rule", prompt.includes("Answer only from the CONTEXT"));
check("prompt forbids inventing prices", /never invent/i.test(prompt));
check("prompt names the customer", prompt.includes("Priya Nair"));
check("prompt contains the order number", prompt.includes("OB-ABC123"));
check("prompt contains the order item", prompt.includes('Obryn Apex 86'));
check("prompt contains the wishlist", prompt.includes("Obryn Buds Air Pro ANC"));
check("prompt contains retrieved context", prompt.includes("[1] Returns and refunds"));
check("prompt does NOT leak the system message into history", !prompt.includes("customer service assistant for **Obryn**\n\n## The one rule"));

const degradedPrompt = buildSystemPrompt({ ...input, degraded: true, chunks: [] });
check("degraded prompt warns the model", degradedPrompt.includes("Retrieval was degraded"));
check("empty context is stated plainly", degradedPrompt.includes("No reference material"));

const noPersonal = buildSystemPrompt({ ...input, personal: null });
check("no personal section when signed out", !noPersonal.includes("OB-ABC123"));

/* ── 3. Citations ────────────────────────────────────────────────────────── */
console.log("\n── citations ──");
const citations = toCitations(chunks);
check("citations are 1-indexed", citations[0].ref === 1);
check("citation has a url", citations[0].url === "/#support");
check("relevance is a percentage", citations[0].relevance === 82, `${citations[0].relevance}`);

/* ── 4. Personal brief ───────────────────────────────────────────────────── */
console.log("\n── personal brief ──");
const rendered = renderPersonalBrief(personal);
check("brief includes lifetime spend", rendered.includes("2,89,697"));
check("brief includes the order", rendered.includes("OB-ABC123"));

/* ── 5. Embeddings ───────────────────────────────────────────────────────── */
async function testEmbeddings() {
  console.log("\n── embeddings (loads the model, ~5s) ──");

  const vectors = await embed([
    "cheap tv for a school classroom",
    "55 inch 4K commercial signage display for schools",
    "wireless earbuds with noise cancellation",
    "interactive display for classrooms",
  ]);

  check("returned one vector per input", vectors.length === 4);
  check("vectors are 384-dimensional", vectors.every((v) => v.length === 384));

  const cos = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
  const relevant = cos(vectors[0], vectors[1]);
  const irrelevant = cos(vectors[0], vectors[2]);
  check(
    "ranks the relevant document above the irrelevant one",
    relevant > irrelevant + 0.1,
    `relevant=${relevant.toFixed(3)} irrelevant=${irrelevant.toFixed(3)}`
  );
  check(
    "vectors are L2-normalised",
    Math.abs(Math.sqrt(vectors[0].reduce((s, v) => s + v * v, 0)) - 1) < 0.01
  );
}

/* ── Run ─────────────────────────────────────────────────────────────────── */
async function main() {
  await testEmbeddings();
  console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nHARNESS ERROR:", error);
  process.exit(1);
});