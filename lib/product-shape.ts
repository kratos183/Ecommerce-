/**
 * The `Product` shape and how a database row becomes one.
 *
 * Deliberately separate from `lib/products.ts`, which imports the Supabase
 * service-role client. The mapping here is pure — no database, no secrets — so it
 * can be used from scripts, tests and any future client component without
 * dragging `server-only` along. `lib/products.ts` re-exports it, so importing
 * from either module gives the same types.
 */

import { json, num } from "./supabase";

export type Product = {
  id: number;
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  mrp: number;
  image_url: string | null;
  images: string[];
  description_intro: string;
  specifications: Record<string, string>;
  badge: string;
  rating: number;
  review_count: number;
  stock: number;
  inStock: boolean;
  discount: number | null;
  is_featured: boolean;
  is_deal: boolean;
  deal_ends_at: string | null;
  bundle_slugs: string[];
  created_at: string;
};

/** A raw PostgREST row. Loose because jsonb/numeric come back wider than the product. */
export type ProductRow = Record<string, unknown>;

/**
 * Normalises a database row into the shape the UI renders.
 *
 * A product priced at 0 is a "priced on request" listing: it shows up in the
 * catalogue but cannot be added to a cart, so `inStock` is false for it too.
 */
export function toProduct(row: ProductRow): Product {
  const price = num(row.price);
  const mrp = num(row.mrp);
  const stock = num(row.stock);

  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    category: String(row.category ?? "General"),
    brand: String(row.brand ?? ""),
    price,
    // Guard against a bad edit leaving mrp below price: a struck-through price
    // that is lower than the selling price looks broken.
    mrp: mrp > price ? mrp : 0,
    image_url: (row.image_url as string) ?? null,
    images: json<string[]>(row.images, []),
    description_intro: String(row.description_intro ?? ""),
    specifications: json<Record<string, string>>(row.specifications, {}),
    badge: String(row.badge ?? ""),
    rating: num(row.rating),
    review_count: num(row.review_count),
    stock,
    inStock: price > 0 && stock > 0,
    discount: mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : null,
    is_featured: Boolean(row.is_featured),
    is_deal: Boolean(row.is_deal),
    deal_ends_at: (row.deal_ends_at as string) ?? null,
    bundle_slugs: json<string[]>(row.bundle_slugs, []),
    created_at: String(row.created_at ?? ""),
  };
}

/** Maps a row set. */
export function toProducts(rows: ProductRow[] | null): Product[] {
  return (rows ?? []).map(toProduct);
}