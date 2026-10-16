/**
 * Reads the signed-in customer's own data so the assistant can reason over it.
 *
 * WHY THIS IS NOT IN THE VECTOR INDEX
 * Orders change, are personal, and are cheap to read in full — there is no reason
 * to embed them. They are fetched per request, scoped to the authenticated user,
 * and injected as a compact structured brief. That keeps private data out of the
 * knowledge base entirely, keeps answers accurate to the second, and costs no
 * embedding budget.
 *
 * SCOPING
 * Every query filters by `user_id = session.id`. There is no path in this file
 * that reads a customer's orders without an authenticated session, so a prompt
 * injection asking the assistant for "another customer's order" has nothing to
 * find — there is only ever one customer's rows in scope.
 *
 * The brief type and its renderer live in `personal-brief.ts`, which has no
 * database dependency.
 */

import { db } from "@/lib/db";
import { num } from "@/lib/supabase";
import {
  EMPTY_BRIEF,
  formatOrderDate,
  type PersonalBrief,
} from "./personal-brief";

export type { PersonalBrief };
export { EMPTY_BRIEF, renderPersonalBrief } from "./personal-brief";

/** An order counts as active until it is delivered or cancelled. */
const ACTIVE_STATUSES = new Set(["pending", "processing", "shipped"]);

/** How many of each to pull. The prompt only needs recent activity. */
const MAX_ORDERS = 12;
const MAX_WISHLIST = 12;
const MAX_ADDRESSES = 4;

/**
 * Builds the personal brief for one customer.
 *
 * Never throws — a failure here must not stop the assistant answering a product
 * question, so it returns the empty brief instead.
 */
export async function buildPersonalBrief(userId: number): Promise<PersonalBrief> {
  try {
    const [ordersResult, wishlistResult, addressesResult] = await Promise.all([
      db()
        .from("customer_orders")
        .select("id, order_no, status, total, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(MAX_ORDERS),

      db()
        .from("favorites")
        .select("products (id, name, slug, price)")
        .eq("user_id", userId)
        .limit(MAX_WISHLIST),

      db()
        .from("addresses")
        .select("label, city, state")
        .eq("user_id", userId)
        .limit(MAX_ADDRESSES),
    ]);

    const orders = (ordersResult.data ?? []) as Record<string, unknown>[];
    const orderIds = orders.map((order) => num(order.id));

    // Line items live in their own table; fetch them all at once rather than
    // running one query per order.
    const itemsResult = orderIds.length
      ? await db()
          .from("customer_order_items")
          .select("order_id, product_name, quantity, line_total")
          .in("order_id", orderIds)
      : { data: [] as Record<string, unknown>[] | null };

    const itemsByOrder = new Map<number, string[]>();
    for (const item of (itemsResult.data ?? []) as Record<string, unknown>[]) {
      const orderId = num(item.order_id);
      const label = `${String(item.product_name)} (x${num(item.quantity, 1)})`;
      itemsByOrder.set(orderId, [...(itemsByOrder.get(orderId) ?? []), label]);
    }

    return {
      hasOrders: orders.length > 0,
      orders: orders.map((order) => ({
        orderNo: String(order.order_no ?? ""),
        date: formatOrderDate(String(order.created_at ?? "")),
        status: String(order.status ?? ""),
        total: num(order.total),
        items: itemsByOrder.get(num(order.id)) ?? [],
      })),
      wishlist: ((wishlistResult.data ?? []) as Record<string, unknown>[])
        .map((row) => row.products as Record<string, unknown> | null)
        .filter((product): product is Record<string, unknown> => Boolean(product))
        .map((product) => ({
          name: String(product.name ?? ""),
          slug: String(product.slug ?? ""),
          price: num(product.price),
        })),
      addresses: ((addressesResult.data ?? []) as Record<string, unknown>[]).map(
        (address) =>
          `${String(address.label ?? "Address")} — ${String(address.city ?? "")}, ${String(
            address.state ?? ""
          )}`.trim()
      ),
      stats: {
        totalOrders: orders.length,
        activeOrders: orders.filter((order) => ACTIVE_STATUSES.has(String(order.status)))
          .length,
        lifetimeValue: orders
          .filter((order) => String(order.status) !== "cancelled")
          .reduce((sum, order) => sum + num(order.total), 0),
      },
    };
  } catch (error) {
    console.error("buildPersonalBrief() failed:", error);
    return EMPTY_BRIEF;
  }
}