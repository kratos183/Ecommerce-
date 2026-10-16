import { NextResponse, NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyToken } from "@/lib/auth";
import { createProduct, listProducts, toProductInput } from "@/lib/products";
import { describeError } from "@/lib/supabase";

/**
 * GET /api/products — the catalogue, newest first.
 *
 * Supports `?category=`, `?brand=`, `?search=` and `?limit=`.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));

    const products = await listProducts({
      category: searchParams.get("category") || undefined,
      brand: searchParams.get("brand") || undefined,
      search: searchParams.get("search") || undefined,
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("GET /api/products error:", describeError(error));
    return NextResponse.json({ error: "Could not load products" }, { status: 500 });
  }
}

/** POST /api/products — admin only. */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded || decoded.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = toProductInput(await request.json());
    if (!input.name || !input.slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    await createProduct(input);

    // The homepage is an ISR page; show the new product straight away.
    revalidatePath("/");

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    // 23505 = unique_violation, i.e. the slug is already taken.
    const message = describeError(error);
    console.error("POST /api/products error:", message);
    if (message.includes("23505")) {
      return NextResponse.json({ error: "That slug is already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create product" }, { status: 500 });
  }
}