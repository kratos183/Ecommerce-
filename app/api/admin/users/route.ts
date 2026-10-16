import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { describeError, num } from "@/lib/supabase";

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return false;
  const decoded = verifyToken(token);
  return decoded?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await db()
      .from("users")
      .select("id, name, email, role, status, created_at")
      .order("id", { ascending: false });

    if (result.error) throw result.error;

    return NextResponse.json({
      users: (result.data ?? []).map((user) => ({ ...user, id: num(user.id) })),
    });
  } catch (error) {
    console.error("GET /api/admin/users error:", describeError(error));
    return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  }
}