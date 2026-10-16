/**
 * The shape of a customer's own data, and how it is rendered for the prompt.
 *
 * Split from `personal.ts` because rendering is pure: it has no database
 * dependency, so scripts and tests can use it without pulling in the
 * service-role client (which is marked `server-only` and refuses to load outside
 * a server module). `personal.ts` re-exports both, so importing from either gives
 * the same thing.
 */

import { inr } from "@/lib/site";

export type PersonalBrief = {
  hasOrders: boolean;
  orders: {
    orderNo: string;
    date: string;
    status: string;
    total: number;
    items: string[];
  }[];
  wishlist: { name: string; slug: string; price: number }[];
  addresses: string[];
  stats: {
    totalOrders: number;
    activeOrders: number;
    lifetimeValue: number;
  };
};

export const EMPTY_BRIEF: PersonalBrief = {
  hasOrders: false,
  orders: [],
  wishlist: [],
  addresses: [],
  stats: { totalOrders: 0, activeOrders: 0, lifetimeValue: 0 },
};

/**
 * Renders the brief as the block injected into the system prompt.
 *
 * Kept short on purpose. This text is prepended to every request, so a customer
 * with twelve orders must not blow the context window or slow every answer down.
 */
export function renderPersonalBrief(brief: PersonalBrief): string {
  if (!brief.hasOrders && brief.wishlist.length === 0) {
    return "This customer has no orders and no saved wishlist yet.";
  }

  const lines: string[] = [];

  lines.push(
    `Orders placed: ${brief.stats.totalOrders}. ` +
      `Active: ${brief.stats.activeOrders}. ` +
      `Lifetime spend: ${inr(brief.stats.lifetimeValue)}.`
  );

  for (const order of brief.orders) {
    lines.push(
      `- ${order.orderNo} · ${order.date} · ${order.status} · ${inr(order.total)}` +
        (order.items.length ? `\n  items: ${order.items.join(", ")}` : "")
    );
  }

  if (brief.wishlist.length) {
    lines.push(`Wishlist: ${brief.wishlist.map((item) => item.name).join(", ")}`);
  }

  if (brief.addresses.length) {
    lines.push(`Saved addresses: ${brief.addresses.join("; ")}`);
  }

  return lines.join("\n");
}

/** `2026-04-18T09:12:00+00:00` → `18 Apr 2026`. */
export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}