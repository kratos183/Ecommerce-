import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { orderFunctionError } from "@/lib/order-errors";
import { asRows, describeError, num } from "@/lib/supabase";

/** Human-friendly, collision-resistant order reference. */
function generateOrderNo(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `OB-${stamp}${rand}`;
}

type IncomingItem = { productId?: number; slug?: string; quantity?: number };

/**
 * Collapses the cart into unique `{ product_id, quantity }` lines for the database.
 * Runs before anything is written so the customer is never charged for the same
 * product twice.
 */
function normaliseItems(incoming: IncomingItem[]) {
  const wanted = new Map<number, number>();

  for (const raw of incoming) {
    const productId = Number(raw.productId);
    if (!Number.isFinite(productId) || productId <= 0) continue;

    const quantity = Math.min(99, Math.max(1, Math.floor(Number(raw.quantity) || 1)));
    wanted.set(productId, Math.min(99, (wanted.get(productId) ?? 0) + quantity));
  }

  return [...wanted.entries()].map(([product_id, quantity]) => ({ product_id, quantity }));
}

/**
 * GET /api/orders — the signed-in customer's orders, newest first, with their line items.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const ordersResult = await db()
      .from("customer_orders")
      .select("*")
      .eq("user_id", session.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (ordersResult.error) throw ordersResult.error;

    const orders = asRows<Record<string, unknown>>(ordersResult.data);
    if (orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const itemsResult = await db()
      .from("customer_order_items")
      .select("*")
      .in("order_id", orders.map((order) => num(order.id)))
      .order("id", { ascending: true });

    if (itemsResult.error) throw itemsResult.error;

    // One query per order would be N+1; fetch every line at once and group in memory.
    const items = asRows<Record<string, unknown>>(itemsResult.data);
    const byOrder = new Map<number, Record<string, unknown>[]>();
    for (const item of items) {
      const orderId = num(item.order_id);
      byOrder.set(orderId, [...(byOrder.get(orderId) ?? []), item]);
    }

    const withItems = orders.map((order) => ({
      ...order,
      subtotal: num(order.subtotal),
      shipping: num(order.shipping),
      total: num(order.total),
      items: (byOrder.get(num(order.id)) ?? []).map((item) => ({
        ...item,
        unit_price: num(item.unit_price),
        line_total: num(item.line_total),
      })),
    }));

    return NextResponse.json({ orders: withItems });
  } catch (error) {
    console.error("GET /api/orders error:", describeError(error));
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }
}

/**
 * POST /api/orders — place an order without taking payment at the moment of
 * checkout. Used by cash on delivery and by the WhatsApp quote flow.
 *
 * Prices and product names are resolved inside the `place_customer_order` Postgres
 * function (supabase/schema.sql), never taken from the request body, so a tampered
 * client cannot set its own totals. The function also wraps the order and its line
 * items in one transaction, so a failure part-way through cannot leave an order
 * without its items.
 *
 * This endpoint deliberately does NOT mark an order paid. A cash-on-delivery
 * order stays `pending` until someone hands over the money; marking it paid here
 * would let a customer report an order as settled that was never collected.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    items?: IncomingItem[];
    address?: Record<string, string>;
    notes?: string;
    paymentMethod?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const incoming = Array.isArray(body.items) ? body.items : [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }
  if (incoming.length > 50) {
    return NextResponse.json({ error: "Too many items in one order" }, { status: 400 });
  }

  const items = normaliseItems(incoming);
  if (items.length === 0) {
    return NextResponse.json({ error: "No valid items in cart" }, { status: 400 });
  }

  const { data, error } = await db().rpc("place_customer_order", {
    p_user_id: session.id,
    p_order_no: generateOrderNo(),
    p_items: items,
    p_address: body.address ?? {},
    p_notes: body.notes ?? "",
    // Whitelisted here as well as inside the function. The function is the real
    // boundary — this just avoids sending a value we already know is wrong.
    p_payment_method: body.paymentMethod === "cod" ? "cod" : "whatsapp",
  });

  if (error) return orderFunctionError(error);

  return NextResponse.json({ success: true, order: data }, { status: 201 });
}