/**
 * "Frequently Bought Together" bundles.
 *
 * A product carries a `bundle_slugs` array naming what people usually buy with it.
 * This resolves those slugs into real products and pairs each one with a hero to
 * show it next to.
 *
 * The slugs, not the ids, are the source of truth: re-importing a catalogue from
 * the admin panel changes ids, which would silently break every bundle.
 */

import { db } from "./db";
import { toProducts, type Product, PRODUCT_COLUMNS } from "./products";
import { asRows } from "./supabase";

/** How many companion products to show beside the hero. */
const BUNDLE_WIDTH = 3;

export type Bundle = {
  /** The product the customer is looking at. */
  hero: Product;
  /** What to buy alongside it, already resolved. */
  companions: Product[];
  /** Sum of every line at quantity 1. */
  total: number;
  /** How much the customer saves against the sum of the individual MRPs. */
  saving: number;
};

/**
 * Builds bundles for a list of products, resolving each product's `bundle_slugs`.
 *
 * Slugs that do not match a live product are skipped rather than rendered as a
 * gap — deleting an accessory should not leave a hole in every bundle that used
 * to reference it.
 */
export async function buildBundles(
  products: Product[],
  options: { width?: number } = {}
): Promise<Bundle[]> {
  const width = options.width ?? BUNDLE_WIDTH;
  if (products.length === 0) return [];

  const wanted = new Set<string>();
  for (const product of products) {
    for (const slug of product.bundle_slugs) {
      if (slug && slug !== product.slug) wanted.add(slug);
    }
  }

  // One query for every companion of every hero, rather than one per product.
  const companions = wanted.size
    ? toProducts(
        asRows<Record<string, unknown>>(
          (
            await db()
              .from("products")
              .select(PRODUCT_COLUMNS)
              .in("slug", [...wanted])
          ).data
        )
      )
    : [];

  const bySlug = new Map(companions.map((product) => [product.slug, product]));

  return products
    .map((hero) => {
      const picks: Product[] = [];
      for (const slug of hero.bundle_slugs) {
        if (picks.length >= width) break;
        const match = bySlug.get(slug);
        if (match && match.inStock) picks.push(match);
      }

      const lines = [hero, ...picks];
      const total = lines.reduce((sum, line) => sum + line.price, 0);
      const listPrice = lines.reduce((sum, line) => sum + (line.mrp || line.price), 0);

      return {
        hero,
        companions: picks,
        total,
        saving: Math.max(0, listPrice - total),
      };
    })
    // A hero with no companions would render as an empty card — drop it.
    .filter((bundle) => bundle.companions.length > 0);
}

/**
 * Picks which products to feature in the "Frequently Bought Together" rail on the
 * homepage.
 *
 * Prefers products that actually have a bundle configured, then the ones with the
 * deepest discount, so the section is never empty just because nobody filled in
 * `bundle_slugs` on the cheapest products yet.
 */
export async function homepageBundles(limit = 4): Promise<Bundle[]> {
  const { data, error } = await db()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_featured", true)
    .gt("stock", 0)
    .limit(limit * 4);

  if (error) throw error;

  const candidates = toProducts(asRows<Record<string, unknown>>(data))
    .filter((product) => product.price > 0)
    .sort((a, b) => {
      const bundleDelta = b.bundle_slugs.length - a.bundle_slugs.length;
      if (bundleDelta !== 0) return bundleDelta;
      return (b.discount ?? 0) - (a.discount ?? 0);
    });

  return buildBundles(candidates, { width: BUNDLE_WIDTH });
}