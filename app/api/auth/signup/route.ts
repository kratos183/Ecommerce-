import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { describeError, num } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Supabase/PostgREST matches `eq` case-sensitively, so normalise here rather
    // than letting Bob@example.com and bob@example.com become two accounts.
    const normalisedEmail = String(email).trim().toLowerCase();

    const existing = await db()
      .from("users")
      .select("id")
      .eq("email", normalisedEmail)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    // Always "user". A signup request is unauthenticated, so trusting a `role`
    // field from it would let anyone mint an admin account. Promotion happens
    // through the admin dashboard, which re-checks the caller's role.
    //
    // The unused `role` from the destructured body is intentionally ignored.
    void role;
    const userRole = "user";

    const created = await db()
      .from("users")
      .insert({ name, email: normalisedEmail, password: hashedPassword, role: userRole })
      .select("id")
      .single();

    if (created.error) throw created.error;

    const userId = num(created.data.id);
    const token = generateToken(userId, userRole);

    const response = NextResponse.json({
      message: "Account created successfully",
      user: { id: userId, name, email: normalisedEmail, role: userRole },
      token,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Signup error:", describeError(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}