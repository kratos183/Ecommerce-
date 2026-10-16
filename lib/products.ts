/**
 * Product reads and writes.
 *
 * Every place in the app that needs products goes through here, so the messy part
 * of talking to Postgres lives in one file: `numeric` columns arrive as strings
 * over PostgREST, `jsonb` can arrive as an object or a string, and the derived
 * fields the UI needs (discount %, "in stock") are computed once rather than in
 * each route that happens to need them.
 *
 * This module imports the Supabase service-role client, so it is server-only. The
 * `Product` type and the row mapping live in `lib/product-shape.ts`, which has no
 * database dependency and can be imported anywhere.
 */

import { db } from "./db";
import { asRow, asRows, json, num } from "./supabase";
import { toProduct, toProducts, type Product, type ProductRow } from "./product-shape";

export type { Product, ProductRow };
export { toProduct, toProducts };

/** Every product read selects the same columns — one place to add a new field. */
export const PRODUCT_COLUMNS =
  "id, name, slug, category, brand, price, mrp, image_url, images, description_intro, " +
  "specifications, badge, rating, review_count, stock, is_featured, is_deal, " +
  "deal_ends_at, bundle_slugs, created_at";

export type ProductQuery = {
  category?: string;
  brand?: string;
  search?: string;
  /** Cap the number of rows returned. */
  limit?: number;
};

/** The catalogue, newest first, optionally filtered by category, brand or search term. */
export async function listProducts(options: ProductQuery = {}): Promise<Product[]> {
  let query = db()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });

  if (options.category) query = query.eq("category", options.category);
  if (options.brand) query = query.eq("brand", options.brand);
  if (options.search) {
    // `*` makes the term a prefix match and ilike makes it case-insensitive.
    const term = `%${options.search.replace(/[%_,]/g, " ")}%`;
    query = query.or(`name.ilike.${term},brand.ilike.${term},category.ilike.${term}`);
  }
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;

  return toProducts(asRows<ProductRow>(data));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await db()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ? toProduct(asRow<ProductRow>(data)) : null;
}

/** The distinct categories present in the catalogue, with a count of each. */
export async function listCategories(): Promise<{ category: string; count: number }[]> {
  const { data, error } = await db()
    .from("products")
    .select("category")
    .order("category");

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of asRows<Record<string, unknown>>(data)) {
    const category = String(row.category ?? "General");
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/** Fields accepted when creating or editing a product. */
export type ProductInput = {
  name: string;
  slug: string;
  category?: string;
  brand?: string;
  price?: number;
  mrp?: number;
  image_url?: string | null;
  images?: string[];
  description_intro?: string;
  specifications?: Record<string, string>;
  badge?: string;
  rating?: number;
  review_count?: number;
  stock?: number;
  is_featured?: boolean;
  is_deal?: boolean;
  deal_ends_at?: string | null;
  bundle_slugs?: string[];
};

/** Coerces a request body into a valid insert/update payload. */
export function toProductInput(body: Record<string, unknown>): ProductInput {
  return {
    name: String(body.name ?? "").trim(),
    slug: String(body.slug ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    category: String(body.category ?? "General").trim() || "General",
    brand: String(body.brand ?? "").trim(),
    price: num(body.price),
    mrp: num(body.mrp),
    image_url: body.image_url ? String(body.image_url) : null,
    images: Array.isArray(body.images) ? body.images.map(String) : [],
    description_intro: String(body.description_intro ?? ""),
    specifications: json<Record<string, string>>(body.specifications, {}),
    badge: String(body.badge ?? ""),
    rating: num(body.rating),
    review_count: num(body.review_count),
    stock: num(body.stock, 25),
    is_featured: Boolean(body.is_featured),
    is_deal: Boolean(body.is_deal),
    deal_ends_at: body.deal_ends_at ? String(body.deal_ends_at) : null,
    bundle_slugs: Array.isArray(body.bundle_slugs) ? body.bundle_slugs.map(String) : [],
  };
}

export async function createProduct(input: ProductInput): Promise<void> {
  const { error } = await db().from("products").insert(input);
  if (error) throw error;
}

export async function updateProduct(slug: string, input: ProductInput): Promise<void> {
  const { error } = await db()
    .from("products")
    .update(input)
    .eq("slug", slug);
  if (error) throw error;
}

export async function deleteProduct(slug: string): Promise<void> {
  const { error } = await db().from("products").delete().eq("slug", slug);
  if (error) throw error;
}