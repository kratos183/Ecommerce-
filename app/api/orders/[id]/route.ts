import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { describeError, num } from "@/lib/supabase";

/** Statuses a customer is allowed to move an order to themselves. */
const CUSTOMER_CANCELLABLE = new Set(["pending", "processing"]);

/** GET /api/orders/[id] — a single order, scoped to its owner. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const orderResult = await db()
      .from("customer_orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.id)
      .maybeSingle();

    if (orderResult.error) throw orderResult.error;

    const order = orderResult.data;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const itemsResult = await db()
      .from("customer_order_items")
      .select("*")
      .eq("order_id", num(id))
      .order("id", { ascending: true });

    if (itemsResult.error) throw itemsResult.error;

    return NextResponse.json({
      order: {
        ...order,
        subtotal: num(order.subtotal),
        shipping: num(order.shipping),
        total: num(order.total),
        items: (itemsResult.data ?? []).map((item) => ({
          ...item,
          unit_price: num(item.unit_price),
          line_total: num(item.line_total),
        })),
      },
    });
  } catch (error) {
    console.error(`GET /api/orders/${id} error:`, describeError(error));
    return NextResponse.json({ error: "Could not load order" }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[id] — cancel an order.
 *
 * A customer may only cancel while the order is still pending or processing; once it has
 * shipped the request is refused so the customer contacts support instead.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  try {
    const existing = await db()
      .from("customer_orders")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", session.id)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (!existing.data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!CUSTOMER_CANCELLABLE.has(existing.data.status)) {
      return NextResponse.json(
        {
          error: `An order that is already ${existing.data.status} cannot be cancelled online.`,
        },
        { status: 409 }
      );
    }

    // Scoped by user_id as well as id, so the check above and the write cannot
    // disagree about which order is being cancelled.
    const { error } = await db()
      .from("customer_orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", session.id);

    if (error) throw error;

    return NextResponse.json({ success: true, status: "cancelled" });
  } catch (error) {
    console.error(`PATCH /api/orders/${id} error:`, describeError(error));
    return NextResponse.json({ error: "Could not cancel order" }, { status: 500 });
  }
}