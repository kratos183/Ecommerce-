/**
 * Exercises the real streaming client against Groq, so the SSE parser is verified
 * against actual deltas rather than assumed to work.
 *
 *   node --env-file=.env.local --import tsx scripts/test-stream.mts
 */
import { activeModel, streamChat, isGroqConfigured } from "../lib/rag/groq";

if (!isGroqConfigured()) {
  console.log("GROQ_API_KEY is not set");
  process.exit(0);
}

const messages = [
  {
    role: "system" as const,
    content:
      "You are the Obryn assistant. Answer only from the CONTEXT. Cite with [n]. Be concise.",
  },
  {
    role: "user" as const,
    content:
      'CONTEXT:\n[1] Delivery and shipping\nStandard delivery is 499 rupees, free above 25000 rupees.\n\nQuestion: how much is delivery?',
  },
];

console.log("model:", activeModel());
console.log("streaming...\n");

const started = Date.now();
let text = "";
let chunks = 0;

try {
  for await (const delta of streamChat(messages)) {
    text += delta;
    chunks++;
    if (chunks <= 3) process.stdout.write(delta);
  }
  process.stdout.write("\n");
} catch (error) {
  console.error("STREAM FAILED:", (error as Error).message);
  process.exit(1);
}

const elapsed = Date.now() - started;

console.log(`\n--- result ---`);
console.log(`chunks received : ${chunks}`);
console.log(`total time      : ${elapsed} ms`);
console.log(`first chunk     : ${chunks > 0 ? "yes" : "NO"}`);
console.log(`full answer     : ${text ? "yes" : "NO"}`);
console.log(`citation used   : ${text.includes("[1]") ? "yes" : "no"}`);
console.log(`\nanswer: ${text.replace(/\s+/g, " ")}`);

const pass = chunks > 0 && text.length > 0;
console.log(`\n${pass ? "STREAM OK" : "STREAM BROKEN"}`);
process.exit(pass ? 0 : 1);