import { NextResponse, NextRequest } from "next/server";

/**
 * Guards the signed-in and admin routes.
 *
 * This runs on the edge, so it cannot use `jsonwebtoken` or hit the database —
 * it only checks that a token exists, has not expired, and carries the right role
 * in its payload. That is a routing shortcut, not a security boundary: every
 * protected API route re-reads the role from Postgres via `getSessionUser()`, so
 * a forged payload still buys nothing.
 *
 * (Renamed from `middleware.ts` — that convention is deprecated in Next.js 16.)
 */
function verifyTokenEdge(token: string): { userId: number; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ["/user-dashboard", "/Admin-Dashboard", "/checkout"];
  const adminPaths = ["/Admin-Dashboard"];

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const decoded = verifyTokenEdge(token);
  if (!decoded) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAdmin = decoded.role === "admin";

  // An admin has no customer dashboard to go to — they use the admin one. Sending
  // them to the customer view would show them their own (empty) orders instead of
  // the store's, which is a confusing dead end rather than a useful page.
  if (isAdmin && pathname.startsWith("/user-dashboard")) {
    return NextResponse.redirect(new URL("/Admin-Dashboard", request.url));
  }

  if (adminPaths.some((path) => pathname.startsWith(path)) && !isAdmin) {
    return NextResponse.redirect(new URL("/user-dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user-dashboard/:path*", "/Admin-Dashboard/:path*", "/checkout/:path*"],
};

