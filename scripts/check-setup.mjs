/**
 * Pre-flight check. Reports exactly which setup steps are still outstanding
 * instead of making you guess.
 *
 *   node --env-file=.env.local scripts/check-setup.mjs
 *
 * Exits 0 whenever it can reach Supabase, even if steps remain — a non-zero code
 * would be unhelpful in CI, where this is a report, not a gate.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ok = (m) => console.log("  OK      " + m);
const bad = (m) => console.log("  MISSING " + m);
const warn = (m) => console.log("  WARN    " + m);
const info = (m) => console.log("  ....    " + m);

/** Steps still outstanding, collected so the summary can list them in order. */
const todo = [];

/**
 * PostgREST phrases a missing relation differently depending on version
 * ("does not exist" vs "not found in the schema cache"), so match both.
 */
const isMissingTable = (msg) => /does not exist/i.test(msg) || /schema cache/i.test(msg);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set in .env.local");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ── 1. Connection ──────────────────────────────────────────────────────── */
console.log("\n1. Supabase connection");

const probe = await db.from("users").select("id").limit(1);
if (!probe.error) {
  ok("connected");
} else if (isMissingTable(probe.error.message)) {
  ok("connected - the credentials are valid, there are just no tables yet");
} else {
  bad("cannot reach Supabase: " + probe.error.message);
  await db.removeAllChannels();
  process.exit(1);
}

/* ── 2. Core schema ─────────────────────────────────────────────────────── */
console.log("\n2. Core schema   ->  supabase/schema.sql");

const CORE = [
  "users",
  "products",
  "customer_orders",
  "customer_order_items",
  "favorites",
  "addresses",
];
const missingCore = [];

for (const table of CORE) {
  const { error } = await db.from(table).select("id").limit(1);
  if (!error) ok(table);
  else if (isMissingTable(error.message)) {
    bad(`${table}  - table not created`);
    missingCore.push(table);
  } else bad(`${table}  - ${error.message}`);
}

const coreReady = missingCore.length === 0;
if (!coreReady) todo.push("Apply supabase/schema.sql in the Supabase SQL editor");

/* ── 3. Catalogue ───────────────────────────────────────────────────────── */
console.log("\n3. Catalogue   ->  supabase/seed.sql");
let productCount = 0;

if (coreReady) {
  const res = await db.from("products").select("id", { count: "exact", head: true });
  productCount = res.count ?? 0;

  if (productCount > 0) {
    ok(`${productCount} products loaded`);
    const { data: sample } = await db.from("products").select("name").limit(3);
    for (const p of sample ?? []) info("  " + p.name);
  } else {
    bad("no products");
    todo.push("Load supabase/seed.sql (paste it into the Supabase SQL editor)");
  }
} else {
  info("skipped - core schema not applied yet");
}

/* ── 4. Vector store ────────────────────────────────────────────────────── */
console.log("\n4. Vector store   ->  supabase/rag.sql");
let chunksReady = false;

if (!coreReady) {
  info("skipped - core schema not applied yet");
} else {
  const res = await db.from("knowledge_chunks").select("id", { count: "exact", head: true });
  const chunkCount = res.error ? null : (res.count ?? 0);

  if (chunkCount === null) {
    bad("knowledge_chunks not found - the vector store has not been created");
    todo.push("Apply supabase/rag.sql in the Supabase SQL editor");
  } else if (chunkCount === 0) {
    bad("table exists but is empty - the index has not been built yet");
    todo.push("Build the index: POST /api/knowledge/reindex (needs an admin account)");
  } else {
    ok(`${chunkCount} knowledge chunks embedded and indexed`);
    chunksReady = true;
  }
}

/* ── 5. Hybrid search function ──────────────────────────────────────────── */
console.log("\n5. Hybrid search function (match_knowledge)");

if (!chunksReady) {
  info("skipped - no index yet");
} else {
  // A zero vector is not a useful query, but it proves the function resolves,
  // the pgvector extension is installed and the RPC is callable end to end.
  const { data, error } = await db.rpc("match_knowledge", {
    p_embedding: new Array(384).fill(0),
    p_query: "return policy",
    p_limit: 2,
    p_sources: null,
  });

  if (error) bad("failed: " + error.message);
  else ok(`works end to end (${data.length} rows for a zero-vector probe)`);
}

/* ── 6. Admin account ───────────────────────────────────────────────────── */
console.log("\n6. Admin account");

if (!coreReady) {
  info("skipped - core schema not applied yet");
} else {
  const { data: admins } = await db.from("users").select("email").eq("role", "admin");

  if (admins && admins.length > 0) {
    for (const a of admins) ok("admin: " + a.email);
  } else {
    bad("no admin account exists");
    info("sign up at /signup, then run supabase/admin.sql to promote yourself");
    todo.push("Create an admin: sign up at /signup, then run supabase/admin.sql");
  }

  const { count: users } = await db
    .from("users")
    .select("id", { count: "exact", head: true });
  info(`accounts registered: ${users ?? 0}`);
}

/* ── 7. Groq ────────────────────────────────────────────────────────────── */
console.log("\n7. Groq");

const groqKey = process.env.GROQ_API_KEY;
if (!groqKey) {
  bad("GROQ_API_KEY is not set");
  todo.push("Add GROQ_API_KEY to .env.local");
} else {
  // Read the model list out of the app rather than hardcoding it here, so this
  // check cannot report success while the app would fail (or the reverse).
  const groqSrc = readFileSync(new URL("../lib/rag/groq.ts", import.meta.url), "utf8");
  const block = groqSrc.match(/FALLBACK_MODELS\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const configured = [
    ...(process.env.GROQ_MODEL ? [process.env.GROQ_MODEL.trim()] : []),
    ...[...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
  ];
  const models = [...new Set(configured)];

  info("models configured: " + models.join(", "));

  const usable = [];
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + groqKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 900,
          temperature: 0.2,
          messages: [
            { role: "system", content: "Answer only from the CONTEXT. Be concise." },
            {
              role: "user",
              content:
                "CONTEXT:\n[1] Returns\nUnused, unboxed products can be returned within seven days of delivery.\n\nQuestion: how long do I have to return something?",
            },
          ],
        }),
      });
      const body = await res.json().catch(() => ({}));
      const content = String(body?.choices?.[0]?.message?.content ?? "").trim();

      if (res.ok && content) {
        usable.push(model);
        ok(model + ' - answered: "' + content.replace(/\s+/g, " ").slice(0, 60) + '"');
      } else if (res.ok) {
        // 200 with no text is the classic reasoning-model symptom when the token
        // budget is too small, so flag it instead of passing it.
        warn(model + " - responded but returned no text (token budget too low?)");
      } else if (res.status === 401) {
        bad("GROQ_API_KEY rejected - check it is correct");
        break;
      } else if (res.status === 429) {
        warn(model + " - rate limited (key is valid, just busy)");
      } else {
        info(model + " - unavailable (" + res.status + ")");
      }
    } catch (e) {
      bad("request failed: " + e.message);
      break;
    }
  }

  if (usable.length === 0) {
    // List what they DO have, which is the actual fix.
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: "Bearer " + groqKey },
      });
      const body = await res.json().catch(() => ({ data: [] }));
      const chatty = (body.data ?? [])
        .map((m) => m.id)
        .filter((id) => !/whisper|guard|tts|embedding|orpheus-arabic/i.test(id));

      console.log("\n  Models your key DOES have access to:");
      for (const id of chatty) console.log("    " + id);
      console.log("\n  Put one of those in DEFAULT_MODEL / FALLBACK_MODELS in lib/rag/groq.ts\n");
    } catch {
      /* the list is a nicety, not the point */
    }
  }
}

/* ── Summary ────────────────────────────────────────────────────────────── */
console.log("\n" + "=".repeat(66));
if (todo.length === 0) {
  console.log("Everything is ready. Run `npm run dev` and open the site.");
} else {
  console.log(`Still to do (${todo.length}):\n`);
  todo.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
}
console.log("=".repeat(66));

await db.removeAllChannels();
process.exit(0);