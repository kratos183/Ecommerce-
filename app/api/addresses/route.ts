import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { validateAddress, type AddressInput } from "@/lib/validation";
import { describeError, num } from "@/lib/supabase";

/** GET /api/addresses — the signed-in customer's saved addresses, default first. */
export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const result = await db()
      .from("addresses")
      .select("*")
      .eq("user_id", session.id)
      .order("is_default", { ascending: false })
      .order("id", { ascending: false });

    if (result.error) throw result.error;

    return NextResponse.json({ addresses: result.data ?? [] });
  } catch (error) {
    console.error("GET /api/addresses error:", describeError(error));
    return NextResponse.json({ error: "Could not load addresses" }, { status: 500 });
  }
}

/**
 * POST /api/addresses — save a new address.
 *
 * The first address a customer saves is always promoted to default, otherwise checkout would
 * have nothing to preselect. That promotion, and clearing the flag from any previous default,
 * happens together inside `upsert_address` so two concurrent saves cannot leave two defaults.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Partial<AddressInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const errors = validateAddress(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields", errors },
      { status: 400 }
    );
  }

  try {
    const { data: addressId, error } = await db().rpc("upsert_address", {
      p_user_id: session.id,
      p_id: null,
      p_label: String(body.label ?? "Home").trim().slice(0, 60),
      p_full_name: String(body.fullName).trim(),
      p_phone: String(body.phone).trim(),
      p_line1: String(body.line1).trim(),
      p_line2: String(body.line2 ?? "").trim(),
      p_city: String(body.city).trim(),
      p_state: String(body.state).trim(),
      p_pincode: String(body.pincode).trim(),
      p_make_default: body.isDefault === true,
    });

    if (error) throw error;

    const created = await db()
      .from("addresses")
      .select("*")
      .eq("id", num(addressId))
      .maybeSingle();

    if (created.error) throw created.error;

    return NextResponse.json({ success: true, address: created.data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/addresses error:", describeError(error));
    return NextResponse.json({ error: "Could not save address" }, { status: 500 });
  }
}