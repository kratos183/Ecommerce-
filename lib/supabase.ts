/**
 * Supabase (Postgres) data access.
 *
 * This replaces the old `mysql2` pool. The shape of the app changed with it:
 *
 *   • There is no `query(sql, params)` any more. Arbitrary SQL from a route
 *     handler is how injection bugs happen, so everything goes through PostgREST's
 *     query builder (`.from("products").select(...)`) or a vetted Postgres
 *     function (`.rpc(...)`).
 *
 *   • The REST layer has no multi-statement transaction. Anything that must be
 *     all-or-nothing — placing an order, saving an address — lives in a function
 *     in `supabase/schema.sql` and is called with `.rpc(...)`.
 *
 *   • `numeric` columns arrive as strings over PostgREST. `toProduct()` and
 *     friends normalise them to numbers; use those rather than reading `price`
 *     straight off a row.
 *
 * WHY A SERVER-ONLY CLIENT
 * The service-role key bypasses row-level security, so it must never reach the
 * browser. `createClient` here is only imported from Server Components and route
 * handlers — never add it to a `"use client"` file. Client-side data goes over
 * the app's own `/api/*` routes instead.
 */

/**
 * Coerces a Postgres value to a number.
 *
 * Typed as `unknown` on purpose: PostgREST returns `numeric` columns as strings,
 * but the row itself is untyped here, so callers pass whatever the query builder
 * gave back. `Number()` handles both, and the `isFinite` check catches `null`
 * (which `Number(null)` turns into a misleading 0) and `NaN`.
 */
export function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Postgres has no single JSON column type; jsonb can arrive as an object or a string. */
export function json<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

/**
 * PostgREST rows are untyped unless the project has generated database types
 * (`supabase gen types typescript`). Casting through `unknown` keeps one
 * `as` out of every call site, and keeps this one function as the place to
 * switch to generated types later.
 */
export function asRows<T>(value: unknown): T[] {
  return (value as T[]) ?? [];
}

export function asRow<T>(value: unknown): T {
  return value as T;
}

/**
 * Turns a PostgREST error into a message worth showing a developer in the
 * terminal. PostgREST errors arrive as `{}` for network failures, so the raw
 * object alone is not much use in a log line.
 */
export function describeError(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.code, e.message, e.details, e.hint].filter(Boolean).join(" — ") || "Unknown error";
}