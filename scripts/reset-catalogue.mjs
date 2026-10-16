/**
 * Deletes every product from the connected Supabase database.
 *
 *   npm run reset:catalogue              # asks for confirmation
 *   npm run reset:catalogue -- --yes     # no prompt, for scripts
 *   npm run reset:catalogue -- --dry-run # report what would be deleted
 *
 * This is the same work as supabase/reset-catalogue.sql, but runnable from the
 * terminal against the live database instead of pasted into the SQL editor.
 *
 * ── WHAT IT PRESERVES ────────────────────────────────────────────────────────
 * Customers, orders, order items, addresses and the AI index are left alone.
 * Order items keep their denormalised product name and price, so past invoices
 * still read correctly — only the live link to a product is cleared, which is
 * what you want: an invoice should not change because someone retitled a
 * product. Favourites are deleted, because every entry would dangle.
 *
 * ── WHY THIS IS NOT A NO-OP ──────────────────────────────────────────────────
 * supabase/seed.sql also starts with a DELETE. Running that is usually all you
 * need, because it deletes and re-inserts in one go. This script exists for the
 * case where you want the catalogue empty *without* immediately reloading it —
 * so you can see whether the storefront handles zero products before committing
 * to a reload.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const assumeYes = args.includes("--yes") || args.includes("-y");

/** Reads .env.local without needing dotenv. */
function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "");
      if (value) process.env[match[1]] ??= value;
    }
  } catch {
    // No .env.local — fall back to whatever the shell already exported.
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Could not find NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "They should be in .env.local — see SETUP.md section 1.5."
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Counts a table, returning null rather than throwing if RLS hides it. */
async function count(table) {
  const { count: n, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true });
  return error ? null : (n ?? 0);
}

const before = {
  products: await count("products"),
  orders: await count("customer_orders"),
  items: await count("customer_order_items"),
  users: await count("users"),
  favorites: await count("favorites"),
};

console.log("\n  Obryn — delete the catalogue\n");
const row = (label, value, note = "") =>
  console.log(`  ${label.padEnd(13)}${String(value).padStart(5)}${note ? `   ${note}` : ""}`);

row("products", before.products);
row("orders", before.orders, "(kept)");
row("order items", before.items, "(kept, product links cleared)");
row("customers", before.users, "(kept)");
row("favourites", before.favorites, "(deleted)");
console.log();

if (before.products === 0) {
  console.log("  Nothing to delete.\n");
  process.exit(0);
}

if (dryRun) {
  console.log("  --dry-run: no changes made.\n");
  process.exit(0);
}

if (!assumeYes) {
  // A TTY prompt, rather than an unconditional delete. This is destructive and
  // irreversible for anything added through the admin dashboard.
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `  Delete ${before.products} products? This cannot be undone. [y/N] `
  );
  rl.close();

  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("\n  Cancelled.\n");
    process.exit(1);
  }
}

// Order first: it references products, and the point is to null those links
// rather than let them cascade away.
const unlink = await db
  .from("customer_order_items")
  .update({ product_id: null }, { ne: { product_id: null } });

if (unlink.error) {
  console.error(`\n  Could not clear order item links: ${unlink.error.message}\n`);
  process.exit(1);
}

const delProducts = await db.from("products").delete().neq("id", 0);
if (delProducts.error) {
  console.error(`\n  Could not delete products: ${delProducts.error.message}\n`);
  process.exit(1);
}

const delFavourites = await db.from("favorites").delete().neq("id", 0);
if (delFavourites.error) {
  console.error(`\n  Products deleted, but favourites could not be cleared: ${delFavourites.error.message}\n`);
  process.exit(1);
}

const after = {
  products: await count("products"),
  orders: await count("customer_orders"),
  favorites: await count("favorites"),
};

console.log(`\n  Done.  products ${before.products} -> ${after.products}, orders still ${after.orders}.`);
console.log("  Reload the catalogue with:  npm run seed\n");