import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { validateAddress, type AddressInput } from "@/lib/validation";
import { describeError, num } from "@/lib/supabase";

/** PATCH /api/addresses/[id] — update or set as default. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  let body: Partial<AddressInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const existingResult = await db()
      .from("addresses")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.id)
      .maybeSingle();

    if (existingResult.error) throw existingResult.error;
    const existing = existingResult.data;
    if (!existing) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Merge onto the stored row so a partial update (e.g. just flipping the default flag)
    // still validates against the complete address.
    const merged = {
      label: body.label ?? existing.label,
      fullName: body.fullName ?? existing.full_name,
      phone: body.phone ?? existing.phone,
      line1: body.line1 ?? existing.line1,
      line2: body.line2 ?? existing.line2,
      city: body.city ?? existing.city,
      state: body.state ?? existing.state,
      pincode: body.pincode ?? existing.pincode,
      isDefault: body.isDefault,
    };

    // `?only=default` is a lightweight "make this my default" action from the address list.
    const onlyDefault = new URL(request.url).searchParams.get("only") === "default";
    if (!onlyDefault) {
      const errors = validateAddress(merged);
      if (Object.keys(errors).length > 0) {
        return NextResponse.json(
          { error: "Please fix the highlighted fields", errors },
          { status: 400 }
        );
      }
    }

    const makeDefault =
      onlyDefault || body.isDefault === true
        ? true
        : body.isDefault === false
          ? false
          : Boolean(existing.is_default);

    const { error } = await db().rpc("upsert_address", {
      p_user_id: session.id,
      p_id: num(id),
      p_label: String(merged.label ?? "Home").trim().slice(0, 60),
      p_full_name: String(merged.fullName).trim(),
      p_phone: String(merged.phone).trim(),
      p_line1: String(merged.line1).trim(),
      p_line2: String(merged.line2 ?? "").trim(),
      p_city: String(merged.city).trim(),
      p_state: String(merged.state).trim(),
      p_pincode: String(merged.pincode).trim(),
      p_make_default: makeDefault,
    });

    if (error) throw error;

    const updated = await db()
      .from("addresses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (updated.error) throw updated.error;

    return NextResponse.json({ success: true, address: updated.data });
  } catch (error) {
    console.error(`PATCH /api/addresses/${id} error:`, describeError(error));
    return NextResponse.json({ error: "Could not update address" }, { status: 500 });
  }
}

/** DELETE /api/addresses/[id] */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // `delete_address` also promotes a new default when the one removed was the last,
    // so a customer is never left with an address book that has nothing preselected.
    const { data: affected, error } = await db().rpc("delete_address", {
      p_user_id: session.id,
      p_id: num(id),
    });

    if (error) throw error;

    if (!affected) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/addresses/${id} error:`, describeError(error));
    return NextResponse.json({ error: "Could not delete address" }, { status: 500 });
  }
}