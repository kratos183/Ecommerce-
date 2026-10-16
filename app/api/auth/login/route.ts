import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { describeError, num } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await db()
      .from("users")
      .select("id, name, email, role, status, password")
      .eq("email", String(email).trim().toLowerCase())
      .maybeSingle();

    if (result.error) throw result.error;

    const user = result.data;
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status === "blocked") {
      return NextResponse.json(
        { error: "Your account has been blocked. Contact support." },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(String(password), user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const id = num(user.id);
    const token = generateToken(id, user.role);

    const response = NextResponse.json({
      message: "Login successful",
      user: { id, name: user.name, email: user.email, role: user.role },
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
    console.error("Login error:", describeError(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}