/**
 * Verifies the generated catalogue is not just syntactically valid but
 * semantically sane — the class of mistake a SQL syntax check cannot catch.
 */
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec(`
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create role anon; create role authenticated; create role service_role;
`);
await db.exec(readFileSync("supabase/schema.sql", "utf8"));
await db.exec(readFileSync("supabase/seed.sql", "utf8"));

// Derived from the catalogue source, never hardcoded — a hardcoded count
// silently rots the next time a product is added.
const SEED_DATA = readFileSync("scripts/seed-data.mjs", "utf8");
const EXPECTED_PRODUCTS = (SEED_DATA.match(/^\s*\{ name:/gm) || []).length;
const EXPECTED_BRANDS = new Set(
  [...SEED_DATA.matchAll(/brand:\s*"([^"]+)"/g)].map((m) => m[1])
).size;

let failures = 0;
const check = (label, pass, detail = "") => {
  console.log(`  ${pass ? "OK  " : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
  if (!pass) failures++;
};
const one = async (sql) => (await db.query(sql)).rows[0];

console.log("\n1. Shape");
const nProducts = (await one("select count(*)::int n from products")).n;
check(
  `all ${EXPECTED_PRODUCTS} catalogue products loaded`,
  nProducts === EXPECTED_PRODUCTS,
  `got ${nProducts}`
);
check(
  `all ${EXPECTED_BRANDS} brands loaded`,
  (await one("select count(distinct brand)::int n from products")).n === EXPECTED_BRANDS
);
check(
  "every product has 4 images",
  (await one("select count(*)::int n from products where jsonb_array_length(images)=4")).n ===
    nProducts
);
check(
  "image_url is always the first of images",
  (await one(
    "select count(*)::int n from products where image_url <> images->>0"
  )).n === 0
);

// Are the images real photographs, or grey stand-ins?
//
// "Every product has 4 images" passes just as happily with four identical
// placeholders, so it says nothing about whether the storefront looks like
// anything. This counts what came from the resolver.
//
// Deliberately provider-agnostic: the source is Unsplash when
// UNSPLASH_ACCESS_KEY is set and Openverse otherwise, so asserting one specific
// host would fail the moment someone upgrades their image source.
const imageStats = await db.query(`
  select
    count(*)::int as slots,
    count(*) filter (where img like 'https://placehold.co/%')::int as stand_ins,
    count(*) filter (where img not like 'http%')::int as not_a_url
  from products p, lateral jsonb_array_elements_text(p.images) img
`);

const img = imageStats.rows[0];
const realSlots = img.slots - img.stand_ins;
const realPct = Math.round((realSlots / img.slots) * 100);

check(
  "every image slot is an absolute URL",
  img.not_a_url === 0,
  `${img.not_a_url} relative`
);
check(
  "at least 85% of image slots are real photographs",
  realSlots / img.slots >= 0.85,
  `${realSlots}/${img.slots} photographs (${realPct}%), ${img.stand_ins} stand-ins`
);

/*
  Every remote host must appear in next.config.ts remotePatterns, or next/image
  rejects the URL at request time and renders a broken image. That failure is
  invisible until someone loads the page, so it is asserted here instead.
*/
const nextConfig = readFileSync("next.config.ts", "utf8");
const hosts = await db.query(`
  select distinct substring(img from '^https?://([^/]+)') as host
    from products p, lateral jsonb_array_elements_text(p.images) img
   where img not like 'https://placehold.co/%'
`);
const missingHosts = hosts.rows
  .map((r) => r.host)
  .filter((h) => !nextConfig.includes(`"${h}"`));
check(
  "every image host is allowed in next.config.ts remotePatterns",
  missingHosts.length === 0,
  missingHosts.length
    ? "missing: " + missingHosts.join(", ")
    : `${hosts.rows.length} host(s) allowed`
);

const fullyReal = await db.query(`
  select count(*)::int as n
    from products p
   where not exists (
     select 1 from lateral jsonb_array_elements_text(p.images) img
      where img like 'https://placehold.co/%'
   )
`);
check(
  "products with no stand-in at all",
  fullyReal.rows[0].n >= Math.ceil(nProducts * 0.7),
  `${fullyReal.rows[0].n}/${nProducts} fully real`
);

// A gallery repeating one photo four times looks like a bug, not a gallery.
const dupes = await db.query(`
  select count(*)::int as n from products p
   where (select count(distinct img) from lateral jsonb_array_elements_text(p.images) img) < 4
`);
check(
  "galleries do not repeat the same photo 4x",
  dupes.rows[0].n === 0,
  `${dupes.rows[0].n} products repeat`
);

/*
  A measured record of how many images actually depict the product they sit on.

  This is informational, not a pass/fail gate — Wikimedia Commons cannot supply
  model-accurate photographs for most of this catalogue, and until someone
  replaces them the storefront looks plausible while showing the wrong product.
  It is here so the number is visible and trends, rather than being rediscovered
  when a customer complains. See the "PRODUCT IMAGES" header in seed.sql.
*/
const provenance = await db.query(`
  select
    count(*) filter (where img like 'https://placehold.co/%')::int as stand_ins,
    count(*)::int as slots
  from products p, lateral jsonb_array_elements_text(p.images) img
`);

console.log(
  `\n   provenance: ${provenance.rows[0].slots - provenance.rows[0].stand_ins}` +
    `/${provenance.rows[0].slots} slots are live photographs, ` +
    `${provenance.rows[0].stand_ins} are labelled stand-ins.`
);
console.log(
  "   note: these are category photographs, not pictures of each specific\n" +
    "   product. Replace them from Admin Dashboard -> Products when you have\n" +
    "   real photography. See the PRODUCT IMAGES header in seed.sql."
);
check(
  "every product has >=6 specs",
  (await one(
    "select count(*)::int n from products where jsonb_array_length(jsonb_path_query_array(specifications,'$.keyvalue()')) >= 6"
  )).n === nProducts
);
check(
  "no dangling bundle_slugs",
  (await one(`
    select count(*)::int n from products p,
      lateral jsonb_array_elements_text(p.bundle_slugs) s(slug)
    where not exists (select 1 from products t where t.slug = s.slug)`)).n === 0
);
check(
  "price > 0 everywhere (0 would block checkout)",
  (await one("select count(*)::int n from products where price <= 0")).n === 0
);
check(
  "mrp >= price everywhere",
  (await one("select count(*)::int n from products where mrp < price")).n === 0
);
check(
  "slugs unique",
  (await one("select count(*)::int n from (select slug from products group by slug having count(*)>1) x")).n === 0
);

console.log("\n2. The spec bug that shipped earlier");
const phones = await db.query(
  "select name, specifications->>'Display' as display from products where category='Phone' order by name limit 8"
);
for (const p of phones.rows) {
  const size = parseFloat(String(p.display).match(/([\d.]+)/)?.[1] ?? "0");
  check(
    `"${p.name}" screen is a phone size`,
    size >= 5 && size <= 7.5,
    String(p.display)
  );
}

// Sizes only count when written as one (86-inch / 75"), which is exactly why
// the extractor requires the mark — otherwise "iPhone 15" becomes a 15-inch
// phone. Assert on a product that actually states its size.
const board = await one(
  `select name, specifications->>'Panel' as panel from products
    where category = 'Digital Board' and name like '%86"%' limit 1`
);
check(
  'interactive panel size read from the inch mark',
  /\b86-inch/.test(board?.panel ?? ""),
  board?.panel ?? "(no matching product)"
);

// Laptop names use "15", not "15.6\"", so these must come from the fallback.
const laptops = await db.query(
  "select name, specifications->>'Display' as d from products where category='Laptop' limit 6"
);
for (const l of laptops.rows) {
  const size = parseFloat(String(l.d).match(/([\d.]+)/)?.[1] ?? "0");
  check(
    `laptop "${l.name}" has a plausible screen size`,
    size >= 12 && size <= 16,
    String(l.d)
  );
}

console.log("\n3. Slugs");
const slugs = await db.query("select slug from products limit 6");
check(
  "no brand duplicated in a slug",
  !slugs.rows.some((r) => {
    const parts = r.slug.split("-");
    const first = parts[0];
    return parts[1] === first;
  }),
  slugs.rows.map((r) => r.slug).slice(0, 3).join(", ")
);

console.log("\n4. Every navbar brand is represented");
const source = readFileSync("lib/catalog.ts", "utf8");
const gridBlock = source.slice(source.indexOf("BRAND_GRID"), source.indexOf("REFURBISHED_CATEGORIES"));

// Only the ARRAY VALUES are brand names. Reading every quoted string would pick
// up the object keys too — "Digital Board", "Tablet / iPad" — which are
// categories, and would report them as missing brands.
const navBrands = new Set();
for (const m of gridBlock.matchAll(/^\s{2}"?([^"]+?)"?:\s*\[([\s\S]*?)\],?$/gm)) {
  for (const b of m[2].matchAll(/"([^"]+)"/g)) navBrands.add(b[1]);
}
const seeded = new Set((await db.query("select distinct brand from products")).rows.map((r) => r.brand));
const missing = [...navBrands].filter((b) => !seeded.has(b));
check(
  "all navbar brands appear in the catalogue",
  missing.length === 0,
  missing.length ? "missing: " + missing.join(", ") : `${navBrands.size} brands covered`
);

// The navbar filters with ?brand=..., and PostgREST .eq() is case-sensitive, so
// "SONY" stock would silently return nothing for the "Sony" filter.
const wrongCase = [...seeded].filter(
  (s) => !navBrands.has(s) && [...navBrands].some((b) => b.toLowerCase() === s.toLowerCase())
);
check(
  "brand casing matches the navbar exactly",
  wrongCase.length === 0,
  wrongCase.length ? "wrong case: " + wrongCase.join(", ") : "no case mismatches"
);

console.log("\n5. Category coverage");
const cats = await db.query(
  "select category, count(*)::int n from products group by category order by n asc"
);
check(
  "every category has 4+ products",
  cats.rows.every((c) => c.n >= 4),
  cats.rows.map((c) => `${c.category}=${c.n}`).join(" ")
);

console.log("\n6. DELETE-then-insert really replaces");
await db.exec("insert into products (name, slug, category, brand, price) values ('Ghost', 'ghost-1', 'Phone', 'Samsung', 999)");
const withGhost = (await one("select count(*)::int n from products")).n;
await db.exec(readFileSync("supabase/seed.sql", "utf8"));
const afterRerun = (await one("select count(*)::int n from products")).n;
check(
  "re-running removes products added since",
  afterRerun === nProducts && withGhost === nProducts + 1,
  `${withGhost} -> ${afterRerun} (expected ${nProducts})`
);

console.log(`\n${failures === 0 ? "CATALOGUE OK" : failures + " FAILED"}`);
await db.close();
process.exit(failures === 0 ? 0 : 1);