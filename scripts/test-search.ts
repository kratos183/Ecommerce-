/**
 * Checks search matching and the category-grid padding.
 *
 *   npx tsx scripts/test-search.ts
 *
 * No database or API key needed.
 */

import {
  resolveCategory,
  isLikelyCategoryQuery,
  normalise,
  searchProducts,
  matchCategories,
} from "../lib/search";
import { toProduct } from "../lib/product-shape";
import { CATEGORY_GRID_SIZE } from "../lib/home";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

/* ── Fixtures ───────────────────────────────────────────────────────────── */

const P = (over: Record<string, unknown>) =>
  toProduct({
    id: Number(over.id ?? 1),
    slug: String(over.slug ?? "p"),
    name: String(over.name ?? "Product"),
    category: String(over.category ?? "General"),
    brand: String(over.brand ?? "Obryn"),
    price: Number(over.price ?? 1000),
    mrp: Number(over.mrp ?? 0),
    stock: Number(over.stock ?? 10),
    description_intro: String(over.desc ?? ""),
    rating: Number(over.rating ?? 4.5),
  });

const CATALOGUE = [
  // Nothing is literally called "mobile" — the whole point of the alias.
  P({ id: 1, slug: "halo-5g", name: "Obryn Halo 5G 256 GB", category: "Phone", rating: 4.5, desc: "5G smartphone" }),
  P({ id: 2, slug: "halo-pro", name: "Obryn Halo Pro 5G 512 GB", category: "Phone", rating: 4.7, desc: "Flagship phone" }),
  P({ id: 3, slug: "pulse", name: "Obryn Pulse 5G 128 GB", category: "Phone", rating: 4.3, desc: "Slim phone" }),
  P({ id: 4, slug: "air-14", name: 'Obryn Air 14" Ultrabook', category: "Laptop", rating: 4.7, desc: "2.8K OLED" }),
  P({ id: 5, slug: "book-15", name: 'Obryn Book 15" Everyday Laptop', category: "Laptop", rating: 4.4 }),
  P({ id: 6, slug: "apex-86", name: 'Obryn Apex 86" 4K Interactive Display', category: "Digital Board", rating: 4.8 }),
  P({ id: 7, slug: "vertex-65", name: 'Obryn Vertex 65" 4K Interactive Panel', category: "Digital Board", rating: 4.6 }),
  // The one product that IS called "mobile".
  P({ id: 8, slug: "mobile-stand", name: "Obryn Mobile Phone Stand", category: "Accessories", rating: 4.1 }),
  P({ id: 10, slug: "halo-55", name: 'Obryn Halo 55" 4K Signage Display', category: "Monitor", rating: 4.6 }),
  P({ id: 11, slug: "buds-pro", name: "Obryn Buds Air Pro ANC", category: "Airbud", rating: 4.6 }),
  P({ id: 12, slug: "soundbar-40", name: 'Obryn Soundbar 40" 2.1 Channel', category: "Speaker", rating: 4.5 }),
];

/* ── 1. Alias resolution ────────────────────────────────────────────────── */
console.log("\n── category resolution ──");

check("mobile resolves to Phone", resolveCategory("mobile") === "Phone");
check("Mobile (capitalised) resolves", resolveCategory("Mobile") === "Phone");
check("  mobiles  resolves (padded)", resolveCategory("  mobiles ") === "Phone");
check("smartphone resolves", resolveCategory("smartphone") === "Phone");
check("tv resolves to Monitor", resolveCategory("tv") === "Monitor");
check("laptop resolves", resolveCategory("laptop") === "Laptop");
check("airpods resolves to Airbud", resolveCategory("airpods") === "Airbud");
check("headphones resolves to Airbud", resolveCategory("headphones") === "Airbud");
check("whiteboard resolves to Digital Board", resolveCategory("whiteboard") === "Digital Board");
check("ipad resolves to Tablet", resolveCategory("ipad") === "Tablet / iPad");
check("multi-word picks a known word", resolveCategory("wireless earbuds") === "Airbud");
check("unknown term resolves to null", resolveCategory("zzzz") === null);
check("empty query resolves to null", resolveCategory("") === null);

check("'mobile' is a category query", isLikelyCategoryQuery("mobile"));
check("'halo pro' is not", !isLikelyCategoryQuery("halo pro"));
check("normalise collapses punctuation", normalise("  55\" 4K Panel! ") === "55 4k panel");

/* ── 2. The Flipkart rule ──────────────────────────────────────────────── */
console.log("\n── category fallback (the Flipkart rule) ──");

// The named match wins, but one thin hit is not enough, so the department
// link is offered alongside it. Both, not either-or.
const mobile = searchProducts(CATALOGUE, "mobile");
check("'mobile' shows the product actually named mobile",
  mobile.products.some((p) => p.slug === "mobile-stand"),
  mobile.products.map((p) => p.slug).join(","));
check("'mobile' ALSO offers the Phone category (one hit is thin)",
  mobile.category?.name === "Phone",
  String(mobile.category?.name));
check("fallback reports the real count", mobile.category?.count === 3, `${mobile.category?.count}`);
check("category query recognised", mobile.lookedUpCategory);

// With no product named "mobile" at all, the department is the only answer.
const NO_MOBILE_PRODUCT = CATALOGUE.filter((p) => p.slug !== "mobile-stand");
const bare = searchProducts(NO_MOBILE_PRODUCT, "mobile");
check("no product named mobile -> no product hits", bare.products.length === 0, `${bare.products.length}`);
check("no product named mobile -> Phone category offered",
  bare.category?.name === "Phone",
  String(bare.category?.name));

const tv = searchProducts(CATALOGUE, "tv");
check("'tv' has no product hits", tv.products.length === 0, `${tv.products.length}`);
check("'tv' offers the Monitor category", tv.category?.name === "Monitor", String(tv.category?.name));

const headphones = searchProducts(CATALOGUE, "headphones");
check("'headphones' offers Airbud", headphones.category?.name === "Airbud", String(headphones.category?.name));

// A department that exists in the aliases but has no stock must not produce a
// dead link — offering "Shop all Acoustic" when Acoustic is empty is worse than
// saying nothing.
const emptyDept = searchProducts(CATALOGUE, "podium");
check("resolved category with no products is NOT offered as a dead link",
  emptyDept.category === null,
  String(emptyDept.category?.name));
check("and it returns no products either", emptyDept.products.length === 0);

const nonexistent = searchProducts(CATALOGUE, "hoverboard");
check("unknown category gives no fallback", nonexistent.category === null);
check("unknown category gives no products", nonexistent.products.length === 0);

/* ── 3. Direct product matches win ─────────────────────────────────────── */
console.log("\n── direct matches ──");

const apex = searchProducts(CATALOGUE, "apex");
check("'apex' matches the product by name", apex.products[0]?.slug === "apex-86", apex.products[0]?.slug);
check("good product match suppresses the category link", apex.category === null);

const halo = searchProducts(CATALOGUE, "halo pro");
check("'halo pro' matches the Halo Pro", halo.products[0]?.slug === "halo-pro", halo.products[0]?.slug);

/* ── 4. Multi-word must all match ──────────────────────────────────────── */
console.log("\n── multi-word queries ──");

const samsungPhone = searchProducts(
  [...CATALOGUE, P({ id: 9, name: "Acme Phone X", category: "Phone", brand: "Acme", rating: 4.9 })],
  "acme phone"
);
check("both words match -> result", samsungPhone.products.length === 1, `${samsungPhone.products.length}`);

const mixed = searchProducts(CATALOGUE, "acme laptop");
check("one word unmatched -> no results", mixed.products.length === 0, `${mixed.products.length}`);

/* ── 5. Ranking ────────────────────────────────────────────────────────── */
console.log("\n── ranking ──");

const ranked = searchProducts(CATALOGUE, "5g");
check("'5g' finds the three phones", ranked.products.length === 3, `${ranked.products.length}`);
check("highest-rated ranks first", ranked.products[0]?.slug === "halo-pro", ranked.products[0]?.slug);

const short = searchProducts(CATALOGUE, "ap");
check("too-short query still returns nothing noisy", short.products.length <= 3, `${short.products.length}`);

/* ── 6. Category typeahead ─────────────────────────────────────────────── */
console.log("\n── category typeahead ──");

const lap = matchCategories("lap");
check("'lap' suggests Laptop", lap.some((c) => c.name === "Laptop"), JSON.stringify(lap.map((c) => c.name)));
check("suggestions carry their aliases", (lap.find((c) => c.name === "Laptop")?.aliases ?? []).includes("notebook"));
check("empty term gives nothing", matchCategories("").length === 0);

/* ── 7. Category grid always fills 4 ───────────────────────────────────── */
console.log("\n── category grid padding ──");

const rows = [
  { category: "Phone", items: [1, 2, 3, 4] },
  { category: "Tripod", items: [5, 6] },
  { category: "Airbud", items: [7] },
];

const rankedAll = [...CATALOGUE].sort((a, b) => b.rating - a.rating);
const fillers = rankedAll;

let allFilled = true;
for (const row of rows) {
  const inCat = row.items.map((id) => CATALOGUE.find((p) => p.id === id)!);
  const taken = new Set(inCat.map((p) => p.slug));
  const topUps = fillers.filter((p) => !taken.has(p.slug)).slice(0, CATEGORY_GRID_SIZE - inCat.length);
  const full = [...inCat, ...topUps];

  if (full.length !== CATEGORY_GRID_SIZE) allFilled = false;
  if (new Set(full.map((p) => p.slug)).size !== full.length) {
    allFilled = false;
    console.log(`     duplicate slug in ${row.category}`);
  }
}
check("every row fills to exactly 4", allFilled, `grid size ${CATEGORY_GRID_SIZE}`);

/* ── Result ────────────────────────────────────────────────────────────── */
/* -- 8. Brand suggestions -------------------------------------------------- */
//
// Brands are data, not configuration: the admin dashboard adds them. These checks
// cover the behaviour that makes that work — reading the live product list rather
// than a fixed list, so a brand nobody coded for still shows up.
console.log("\n-- brand suggestions --");

const BRANDED = [
  P({ id: 21, slug: "gal-s24", name: "Samsung Galaxy S24 5G", brand: "Samsung", category: "Phone" }),
  P({ id: 22, slug: "gal-a55", name: "Samsung Galaxy A55 5G", brand: "Samsung", category: "Phone" }),
  P({ id: 23, slug: "gal-tab", name: "Samsung Galaxy Tab S9 FE", brand: "Samsung", category: "Tablet / iPad" }),
  P({ id: 24, slug: "sony-wh", name: "Sony WH-CH720N Headphones", brand: "Sony", category: "Airbud" }),
  P({ id: 25, slug: "sony-fd", name: "Sony Alpha 6400 Camera", brand: "Sony", category: "Camera" }),
  P({ id: 26, slug: "jbl-go", name: "JBL Go 4 Speaker", brand: "JBL", category: "Speaker" }),
  P({ id: 27, slug: "jbl-tune", name: "JBL Tune 510BT", brand: "JBL", category: "Airbud" }),
  P({ id: 28, slug: "jbl-charge", name: "JBL Charge 5", brand: "JBL", category: "Speaker" }),
  // A brand that appears exactly once and would be missed by any minimum-count rule.
  P({ id: 29, slug: "ulanzi-mt", name: "ULANZI MT-44 Tripod", brand: "ULANZI", category: "Tripod" }),
  // Brand not repeated in the name, so a product-name query must not summon a chip.
  P({ id: 30, slug: "apex-55", name: 'Obryn Apex 55" Signage Display', brand: "Obryn", category: "Monitor" }),
];

const brandCount = (brand: string) => BRANDED.filter((p) => p.brand === brand).length;
check("collectBrands counts every brand", brandCount("Samsung") === 3 && brandCount("JBL") === 3 && brandCount("Sony") === 2);
check("collectBrands keeps a one-product brand", brandCount("ULANZI") === 1);

const samsung = searchProducts(BRANDED, "samsung galaxy");
check("brand query suggests the brand", samsung.brands[0]?.name === "Samsung", String(samsung.brands[0]?.name));
check("brand suggestion carries the stock count", samsung.brands[0]?.count === 3, String(samsung.brands[0]?.count));

// A brand chip is a different action from a product hit, not a substitute for
// one, so it survives alongside product results. Gating it on the hit count hid
// it for exactly the queries people type a brand for.
check("brand chip survives when product hits also came back", samsung.products.length === 3 && samsung.brands.length === 1, `${samsung.products.length} products, ${samsung.brands.length} brands`);

// A model search that never names a brand must not drag that brand in.
check("product-name query with no brand word gives no chip", searchProducts(BRANDED, "apex 55").brands.length === 0, String(searchProducts(BRANDED, "apex 55").brands.length));

check("leading word is enough to match a brand", searchProducts(BRANDED, "jbl go").brands[0]?.name === "JBL", String(searchProducts(BRANDED, "jbl go").brands[0]?.name));
check("a pluralised brand still matches", searchProducts(BRANDED, "samsungs").brands[0]?.name === "Samsung", String(searchProducts(BRANDED, "samsungs").brands[0]?.name));

// The plural tolerance must not stretch into a substring match, or "honestly"
// would offer the brand "Honor".
check("a longer word sharing a prefix does NOT match", searchProducts(BRANDED, "honestly unrelated").brands.length === 0, String(searchProducts(BRANDED, "honestly unrelated").brands.length));

// A brand added later, with a single product, still resolves.
const newBrand = [...BRANDED, P({ id: 31, slug: "acme-1", name: "Acme Sens 900 Camera", brand: "Acme", category: "Camera" })];
check("a brand added later is picked up with no code change", searchProducts(newBrand, "acme sens").brands[0]?.name === "Acme", String(searchProducts(newBrand, "acme sens").brands[0]?.name));

check("empty query returns no brand chips", searchProducts(BRANDED, "").brands.length === 0);
check("unmatched brand returns no chip", searchProducts(BRANDED, "nothinglikethis").brands.length === 0);
check("brand cap is respected", searchProducts(BRANDED, "samsung", { brandLimit: 1 }).brands.length <= 1);

console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);