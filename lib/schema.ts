/**
 * Schema check.
 *
 * This used to create the customer tables on demand with `CREATE TABLE IF NOT
 * EXISTS`, backfilling columns an older install was missing. That is no longer
 * possible or desirable: Supabase's REST layer cannot run DDL, and schema changes
 * belong in version control and migrations rather than in request handlers.
 *
 * The tables now live in `supabase/schema.sql`, applied through the Supabase SQL
 * editor or `psql`. `assertSchemaReady()` turns "you forgot to run the schema"
 * into a message that says so, instead of a wall of PostgREST errors about a
 * missing relation.
 */

import { db } from "./db";
import { describeError } from "./supabase";

/** Tables the running app expects to exist. */
export const REQUIRED_TABLES = [
  "users",
  "products",
  "customer_orders",
  "customer_order_items",
  "favorites",
  "addresses",
] as const;

/**
 * Throws unless every table in {@link REQUIRED_TABLES} is present.
 *
 * @throws with setup instructions when Supabase is unconfigured or the schema has
 *         not been applied. The message is safe to log.
 */
export async function assertSchemaReady(): Promise<void> {
  const { error } = await db().from("products").select("id").limit(1);

  if (!error) return;

  const message = describeError(error);
  const missing = /relation "([^"]+)" does not exist/.exec(message);

  throw new Error(
    missing
      ? `Supabase table "${missing[1]}" does not exist. Apply supabase/schema.sql ` +
        `(then supabase/seed.sql) in the Supabase SQL editor, and reload this page.`
      : `Supabase schema check failed: ${message}`
  );
}