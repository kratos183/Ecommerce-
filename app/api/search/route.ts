import { NextResponse, NextRequest } from "next/server";
import { listProducts } from "@/lib/products";
import { searchProducts } from "@/lib/search";
import { describeError } from "@/lib/supabase";

/**
 * GET /api/search?q=mobile — homepage and catalogue search.
 *
 * Public, read-only, and deliberately cheap: the catalogue is small enough to
 * filter in memory, which keeps the matching logic in one place (lib/search.ts)
 * and testable without a database.
 *
 * Returns both the product hits and, when the query names a department, the
 * category to fall back to — see lib/search.ts for why.
 */

export const runtime = "nodejs";

const MIN_QUERY_LENGTH = 2;

export async function GET(request: NextRequest) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({
      query,
      products: [],
      category: null,
      brands: [],
      lookedUpCategory: false,
      categoryTotal: 0,
    });
  }

  try {
    const products = await listProducts();
    const result = searchProducts(products, query, { limit: 8 });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/search error:", describeError(error));
    return NextResponse.json(
      { error: "Search is unavailable right now" },
      { status: 500 }
    );
  }
}