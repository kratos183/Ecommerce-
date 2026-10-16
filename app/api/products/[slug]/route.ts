import { NextResponse, NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyToken } from "@/lib/auth";
import { deleteProduct, getProductBySlug, toProductInput, updateProduct } from "@/lib/products";
import { describeError } from "@/lib/supabase";

/** GET /api/products/[slug] — a single product. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const product = await getProductBySlug(slug);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    console.error(`GET /api/products/${slug} error:`, describeError(error));
    return NextResponse.json({ error: "Could not load product" }, { status: 500 });
  }
}

/** DELETE /api/products/[slug] — admin only. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = request.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded || decoded.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  try {
    await deleteProduct(slug);
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/products/${slug} error:`, describeError(error));
    return NextResponse.json({ error: "Could not delete product" }, { status: 500 });
  }
}

/** PUT /api/products/[slug] — admin only. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = request.cookies.get("token")?.value;
  const decoded = token ? verifyToken(token) : null;
  if (!decoded || decoded.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  try {
    const input = toProductInput(await request.json());
    if (!input.name || !input.slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    await updateProduct(slug, input);
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = describeError(error);
    console.error(`PUT /api/products/${slug} error:`, message);
    if (message.includes("23505")) {
      return NextResponse.json({ error: "That slug is already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update product" }, { status: 500 });
  }
}