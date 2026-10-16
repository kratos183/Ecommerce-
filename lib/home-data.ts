/**
 * Home page data loading.
 *
 * Reads everything the homepage needs from Supabase in one place, and degrades to
 * the static fallback catalogue if the database is not reachable or not yet
 * seeded. A fresh clone therefore still renders a complete storefront instead of
 * an empty shell.
 *
 * `source` is threaded through so the page can show an honest "preview catalogue"
 * notice while the real one is empty, rather than silently lying about what the
 * visitor is looking at.
 */

import { isSupabaseConfigured } from "./db";
import { homepageBundles, buildBundles, type Bundle } from "./bundles";
import { listProducts } from "./products";
import type { Product } from "./product-shape";
import { FALLBACK_CATALOGUE, CATEGORY_GRID_SIZE } from "./home";
import { asRows, describeError } from "./supabase";

export type HomeSource = "database" | "fallback";

export type HomeData = {
  products: Product[];
  /** Products for the hero carousel, one per slide. */
  heroProducts: Product[];
  /** Departments for the strip under the hero, biggest first. */
  categories: { category: string; count: number }[];
  /** Everything with `is_deal`, soonest deadline first. */
  deals: Product[];
  /** Best sellers: top rated, then most reviewed. */
  bestSellers: Product[];
  /** New arrivals, most recently added first. */
  newArrivals: Product[];
  /** Products grouped by category, biggest category first. */
  byCategory: { category: string; products: Product[]; inCategoryCount: number }[];
  /** Configured "Frequently Bought Together" bundles. */
  bundles: Bundle[];
  /** Discount % for the hero ribbon, or null when nothing is on offer. */
  topDiscount: number | null;
  source: HomeSource;
  /** Populated when `source` is "fallback", so the page can explain itself. */
  notice: string | null;
};

const DEAL_COUNT = 8;
const RAIL_COUNT = 10;
/** How many hero slides exist, and therefore how many hero products are picked. */
const HERO_SLIDE_COUNT = 3;

/**
 * Ensures a row shows exactly `size` products.
 *
 * A category with fewer products than the grid has slots is topped up with the
 * best sellers from other categories. Hiding the category instead would leave
 * most of the catalogue unreachable — with this seed data nine of thirteen
 * categories hold under four items, so nearly nothing would render.
 *
 * The subtitle already states the category's real count, and the shopper can
 * click through to the full category, so nothing here misrepresents what exists.
 */
function fillRow(
  category: string,
  inCategory: Product[],
  others: Product[],
  size: number = CATEGORY_GRID_SIZE
): { category: string; products: Product[]; inCategoryCount: number } {
  if (inCategory.length >= size) {
    return {
      category,
      products: inCategory.slice(0, size),
      inCategoryCount: inCategory.length,
    };
  }

  const taken = new Set(inCategory.map((product) => product.slug));
  const topUps = others
    .filter((product) => !taken.has(product.slug))
    .slice(0, size - inCategory.length);

  return {
    category,
    products: [...inCategory, ...topUps],
    inCategoryCount: inCategory.length,
  };
}

/**
 * Groups products by category, largest first, and pads every row to
 * {@link CATEGORY_GRID_SIZE}.
 */
function groupByCategory(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    groups.set(product.category, [...(groups.get(product.category) ?? []), product]);
  }

  // Ranked once here so every top-up picks the same high-quality products.
  const ranked = [...products].sort(
    (a, b) => b.rating - a.rating || (b.discount ?? 0) - (a.discount ?? 0)
  );

  return [...groups.entries()]
    .map(([category, items]) => fillRow(category, items, ranked))
    // A single product in a category makes for a thin row; those products are
    // already covered by the "new arrivals" and "best sellers" rails.
    .filter((group) => group.inCategoryCount >= 2)
    .sort((a, b) => b.inCategoryCount - a.inCategoryCount);
}

/** Assembles {@link HomeData} from an in-memory product list. */
function assemble(products: Product[], bundles: Bundle[], source: HomeSource, notice: string | null): HomeData {
  const sellable = products.filter((product) => product.price > 0);

  const deals = sellable
    .filter((product) => product.is_deal && (product.discount ?? 0) > 0)
    .sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0))
    .slice(0, DEAL_COUNT);

  const bestSellers = [...sellable]
    .filter((product) => product.rating >= 4.5 || product.review_count > 200)
    .sort((a, b) => b.rating - a.rating || b.review_count - a.review_count)
    .slice(0, RAIL_COUNT);

  const newArrivals = [...sellable]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, RAIL_COUNT);

  const topDiscount =
    deals.length > 0 ? Math.max(...deals.map((deal) => deal.discount ?? 0)) : null;

  return {
    products,
    heroProducts: pickHeroProducts(sellable, deals),
    categories: countCategories(sellable),
    deals,
    bestSellers,
    newArrivals,
    byCategory: groupByCategory(sellable),
    bundles,
    topDiscount,
    source,
    notice,
  };
}

/** Departments with a count each, busiest first. */
function countCategories(products: Product[]) {
  const counts = new Map<string, number>();
  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    // Largest first, alphabetical within a tie, so the strip is stable.
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

/**
 * Chooses the products shown in the hero carousel.
 *
 * A slide with no product picture is just a gradient, so anything without an
 * image is dropped first. Among the rest, the biggest discount goes first because
 * it gives the slide a number worth showing. `Array.sort` is stable, so when
 * nothing is discounted the catalogue order is preserved.
 */
function pickHeroProducts(sellable: Product[], deals: Product[]): Product[] {
  const withImage = sellable.filter((product) => Boolean(product.image_url));
  const pool = withImage.length ? withImage : sellable;

  const discountOf = new Map(deals.map((deal) => [deal.id, deal.discount ?? 0]));

  return [...pool]
    .sort((a, b) => (discountOf.get(b.id) ?? 0) - (discountOf.get(a.id) ?? 0))
    .slice(0, HERO_SLIDE_COUNT);
}

function fallbackData(notice: string): HomeData {
  // The static catalogue has no ids (they live in the database), so bundles are
  // resolved from `bundle_slugs` directly rather than through Postgres.
  const bySlug = new Map(FALLBACK_CATALOGUE.map((product) => [product.slug, product]));

  const bundles: Bundle[] = FALLBACK_CATALOGUE.filter((p) => p.bundle_slugs.length > 0)
    .map((hero) => {
      const companions = hero.bundle_slugs
        .map((slug) => bySlug.get(slug))
        .filter((p): p is Product => Boolean(p))
        .slice(0, 3);

      const lines = [hero, ...companions];
      const total = lines.reduce((sum, line) => sum + line.price, 0);
      const listPrice = lines.reduce((sum, line) => sum + (line.mrp || line.price), 0);

      return { hero, companions, total, saving: Math.max(0, listPrice - total) };
    })
    .filter((bundle) => bundle.companions.length > 0)
    .slice(0, 4);

  return assemble(FALLBACK_CATALOGUE, bundles, "fallback", notice);
}

/**
 * Loads everything the homepage renders.
 *
 * Never throws. A database problem degrades to the static catalogue rather than
 * taking the page down, which matters most on the one page most people land on.
 */
export async function loadHomeData(): Promise<HomeData> {
  if (!isSupabaseConfigured()) {
    return fallbackData(
      "Showing the preview catalogue — connect Supabase to show your live products."
    );
  }

  try {
    const [products, bundles] = await Promise.all([
      listProducts(),
      homepageBundles(4).catch(() => [] as Bundle[]),
    ]);

    if (products.length === 0) {
      return fallbackData(
        "Your database is empty — run supabase/seed.sql to load the starter catalogue."
      );
    }

    // Fall back to a plain same-category pairing if nobody has configured
    // bundle_slugs yet, so the section is never empty on a fresh import.
    const resolved =
      bundles.length > 0
        ? bundles
        : await buildBundles(products.filter((p) => p.price > 0).slice(0, 8)).catch(
            () => [] as Bundle[]
          );

    return assemble(products, resolved, "database", null);
  } catch (error) {
    console.error("loadHomeData failed:", describeError(error));
    return fallbackData(
      "Could not reach the product database — showing the preview catalogue."
    );
  }
}