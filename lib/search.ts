/**
 * Search, with category fallback.
 *
 * The rule this implements is the one shoppers expect from a large Indian
 * marketplace: search "mobile" and you get the phones, even though no product in
 * the catalogue is actually *called* "mobile".
 *
 * So the flow is:
 *   1. Rank products by how well their name, brand, category and description
 *      match the query.
 *   2. If those product hits are thin, resolve the query to a category through
 *      {@link SEARCH_ALIASES} and offer that category too.
 *
 * Both are returned. The caller shows the products and, when one exists, a
 * "search Mobiles instead" link — which is exactly what Flipkart does when you
 * type a department name.
 *
 * Pure and dependency-free, so it is unit-testable without a database.
 */

import type { Product } from "./product-shape";

/**
 * Common shopper words mapped to the category they mean.
 *
 * Keys are lower-case. Categories on the right must match the `category` column
 * exactly. Underscore-separated keys are the multi-word form ("air_pods" →
 * "air_pods" is matched after normalising spaces to underscores).
 */
export const SEARCH_ALIASES: Record<string, string> = {
  // Phones
  mobile: "Phone",
  mobiles: "Phone",
  phone: "Phone",
  phones: "Phone",
  smartphone: "Phone",
  smartphones: "Phone",
  android: "Phone",
  iphone: "Phone",
  iphone_15: "Phone",

  // Computers
  laptop: "Laptop",
  laptops: "Laptop",
  notebook: "Laptop",
  ultrabook: "Laptop",
  computer: "Laptop",
  pc: "Laptop",
  macbook: "Laptop",

  // Tablets
  tablet: "Tablet / iPad",
  tablets: "Tablet / iPad",
  ipad: "Tablet / iPad",
  tab: "Tablet / iPad",

  // Displays
  tv: "Monitor",
  tvs: "Monitor",
  monitor: "Monitor",
  monitors: "Monitor",
  display: "Monitor",
  displays: "Monitor",
  screen: "Monitor",
  signage: "Monitor",
  led: "Monitor",

  // Interactive displays and their computer
  digital_board: "Digital Board",
  smart_board: "Digital Board",
  whiteboard: "Digital Board",
  interactive_panel: "Digital Board",
  class_board: "Digital Board",
  ops: "OPS",
  ops_module: "OPS",
  mini_pc: "OPS",

  // Audio
  earphone: "Airbud",
  earphones: "Airbud",
  earbud: "Airbud",
  earbuds: "Airbud",
  buds: "Airbud",
  headphone: "Airbud",
  headphones: "Airbud",
  headset: "Airbud",
  airpod: "Airbud",
  airpods: "Airbud",

  speaker: "Speaker",
  speakers: "Speaker",
  soundbar: "Speaker",
  sound_bar: "Speaker",
  mic: "Mic",
  microphone: "Mic",
  microphones: "Mic",
  lavalier: "Mic",

  // Optics and light
  camera: "Camera",
  cameras: "Camera",
  webcam: "Camera",
  ring_light: "Light",
  light: "Light",
  lighting: "Light",
  softbox: "Light",

  // Accessories
  accessory: "Accessories",
  accessories: "Accessories",
  cable: "Accessories",
  cables: "Accessories",
  charger: "Accessories",
  mount: "Accessories",
  stylus: "Accessories",
  pen: "Accessories",
  tripod: "Tripod",
  tripods: "Tripod",
};

/** Categories that a query can resolve to, whether or not the catalogue has them. */
const ALIAS_TARGETS = [...new Set(Object.values(SEARCH_ALIASES))];

/** Normalises a query for matching: lower-case, punctuation to space, collapsed. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a query to a category name, or null.
 *
 * Tries the whole phrase first, then each word, so "wireless earbuds" resolves via
 * "earbuds" rather than needing its own alias. Returns the target even if the
 * catalogue has no such category — the caller decides what to do with it.
 */
export function resolveCategory(query: string): string | null {
  const normalised = normalise(query);
  if (!normalised) return null;

  const direct = SEARCH_ALIASES[normalised];
  if (direct) return direct;

  // Multi-word keys are stored with underscores.
  const underscored = normalised.replace(/\s+/g, "_");
  if (SEARCH_ALIASES[underscored]) return SEARCH_ALIASES[underscored];

  // Any single word that maps wins, longest match first so "iphone" beats "phone".
  const words = normalised
    .split(" ")
    .filter((word) => word.length > 2)
    .sort((a, b) => b.length - a.length);

  for (const word of words) {
    if (SEARCH_ALIASES[word]) return SEARCH_ALIASES[word];
  }

  return null;
}

/**
 * Whether the query looks like a department name rather than a product.
 *
 * Used to decide whether to lead with the category link, and to tell the shopper
 * when we did not find anything by that literal name.
 */
export function isLikelyCategoryQuery(query: string): boolean {
  const normalised = normalise(query);
  if (!normalised) return false;
  return (
    normalised in SEARCH_ALIASES ||
    normalised.replace(/\s+/g, "_") in SEARCH_ALIASES ||
    normalise(query).split(" ").some((word) => word.length > 2 && word in SEARCH_ALIASES)
  );
}

/** Score bands, so ranking is by band first and magnitude second. */
const SCORE = {
  nameExact: 100,
  nameStartsWith: 60,
  nameWord: 40,
  category: 30,
  brand: 25,
  description: 10,
} as const;

/**
 * Scores one product against a normalised query.
 *
 * Every query word must match somewhere, so "samsung phone" does not return a
 * random Samsung laptop.
 */
function scoreProduct(product: Product, normalised: string): number {
  const words = normalised.split(" ").filter(Boolean);
  if (words.length === 0) return 0;

  const name = normalise(product.name);
  const category = normalise(product.category);
  const brand = normalise(product.brand);
  const description = normalise(product.description_intro);

  let total = 0;

  for (const word of words) {
    let best = 0;

    if (name === word) best = SCORE.nameExact;
    else if (name.startsWith(word)) best = SCORE.nameStartsWith;
    else if (name.split(" ").includes(word)) best = SCORE.nameWord;
    else if (name.includes(word)) best = SCORE.nameWord - 5;
    else if (category.includes(word)) best = SCORE.category;
    else if (brand.includes(word)) best = SCORE.brand;
    else if (description.includes(word)) best = SCORE.description;

    // An unmatched word disqualifies the product entirely.
    if (best === 0) return 0;
    total += best;
  }

  // Nudge by quality so equally-good matches rank by rating, then discount.
  return total + product.rating * 0.5 + (product.discount ?? 0) * 0.05;
}

export type SearchResult = {
  query: string;
  /** Products matching the query directly, best first. */
  products: Product[];
  /**
   * The category the query resolved to, but only when one actually exists in the
   * catalogue and the product hits are too thin to satisfy the search on their own.
   */
  category: { name: string; count: number } | null;
  /**
   * Brands matching the query, with how many products each carries.
   *
   * Derived from the product list at query time, not from a hardcoded list. That
   * matters because brands are data: adding one through the admin dashboard makes
   * it searchable and filterable with no code change, and there is no second list
   * to forget to update.
   */
  brands: { name: string; count: number }[];
  /** True when the query named a department we recognised. */
  lookedUpCategory: boolean;
  /** Total products in the resolved category, for the "see all N" link. */
  categoryTotal: number;
};

/**
 * Counts products per brand, most-stocked first.
 *
 * Built from the product list rather than any config, so a brand added through
 * the admin dashboard is searchable the moment it exists.
 */
export function collectBrands(all: Product[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const product of all) {
    const brand = (product.brand ?? "").trim();
    if (!brand) continue;
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    // Most products first, then alphabetical, so the ordering is stable.
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export type SearchOptions = {
  /** Max product rows to return. */
  limit?: number;
  /**
   * Product hits below this are treated as "not really a match", which is what
   * triggers the category fallback. Keeps "mobile" from returning one stray
   * product called "Mobile Stand" and stopping there.
   */
  fallbackThreshold?: number;
  /** Max brand suggestions to return. */
  brandLimit?: number;
};

/**
 * Runs a search over an in-memory product list.
 *
 * Takes the list rather than querying, so the same logic runs in the API route
 * and in tests. The catalogue is small enough that filtering in memory is fine.
 */
export function searchProducts(
  all: Product[],
  query: string,
  options: SearchOptions = {}
): SearchResult {
  const limit = options.limit ?? 8;
  const fallbackThreshold = options.fallbackThreshold ?? 2;
  const brandLimit = options.brandLimit ?? 5;

  const normalised = normalise(query);
  if (!normalised) {
    return {
      query,
      products: [],
      category: null,
      brands: [],
      lookedUpCategory: false,
      categoryTotal: 0,
    };
  }

  // 1. Rank products directly against the query.
  const scored = all
    .filter((product) => product.inStock || product.price > 0)
    .map((product) => ({ product, score: scoreProduct(product, normalised) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const products = scored.slice(0, limit).map((entry) => entry.product);

  // 2. Resolve the query to a category as a fallback.
  const resolved = resolveCategory(query);
  const lookedUpCategory = isLikelyCategoryQuery(query);

  let category: SearchResult["category"] = null;
  let categoryTotal = 0;

  if (resolved) {
    const inCategory = all.filter((product) => product.category === resolved);
    categoryTotal = inCategory.length;

    // Only surface the category when it exists and the direct hits are thin —
    // otherwise a good product match would be competing with a redundant link.
    const needsFallback =
      scored.length < fallbackThreshold &&
      inCategory.length > products.length;

    if (needsFallback && categoryTotal > 0) {
      category = { name: resolved, count: categoryTotal };
    }
  }

  // 3. Brand suggestions, matched against the live catalogue.
  //
  // A brand matches when the shopper actually *typed* it — some query word is the
  // brand name, or starts it ("samsungs" -> "Samsung"). Reading it off the
  // catalogue rather than a config list is what lets a brand added through the
  // admin dashboard be searchable without a code change.
  //
  // Deliberately NOT gated on the hit count, unlike the category fallback. A
  // category link is a substitute for thin results; a brand chip is a different
  // action, so "samsung" offering "All Samsung products (3)" is useful even
  // though three products already came back. Gating it on the same threshold hid
  // it for exactly the queries people use it for.
  const allBrands = collectBrands(all);
  const words = normalised.split(" ").filter(Boolean);

  const brands = allBrands
    .filter((brand) => {
      const brandName = normalise(brand.name);
      return words.some((word) => {
        if (brandName === word) return true;
        // Tolerate a plural or possessive ("samsungs", "sony's") but nothing
        // longer, so "honestly" does not match the brand "honor".
        return word.startsWith(brandName) && word.length - brandName.length <= 2;
      });
    })
    .slice(0, brandLimit);

  return { query, products, category, brands, lookedUpCategory, categoryTotal };
}

/**
 * Categories matching a partial term, for the search box's typeahead.
 *
 * Lets a shopper start typing "lap" and pick "Laptop" without knowing we call
 * it that.
 */
export function matchCategories(
  term: string,
  limit = 6
): { name: string; aliases: string[] }[] {
  const normalised = normalise(term);
  if (!normalised) return [];

  return ALIAS_TARGETS.filter((category) =>
    normalise(category).includes(normalised)
  )
    .slice(0, limit)
    .map((name) => ({
      name,
      aliases: Object.entries(SEARCH_ALIASES)
        .filter(([, target]) => target === name)
        .map(([alias]) => alias.replace(/_/g, " "))
        .slice(0, 6),
    }));
}