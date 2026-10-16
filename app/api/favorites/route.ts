import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toProducts, PRODUCT_COLUMNS, type ProductRow } from "@/lib/products";
import { asRow, asRows, describeError, num } from "@/lib/supabase";

/**
 * GET /api/favorites — the signed-in customer's wishlist, joined with live product data so
 * prices and images stay current even if a product changed after it was favourited.
 * Products that have since been deleted are dropped.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // PostgREST resolves `favorites -> products` as an embedded resource, so this
    // is one round trip rather than a join the server has to stitch together.
    const result = await db()
      .from("favorites")
      .select(`id, created_at, products (${PRODUCT_COLUMNS})`)
      .eq("user_id", session.id)
      .order("created_at", { ascending: false });

    if (result.error) throw result.error;

    const favorites = asRows<{ id: unknown; created_at: string; products: unknown }>(
      result.data
    )
      // A product deleted from the catalogue leaves a null embedded row (the
      // foreign key is ON DELETE CASCADE, but the guard covers hand-edited data).
      .filter((row) => row.products)
      .map((row) => ({
        ...toProducts([asRow<ProductRow>(row.products)])[0],
        favorite_id: num(row.id),
        favorited_at: row.created_at,
      }));

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("GET /api/favorites error:", describeError(error));
    return NextResponse.json({ error: "Could not load wishlist" }, { status: 500 });
  }
}

/**
 * POST /api/favorites — add or remove a product from the wishlist.
 *
 * Idempotent toggle: the request body may set `favorited` explicitly, otherwise the current
 * state is flipped. Responds with the resulting state so the caller can update the UI
 * without a second round trip.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { productId?: number; favorited?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const productId = Number(body.productId);
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "A valid productId is required" }, { status: 400 });
  }

  try {
    const product = await db()
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();

    if (product.error) throw product.error;
    if (!product.data) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const existing = await db()
      .from("favorites")
      .select("id")
      .eq("user_id", session.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing.error) throw existing.error;

    const shouldAdd =
      typeof body.favorited === "boolean" ? body.favorited : !existing.data;

    if (shouldAdd && !existing.data) {
      const { error } = await db()
        .from("favorites")
        .insert({ user_id: session.id, product_id: productId });
      if (error) throw error;
    } else if (!shouldAdd && existing.data) {
      const { error } = await db()
        .from("favorites")
        .delete()
        .eq("user_id", session.id)
        .eq("product_id", productId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, productId, favorited: shouldAdd });
  } catch (error) {
    console.error("POST /api/favorites error:", describeError(error));
    return NextResponse.json({ error: "Could not update wishlist" }, { status: 500 });
  }
}

/** DELETE /api/favorites?productId=123 — remove without toggling. */
export async function DELETE(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "A valid productId is required" }, { status: 400 });
  }

  try {
    const { error } = await db()
      .from("favorites")
      .delete()
      .eq("user_id", session.id)
      .eq("product_id", productId);
    if (error) throw error;

    return NextResponse.json({ success: true, productId, favorited: false });
  } catch (error) {
    console.error("DELETE /api/favorites error:", describeError(error));
    return NextResponse.json({ error: "Could not update wishlist" }, { status: 500 });
  }
}