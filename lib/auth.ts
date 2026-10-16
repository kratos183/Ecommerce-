import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

export function generateToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    return decoded;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Resolves the signed-in user for a request, reading the `token` cookie or an
 * `Authorization: Bearer` header.
 *
 * The role is re-read from the database rather than trusted from the JWT payload. A token
 * is valid for 7 days, so trusting its embedded role means a promoted or demoted user keeps
 * their old privileges for up to a week. Prefer this over `verifyToken(...)` for any route
 * that makes an authorization decision.
 *
 * Returns null when there is no valid session, or when the account no longer exists.
 */
export async function getSessionUser(
  request: NextRequest
): Promise<{ id: number; role: string } | null> {
  const token = request.cookies.get("token")?.value ?? getTokenFromRequest(request);
  const decoded = verifyToken(token || "");
  if (!decoded) return null;

  const result = await db()
    .from("users")
    .select("id, role")
    .eq("id", decoded.userId)
    .maybeSingle();

  if (result.error || !result.data) return null;
  return { id: Number(result.data.id), role: result.data.role };
}
