import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { describeError } from "@/lib/supabase";

const ROLES = new Set(["user", "admin"]);
const STATUSES = new Set(["active", "blocked"]);

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return false;
  const decoded = verifyToken(token);
  return decoded?.role === "admin";
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body: { role?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Whitelist the columns rather than spreading the body into `.update()` — that
  // would let a crafted request rewrite `password` or `email` through this route.
  const updates: { role?: string; status?: string } = {};
  if (body.role) {
    if (!ROLES.has(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates.role = body.role;
  }
  if (body.status) {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const { error } = await db().from("users").update(updates).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`PATCH /api/admin/users/${id} error:`, describeError(error));
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    // customer_orders, favorites and addresses all cascade from users, so the
    // customer's history goes with the account in one statement.
    const { error } = await db().from("users").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/admin/users/${id} error:`, describeError(error));
    return NextResponse.json({ error: "Could not delete user" }, { status: 500 });
  }
}