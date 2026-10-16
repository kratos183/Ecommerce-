import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { describeError, num } from "@/lib/supabase";

const PUBLIC_COLUMNS = "id, name, email, role";

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const result = await db()
      .from("users")
      .select(PUBLIC_COLUMNS)
      .eq("id", decoded.userId)
      .maybeSingle();

    if (result.error) throw result.error;
    if (!result.data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: { ...result.data, id: num(result.data.id) },
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", describeError(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/auth/me — update the signed-in customer's own details.
 *
 * The `users` table has no `phone` column of its own, so a phone number is stored on the
 * address book instead; this route only writes `name` and `email`. Email is re-validated
 * for uniqueness because it is the login identifier.
 *
 * The JWT embeds only `userId`, so changing these details does not require a re-login.
 */
export async function PATCH(request: NextRequest) {
  const token =
    request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");
  const decoded = token ? verifyToken(token) : null;
  if (!decoded) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, string> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields", errors: { name: "Name must be at least 2 characters" } },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields", errors: { email: "Enter a valid email address" } },
        { status: 400 }
      );
    }

    // Postgres raises a unique violation rather than returning no rows when two
    // requests race past this check, so 409 is also the fallback error below.
    const taken = await db()
      .from("users")
      .select("id")
      .eq("email", email)
      .neq("id", decoded.userId)
      .maybeSingle();

    if (taken.error) throw taken.error;
    if (taken.data) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields", errors: { email: "That email is already registered" } },
        { status: 409 }
      );
    }
    updates.email = email;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const result = await db()
      .from("users")
      .update(updates)
      .eq("id", decoded.userId)
      .select(PUBLIC_COLUMNS)
      .single();

    if (result.error) throw result.error;
    return NextResponse.json({ success: true, user: result.data });
  } catch (error) {
    const message = describeError(error);
    console.error("PATCH /api/auth/me error:", message);
    if (message.includes("23505")) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields", errors: { email: "That email is already registered" } },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}