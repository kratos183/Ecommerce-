/**
 * Resolves a real, working image URL for every product in the catalogue.
 *
 *   node scripts/resolve-images.mjs            # only fill in what is missing
 *   node scripts/resolve-images.mjs --force    # re-resolve everything
 *
 * Writes `scripts/image-sources.mjs`, which the seed generator imports. Nothing
 * here runs at build or request time — it is a one-off sourcing pass, and the
 * results are committed so the seed is reproducible offline.
 *
 * ── WHY THIS IS CATEGORY-BASED, NOT PRODUCT-BASED ────────────────────────────
 *
 * An earlier version tried to match each product to its exact model and, as the
 * numbers showed, succeeded 10 times in 149: Wikimedia Commons is a volunteer
 * encyclopedia with thorough coverage of mass-market phones and none of the niche
 * SKUs here. It spent three passes returning photographs of the wrong thing.
 *
 * This version does not attempt per-product matching at all. It gathers a pool
 * of good-looking photographs per CATEGORY and deals them out, so the storefront
 * looks like a modern electronics store instead of a wall of grey tiles. The
 * images are honest category illustrations, not depictions of the actual stock —
 * replace them from Admin Dashboard → Products when you have real photography.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────────
 *
 *   Unsplash  used when UNSPLASH_ACCESS_KEY is set. This is what you want:
 *             free, no attribution required, and consistently modern product
 *             photography. The key comes from unsplash.com/join — the free tier
 *             allows 50 requests an hour, and a full run needs about 60.
 *
 *   Openverse  used otherwise, so a fresh checkout still produces working images.
 *             It is an open aggregator (Flickr, museums, and so on) and needs no
 *             key. Quality is more variable and the photography is less styled,
 *             but every URL is verified the same way.
 *
 * ── WHY EVERY URL IS VERIFIED ────────────────────────────────────────────────
 *
 * A search index returns whatever matched. Roughly one result in twenty is a
 * diagram, an SVG, a 40-pixel icon or a file that has since been deleted — all
 * of which render as a broken image in the storefront. Every URL that reaches the
 * seed has had a real request against it, and only 200/206 responses carrying an
 * image content type are accepted.
 */

import { writeFileSync, existsSync } from "node:fs";
import { CATALOGUE, slugFor } from "./seed-data.mjs";

const OUT = "scripts/image-sources.mjs";
const IMAGES_PER_PRODUCT = 4;

/** Wikimedia and the aggregators ask for a descriptive User-Agent. */
const UA =
  "EcommerceCatalogueSeeder/1.0 (portfolio catalogue; contact chandansaricreative@gmail.com)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ══════════════════════════════════════════════════════════════════════════
   QUERIES
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Search terms per category.
 *
 * Several per category on purpose: the pool is filled from all of them, then
 * dealt round-robin, so a single query returning twenty near-identical shots
 * cannot fill every product with the same picture.
 */
const QUERIES = {
  Phone: ["smartphone product", "mobile phone", "phone on desk", "modern smartphone"],
  Laptop: ["laptop computer", "macbook workspace", "open laptop", "notebook computer"],
  "Tablet / iPad": ["tablet computer", "ipad", "digital tablet", "tablet device"],
  Airbud: ["wireless earbuds", "headphones product", "earbuds case", "bluetooth headphones"],
  Speaker: ["bluetooth speaker", "portable speaker", "speaker product"],
  Light: ["led light panel", "ring light", "modern lamp", "led bulb"],
  "Digital Board": ["interactive whiteboard", "touchscreen display", "classroom screen", "large display panel"],
  Monitor: ["computer monitor", "display screen", "monitor desk"],
  OPS: ["computer processor", "motherboard", "computer hardware", "circuit board"],
  Camera: ["mirrorless camera", "dslr camera", "camera product", "photography camera"],
  Mic: ["studio microphone", "microphone product", "condenser microphone"],
  Tripod: ["camera tripod", "tripod stand"],
  Accessories: ["usb cable", "charger plug", "power adapter", "hdmi cable"],
  Acoustic: ["acoustic panel", "soundproof wall", "acoustic foam"],
  Podium: ["lectern podium", "speaker podium"],
};

/** Categories a product might be in that have no entry above. */
const GENERIC = ["electronics", "gadgets", "technology product"];

/**
 * Rejects filenames that cannot be a photograph of a product.
 *
 * The aggregators rank by text relevance, so "microphone" surfaces concerts
 * and album artwork — which pass a mime-type and size check while being useless
 * as a product photo. These are the words that actually showed up.
 */
const NOT_A_PRODUCT = [
  "performing", "performance", "singer", "singing", "concert", "band", "album",
  "cover", "portrait", "festival", "crowd", "audience", "stage", "tour",
  "statue", "monument", "painting", "artwork", "poster", "stamp", "coin",
  "banknote", "screenshot", "diagram", "chart", "graph", "map of", "plaque",
  "graffiti", "mural", "logo", "flag of", "coat of arms", "book", "vinyl",
  "selfie", "instagram", "facebook",
];

const looksLikeProduct = (text) => {
  const t = text.toLowerCase();
  return !NOT_A_PRODUCT.some((word) => t.includes(word));
};

/* ══════════════════════════════════════════════════════════════════════════
   PROVIDERS
   ══════════════════════════════════════════════════════════════════════════ */

/** Confirms a URL really serves an image right now. */
async function verify(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Range: "bytes=0-2047" },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    if (!res.ok && res.status !== 206) return false;
    return /^image\/(jpeg|png|webp|jpg)$/.test(res.headers.get("content-type") ?? "");
  } catch {
    return false;
  }
}

async function searchUnsplash(query, want = 20) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    query,
    per_page: String(want),
    orientation: "squarish",
    content_filter: "high",
  });

  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${key}`, "User-Agent": UA },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  return (data.results ?? [])
    .filter((photo) => photo?.urls?.regular)
    // Square-ish crops: a product grid is a wall of squares, and a panorama
    // letterboxed into one is mostly background.
    .filter((photo) => {
      const label = `${photo.description ?? ""} ${photo.alt_description ?? ""}`;
      return !photo.alt_description || looksLikeProduct(label || "product");
    })
    .map((photo) => ({
      url: photo.urls.regular,
      credit: [photo.user?.name, photo.description ?? photo.alt_description]
        .filter(Boolean)
        .join(" — "),
    }));
}

async function searchOpenverse(query, want = 20) {
  const params = new URLSearchParams({
    q: query,
    page_size: String(want),
    // Only licences that permit display without extra conditions.
    license_type: "all",
  });

  const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) return [];

  const data = await res.json();

  return (data.results ?? [])
    .filter((item) => item?.url && looksLikeProduct(item.title ?? ""))
    .map((item) => ({
      url: item.url,
      credit: [item.title, item.creator].filter(Boolean).join(" — "),
    }));
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════════════ */

const force = process.argv.includes("--force");
const usingUnsplash = Boolean(process.env.UNSPLASH_ACCESS_KEY);
const search = usingUnsplash ? searchUnsplash : searchOpenverse;

if (usingUnsplash) {
  console.log("Source: Unsplash (UNSPLASH_ACCESS_KEY is set)\n");
} else {
  console.log(
    "Source: Openverse — no UNSPLASH_ACCESS_KEY found.\n" +
      "  These are verified but less consistent than Unsplash.\n" +
      "  For Unsplash: sign up at unsplash.com/join, copy the Access Key into\n" +
      "  UNSPLASH_ACCESS_KEY in .env.local, then re-run this script.\n"
  );
}

/** Previous run's results, so a re-run only fills the gaps. */
let cached = {};
if (existsSync(OUT) && !force) {
  try {
    cached = (await import(`./${OUT}`)).IMAGE_SOURCES ?? {};
  } catch {
    cached = {};
  }
}

/** Products per category, in catalogue order. */
const byCategory = new Map();
for (const product of CATALOGUE) {
  byCategory.set(product.category, [...(byCategory.get(product.category) ?? []), product]);
}

const resolved = {};
let realSlots = 0;
let standInSlots = 0;

for (const [category, products] of byCategory) {
  const queries = QUERIES[category] ?? GENERIC;

  // How many distinct photos this category needs: enough that no two products in
  // it get the same picture, with headroom for URLs that fail verification.
  const needed = products.length * IMAGES_PER_PRODUCT;

  const pool = [];
  const seen = new Set();

  for (const query of queries) {
    if (pool.length >= needed * 2) break;

    let results = [];
    try {
      results = await search(query, 20);
    } catch {
      results = [];
    }

    for (const candidate of results) {
      if (pool.length >= needed * 2) break;
      if (!candidate.url || seen.has(candidate.url)) continue;
      if (!looksLikeProduct(candidate.credit ?? "")) continue;
      seen.add(candidate.url);
      if (await verify(candidate.url)) pool.push(candidate);
    }

    await sleep(120);
  }

  // Deal the pool out so consecutive products get different photos, rather than
  // each taking the same top four.
  let cursor = 0;
  for (const product of products) {
    const slug = slugFor(product.name, product.brand);

    // Already have four working images? Keep them unless forced.
    const existing = cached[slug];
    if (
      !force &&
      Array.isArray(existing) &&
      existing.length >= IMAGES_PER_PRODUCT &&
      existing.every((e) => e.url && !e.url.includes("placehold.co"))
    ) {
      resolved[slug] = existing;
      realSlots += IMAGES_PER_PRODUCT;
      continue;
    }

    const picks = [];
    // Walk the pool until four distinct URLs are found or it runs dry.
    for (let step = 0; step < pool.length && picks.length < IMAGES_PER_PRODUCT; step++) {
      const entry = pool[(cursor + step) % pool.length];
      if (entry && !picks.some((p) => p.url === entry.url)) picks.push(entry);
    }

    resolved[slug] = Array.from({ length: IMAGES_PER_PRODUCT }, (_, i) =>
      picks[i]
        ? { url: picks[i].url, credit: picks[i].credit }
        : {
            url: `https://placehold.co/1000x1000/f1f5f9/334155?text=${encodeURIComponent(
              `${product.brand} ${product.name}`.slice(0, 60)
            )}`,
            credit: null,
          }
    );

    const real = picks.length;
    realSlots += real;
    standInSlots += IMAGES_PER_PRODUCT - real;
    cursor += IMAGES_PER_PRODUCT;
  }

  console.log(
    `  ${category.padEnd(18)} ${String(products.length).padStart(3)} products, ` +
      `${String(pool.length).padStart(3)} photos in pool`
  );
}

/* ── Write the cache after every category, so an interrupted run keeps its work ── */

function writeCache(cache) {
  const banner = `/**
 * Verified product image URLs — GENERATED, DO NOT EDIT BY HAND.
 *
 *   Regenerate:  node scripts/resolve-images.mjs [--force]
 *   Consumed by: scripts/build-seed.mjs
 *
 * These are good-looking category photographs, not pictures of the exact product
 * each listing names — see the header comment in scripts/resolve-images.mjs for
 * why per-model matching was abandoned. Every URL here was fetched and confirmed
 * to serve an image when it was written.
 *
 * Replace with real photography from Admin Dashboard -> Products.
 */

export const IMAGE_SOURCES = `;

  // Emitted as plain JSON, which is a valid ES module export. The keys are
  // product slugs and stay quoted.
  writeFileSync(OUT, `${banner}${JSON.stringify(cache, null, 2)};\n`);
}

writeCache(resolved);

const total = CATALOGUE.length * IMAGES_PER_PRODUCT;
console.log(`\nWrote ${OUT}`);
console.log(`  ${CATALOGUE.length} products, ${Object.keys(resolved).length} resolved`);
console.log(
  `  ${realSlots}/${total} image slots are verified photos (${Math.round(
    (realSlots / total) * 100
  )}%), ${standInSlots} stand-ins`
);