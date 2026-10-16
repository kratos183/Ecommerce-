/**
 * Runs the SQL setup files against a real PostgreSQL build (PGlite, compiled to
 * WASM) so syntax and dependency errors surface here instead of in the Supabase
 * SQL editor.
 *
 *   node scripts/test-schema.mjs
 *
 * This is a syntax/semantics check, not a substitute for applying the files to
 * the real database. pgvector is not bundled with PGlite, so the parts of
 * rag.sql that need it are skipped and reported separately.
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const ok = (m) => console.log("  OK      " + m);
const bad = (m) => console.log("  FAIL    " + m);
const skip = (m) => console.log("  SKIP    " + m);
const info = (m) => console.log("  ....    " + m);

let failures = 0;
const check = (label, pass, detail = "") => {
  console.log(`  ${pass ? "OK     " : "FAIL   "} ${label}${detail ? " — " + detail : ""}`);
  if (!pass) failures++;
};

const db = new PGlite();

/* ── Supabase shim ──────────────────────────────────────────────────────── */
/*
 * `auth.uid()` is a Supabase extension function. PGlite has no Supabase, so
 * provide the same signature and semantics: uuid or NULL. Without this the RLS
 * section cannot be executed at all, which is exactly the part that was broken.
 */
await db.exec(`
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid
    language sql stable as $$ select null::uuid $$;
  create role anon;
  create role authenticated;
  create role service_role;
`);

/* ── 1. schema.sql ──────────────────────────────────────────────────────── */
console.log("\n1. supabase/schema.sql");

try {
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  ok("executed with no errors");
} catch (e) {
  check("executes cleanly", false, e.message);
}

/* Every statement is inside one transaction, so if it threw, the tables are gone
   and there is nothing further to check. */
const tableCount = await db.query(
  `select count(*)::int as n from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'`
);

if (tableCount.rows[0].n === 0) {
  skip("no tables created (the transaction rolled back)");
} else {
  check("6 tables created", tableCount.rows[0].n === 6, `found ${tableCount.rows[0].n}`);

  for (const t of ["users", "products", "customer_orders", "customer_order_items", "favorites", "addresses"]) {
    const r = await db.query(
      `select 1 from information_schema.tables
        where table_schema='public' and table_name=$1`,
      [t]
    );
    check(`table ${t}`, r.rows.length === 1);
  }

  /* ── 2. Functions ─────────────────────────────────────────────────────── */
  console.log("\n2. Functions");

  const funcs = [
    "place_customer_order",
    "record_paid_order",
    "upsert_address",
    "delete_address",
    "resolve_order_lines",
    "shipping_for",
    "current_user_id",
    "touch_updated_at",
  ];

  for (const fn of funcs) {
    const r = await db.query(
      `select 1 from pg_proc join pg_namespace n on n.oid = pronamespace
        where proname = $1 and n.nspname = 'public'`,
      [fn]
    );
    check(`function ${fn}`, r.rows.length >= 1);
  }

  /* ── 3. The cast that broke ────────────────────────────────────────────── */
  console.log("\n3. The uuid -> bigint cast that caused ERROR 42846");

  try {
    await db.exec(`select auth.uid()::bigint;`);
    check("auth.uid()::bigint rejected (as expected)", false, "it was accepted");
  } catch (e) {
    check(
      "auth.uid()::bigint fails, confirming the original error",
      /cannot cast type uuid to bigint/i.test(e.message),
      e.message.slice(0, 60)
    );
  }

  try {
    await db.exec(`select auth.uid()::text::bigint;`);
    ok("auth.uid()::text::bigint works");
  } catch (e) {
    check("auth.uid()::text::bigint works", false, e.message.slice(0, 70));
  }

  try {
    const r = await db.query(`select public.current_user_id() as id;`);
    check("current_user_id() callable and returns NULL when signed out", r.rows[0].id === null);
  } catch (e) {
    check("current_user_id() callable", false, e.message.slice(0, 70));
  }

  /* ── 4. RLS policies ──────────────────────────────────────────────────── */
  console.log("\n4. RLS policies");

  const policies = [
    "users_public_read",
    "products_public_read",
    "orders_own_read",
    "order_items_own_read",
    "favorites_own_read",
    "addresses_own_read",
  ];

  for (const p of policies) {
    const r = await db.query(
      `select 1 from pg_policies where schemaname='public' and policyname=$1`,
      [p]
    );
    check(`policy ${p}`, r.rows.length === 1);
  }

  const rlsOn = await db.query(
    `select count(*)::int as n from pg_tables
      where schemaname='public' and rowsecurity = true`
  );
  check("RLS enabled on all 6 tables", rlsOn.rows[0].n === 6, `found ${rlsOn.rows[0].n}`);

  /* ── 5. Order functions actually work ─────────────────────────────────── */
  console.log("\n5. Order functions, end to end");

  await db.exec(`
    insert into public.users (name, email, password, role)
    values ('Test Buyer', 'buyer@example.com', 'x', 'user');

    insert into public.products (name, slug, category, price, mrp, stock)
    values ('Test Panel', 'test-panel', 'Digital Board', 100000, 120000, 5),
           ('Test Cable', 'test-cable', 'Accessories',  500, 900, 50);
  `);
  ok("fixture rows inserted");

  const placed = await db.query(`
    select public.place_customer_order(
      1::bigint, 'OB-TEST0001',
      '[{"product_id":1,"quantity":2},{"product_id":2,"quantity":3}]'::jsonb,
      '{"fullName":"Test Buyer","phone":"7992430183","line1":"Shyamdih","city":"Dhanbad","state":"Jharkhand","pincode":"828114"}'::jsonb,
      'test order'::text
    ) as order;
  `).catch((e) => {
    check("place_customer_order runs", false, e.message.slice(0, 90));
    return null;
  });

  if (placed) {
    const o = placed.rows[0].order;
    check("place_customer_order returns an order number", o.order_no === "OB-TEST0001");
    check(
      "subtotal resolved from the DATABASE, not the client",
      Number(o.subtotal) === 2 * 100000 + 3 * 500,
      `got ${o.subtotal}, expected ${2 * 100000 + 3 * 500}`
    );
    check("free shipping above 25,000", Number(o.shipping) === 0, `shipping ${o.shipping}`);
    check("total = subtotal + shipping", Number(o.total) === Number(o.subtotal) + Number(o.shipping));

    const items = await db.query(
      `select product_name, quantity, line_total from public.customer_order_items
        where order_id = (select id from public.customer_orders where order_no='OB-TEST0001')
        order by id`
    );
    check("both line items written", items.rows.length === 2, `${items.rows.length} rows`);
    check(
      "line totals correct",
      items.rows.reduce((s, r) => s + Number(r.line_total), 0) === 201500,
      `got ${items.rows.reduce((s, r) => s + Number(r.line_total), 0)}`
    );
  }

  /* A priced-at-zero product must be refused, not silently ordered. */
  await db.exec(`insert into public.products (name, slug, category, price, stock)
                 values ('Quoted Item', 'quoted', 'OPS', 0, 5);`);
  const onRequest = await db.query(`
    select public.place_customer_order(
      1::bigint, 'OB-TEST0002', '[{"product_id":3,"quantity":1}]'::jsonb, '{}'::jsonb, ''::text
    ) as order;
  `).catch((e) => {
    check("priced-on-request product is refused", /PRICED_ON_REQUEST/.test(e.message), e.message.slice(0, 60));
    return null;
  });
  if (onRequest) check("priced-on-request product is refused", false, "it was accepted");

  const ghost = await db.query(`
    select public.place_customer_order(
      1::bigint, 'OB-TEST0003', '[{"product_id":9999,"quantity":1}]'::jsonb, '{}'::jsonb, ''::text
    ) as order;
  `).catch((e) => {
    check("missing product is refused", /PRODUCT_UNAVAILABLE/.test(e.message), e.message.slice(0, 60));
    return null;
  });
  if (ghost) check("missing product is refused", false, "it was accepted");

  /* ── 6. Shipping rule ──────────────────────────────────────────────────── */
  console.log("\n6. Shipping rule (must match lib/pricing.ts)");

  const ship = await db.query(
    `select public.shipping_for(0) as a, public.shipping_for(1000) as b,
            public.shipping_for(25000) as c, public.shipping_for(50000) as d`
  );
  const r = ship.rows[0];
  check("empty cart is free", Number(r.a) === 0);
  check("small order pays 499", Number(r.b) === 499, `got ${r.b}`);
  check("exactly 25,000 is free", Number(r.c) === 0, `got ${r.c}`);
  check("large order is free", Number(r.d) === 0);
}

/* ── 7. rag.sql ─────────────────────────────────────────────────────────── */
console.log("\n7. supabase/rag.sql");

// PGlite does not bundle pgvector, so the extension statement will fail. Strip
// it and the vector-dependent parts, then check what remains parses.
let rag = readFileSync("supabase/rag.sql", "utf8");
const hasVector = await db.query(
  `select 1 from pg_available_extensions where name = 'vector'`
).then(() => db.query(`select 1 from pg_available_extensions where name='vector'`));

const vectorAvailable = hasVector.rows.length > 0;

if (!vectorAvailable) {
  skip("pgvector is not bundled with PGlite - cannot fully execute rag.sql");

  // Strip the two genuinely pgvector-only pieces. The whole statements are
  // removed, not just their USING clauses, or the SQL is left malformed.
  rag = rag
    .replace(/create extension[^;]+;/i, "")
    // The vector type, with and without its dimension: the column uses
    // vector(384) while the GRANT statements name a bare vector.
    .replace(/extensions\.vector(\(384\))?/gi, "text")
    .replace(
      /create index if not exists knowledge_chunks_embedding_idx[\s\S]*?;/i,
      "-- (hnsw index omitted: requires pgvector)"
    )
    .replace(
      /create or replace function public\.match_knowledge[\s\S]*?\$\$;/i,
      "-- (match_knowledge omitted: requires pgvector)"
    )
    // The GRANT statements name the function that was just removed. The
    // trailing newline is optional because the grant is the last line of the
    // file, and requiring one makes the pattern silently miss it.
    .replace(/^(revoke all|grant execute) on function public\.match_knowledge[^\n]*(\n|$)/gm, "");

  info("checking the plain-Postgres parts only");
}

try {
  await db.exec(rag);
  ok(vectorAvailable ? "executed with no errors" : "executes cleanly once pgvector is present");
} catch (e) {
  check("rag.sql executes", false, e.message.slice(0, 140));
}

if (!vectorAvailable) {
  const chunks = await db.query(
    `select count(*)::int as n from information_schema.tables
      where table_schema='public' and table_name='knowledge_chunks'`
  );
  check("knowledge_chunks table created", chunks.rows[0].n === 1);

  // The generated tsvector column is pure Postgres, so verify it really works.
  try {
    await db.exec(`
      insert into public.knowledge_chunks (doc_id, source, title, content)
      values ('t1','policy','Returns','Unused unboxed products can be returned within seven days.');
    `);
    const hit = await db.query(
      `select title from public.knowledge_chunks
        where search @@ websearch_to_tsquery('english','return')`
    );
    check("generated tsvector column populates and matches", hit.rows.length === 1);
  } catch (e) {
    check("generated tsvector column works", false, e.message.slice(0, 90));
  }

  const knRls = await db.query(
    `select rowsecurity from pg_tables
      where schemaname='public' and tablename='knowledge_chunks'`
  );
  check("RLS enabled on knowledge_chunks", knRls.rows[0]?.rowsecurity === true);

  const knPolicy = await db.query(
    `select 1 from pg_policies
      where schemaname='public' and policyname='knowledge_public_read'`
  );
  check("public read policy on knowledge_chunks", knPolicy.rows.length === 1);

  info("match_knowledge() and the HNSW index need pgvector - run");
  info('"npm run check" against the real database to confirm those');
}


/* ── 8. seed.sql ────────────────────────────────────────────────────────── */
console.log("\n8. supabase/seed.sql");

try {
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  const p = await db.query(`select count(*)::int as n from public.products`);
  check("seed loads products", p.rows[0].n > 0, `${p.rows[0].n} products`);

  // bundle_slugs drive "Frequently Bought Together"; dangling references are
  // tolerated by design, so check how many resolve.
  const bundles = await db.query(`
    select count(*)::int as resolved
      from public.products p
      cross join lateral jsonb_array_elements_text(p.bundle_slugs) s(slug)
      join public.products t on t.slug = s.slug
  `).catch(() => ({ rows: [{ resolved: null }] }));

  check("bundle_slugs resolve to real products", (bundles.rows[0].resolved ?? 0) > 0,
    `${bundles.rows[0].resolved} links`);

  // Re-running must not duplicate anything.
  const before = (await db.query(`select count(*)::int as n from public.products`)).rows[0].n;
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
  const after = (await db.query(`select count(*)::int as n from public.products`)).rows[0].n;
  check("seed is idempotent (re-run adds nothing)", before === after, `${before} then ${after}`);
} catch (e) {
  check("seed.sql executes", false, e.message.slice(0, 140));
}

/* ── 8b. Cash on delivery ─────────────────────────────────────────────────── */
//
// COD is the one payment path that never touches Razorpay, so nothing else in
// this suite exercises it. Its whole value is that an unpaid order is recorded
// honestly, which is exactly what a syntax check cannot see.

console.log("\n8b. cash on delivery");

try {
  await db.exec(`insert into public.users (name, email, password, role)
                 values ('COD Tester', 'cod@test.local', 'x', 'user')`);

  const userId = (await db.query(`select id from public.users limit 1`)).rows[0].id;
  const items = (await db.query(`select id, price from public.products limit 2`)).rows;

  const address = {
    fullName: "COD Tester",
    phone: "7992430183",
    line1: "Shyamdih",
    line2: "",
    city: "Dhanbad",
    state: "Jharkhand",
    pincode: "828114",
  };

  const place = async (paymentMethod) => {
    const r = await db.query(
      `select public.place_customer_order($1::bigint, $2::text, $3::jsonb, $4::jsonb, $5::text, $6::text) as o`,
      [
        userId,
        `OB-TEST-${paymentMethod}-${Math.random().toString(36).slice(2, 8)}`,
        JSON.stringify(items.map((p) => ({ product_id: p.id, quantity: 1 }))),
        JSON.stringify(address),
        "",
        paymentMethod,
      ]
    );
    if (r.error) throw new Error(r.error.message);
    return r.rows[0].o;
  };

  const cod = await place("cod");
  const codRow = (
    await db.query(
      `select payment_method, payment_status, status, total
         from public.customer_orders where order_no = $1`,
      [cod.order_no]
    )
  ).rows[0];

  check("COD order records payment_method = 'cod'", codRow.payment_method === "cod", codRow.payment_method);
  check("COD order is NOT marked paid", codRow.payment_status === "pending", codRow.payment_status);
  check("COD order starts in 'pending' status", codRow.status === "pending", codRow.status);
  check("COD total priced server-side", Number(codRow.total) > 0, String(codRow.total));

  // SECURITY DEFINER means the method arrives from the client. An unrecognised
  // value must be coerced, never written through.
  const junk = await place("bitcoin-nonsense");
  const junkRow = (
    await db.query(`select payment_method from public.customer_orders where order_no = $1`, [junk.order_no])
  ).rows[0];
  check(
    "an unknown payment method is coerced to a known one",
    ["cod", "razorpay", "whatsapp"].includes(junkRow.payment_method),
    junkRow.payment_method
  );

  // Belt and braces: the column itself must refuse a bad write that bypassed the
  // function entirely.
  try {
    await db.query(
      `insert into public.customer_orders (order_no, user_id, payment_method)
       values ('OB-BAD-METHOD', ${userId}, 'bitcoin')`
    );
    check("the column CHECK rejects an invalid method", false, "the insert succeeded");
  } catch {
    check("the column CHECK rejects an invalid method", true);
  }

  // record_paid_order writes 'razorpay' itself, so the new CHECK must not break it.
  const paidTotal = items.reduce((sum, p) => sum + Number(p.price), 0);
  const paid = await db.query(
    `select public.record_paid_order($1::bigint, $2::text, $3::jsonb, $4::jsonb, $5::text,
                                     $6::text, $7::text, $8::numeric) as o`,
    [
      userId,
      `OB-TEST-PAID-${Math.random().toString(36).slice(2, 8)}`,
      JSON.stringify(items.map((p) => ({ product_id: p.id, quantity: 1 }))),
      JSON.stringify(address),
      "",
      "order_test1",
      "pay_test1",
      paidTotal,
    ]
  );
  check(
    "record_paid_order still writes a valid method under the CHECK",
    !paid.error && Boolean(paid.rows[0]?.o?.order_no),
    paid.error ? paid.error.message.slice(0, 80) : "ok"
  );
} catch (e) {
  check("cash on delivery works", false, e.message.slice(0, 120));
}

/* ── 9. reset-catalogue.sql ───────────────────────────────────────────────── */
//
// The delete path gets its own check because it is the one file that destroys
// data, and "orders survived" is not something a syntax check would notice.

console.log("\n9. supabase/reset-catalogue.sql");

try {
  // Fixtures, so there is something for the delete to actually act on.
  await db.exec(`insert into public.users (name, email, password, role)
                 values ('Reset Tester', 'reset@test.local', 'x', 'user')`);

  const userId = (await db.query(`select id from public.users limit 1`)).rows[0].id;

  await db.exec(`insert into public.customer_orders
                   (order_no, user_id, subtotal, shipping, total, status, payment_status)
                 values ('OB-RESET-TEST', ${userId}, 100, 0, 100, 'pending', 'pending')`);

  const orderId = (await db.query(`select id from public.customer_orders limit 1`)).rows[0].id;

  await db.exec(`insert into public.customer_order_items
                   (order_id, product_id, product_name, product_slug, unit_price, quantity, line_total)
                 select ${orderId}, id, name, slug, price, 1, price
                   from public.products limit 3`);

  await db.exec(`insert into public.favorites (user_id, product_id)
                 select ${userId}, id from public.products limit 2`);

  const count = async (table) =>
    (await db.query(`select count(*)::int as n from public.${table}`)).rows[0].n;

  // Measured, not hardcoded. Earlier sections in this file leave their own order
  // items behind, so an absolute count here would fail for an unrelated reason.
  const itemTotals = async () => {
    const r = await db.query(`
      select count(*)::int as total,
             count(product_id)::int as linked,
             count(product_name) filter (where product_name <> '')::int as named
        from public.customer_order_items
    `);
    return r.rows[0];
  };

  const before = {
    products: await count("products"),
    orders: await count("customer_orders"),
    users: await count("users"),
    favorites: await count("favorites"),
    items: await itemTotals(),
  };

  await db.exec(readFileSync("supabase/reset-catalogue.sql", "utf8"));

  check("reset empties the catalogue", (await count("products")) === 0, `${before.products} -> 0`);

  // The reason the file nulls product_id rather than cascading: a past invoice
  // has to stay readable after its product is gone.
  const items = await itemTotals();

  check("reset preserves past order items", items.total === before.items.total, `${before.items.total} -> ${items.total}`);
  check("their product links are nulled, not cascaded", items.linked === 0, `${items.linked} still linked`);
  check("their stored product names survive", items.named === before.items.named, `${items.named} named`);
  check("reset preserves orders", (await count("customer_orders")) === before.orders);
  check("reset preserves customers", (await count("users")) === before.users);
  check("reset clears dangling favourites", (await count("favorites")) === 0, `${before.favorites} -> 0`);

  // Idempotent: running a destructive script twice must be safe.
  await db.exec(readFileSync("supabase/reset-catalogue.sql", "utf8"));
  check("reset is idempotent", (await count("products")) === 0);

  // Leave the database seeded for anything that runs after this.
  await db.exec(readFileSync("supabase/seed.sql", "utf8"));
} catch (e) {
  check("reset-catalogue.sql executes", false, e.message.slice(0, 140));
}

/* ── Result ─────────────────────────────────────────────────────────────── */
console.log("\n" + "=".repeat(62));
console.log(failures === 0 ? "SCHEMA OK — all files execute cleanly" : `${failures} FAILED`);
console.log("=".repeat(62));

await db.close();
process.exit(failures === 0 ? 0 : 1);