import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { orderFunctionError } from "@/lib/order-errors";
import {
  verifyRazorpaySignature,
  fetchRazorpayOrder,
  isValidRazorpayOrderId,
  isValidRazorpayPaymentId,
} from "@/lib/payments";
import { describeError, num } from "@/lib/supabase";

/** Same shape as /api/orders. Kept local so a Razorpay order can be recognised as such. */
function generateOrderNo(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `OB-${stamp}${rand}`;
}

/**
 * POST /api/payments/verify — confirm a payment and record the order.
 *
 * Called from the Razorpay success handler. The HMAC signature check is what makes this
 * trustworthy: without it a caller could post any payment id and mark an order paid. The
 * customer order is written only after the signature verifies.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    items?: Array<{ productId?: number; quantity?: number }>;
    address?: Record<string, string>;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  // Reject malformed ids up front, before the signature check and any database work.
  if (!isValidRazorpayOrderId(razorpayOrderId) || !isValidRazorpayPaymentId(razorpayPaymentId)) {
    return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
  }

  if (!verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })) {
    return NextResponse.json(
      { error: "Payment verification failed. If you were charged, contact support." },
      { status: 400 }
    );
  }

  try {
    // Idempotency: Razorpay retries, and a double-tap must not create two orders.
    // `razorpay_order_id` is UNIQUE in Postgres, so even a concurrent double-insert
    // is rejected by the database rather than producing a duplicate order.
    const existing = await db()
      .from("customer_orders")
      .select("id, order_no, total, status, payment_status")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (existing.data) {
      return NextResponse.json({
        success: true,
        alreadyRecorded: true,
        order: existing.data,
      });
    }

    // Independently confirm with Razorpay that the order was actually paid. The signature
    // proves the response came from Razorpay; this proves the payment succeeded.
    const remoteOrder = await fetchRazorpayOrder(razorpayOrderId);
    if (!remoteOrder) {
      return NextResponse.json(
        { error: "Could not confirm the payment with Razorpay" },
        { status: 502 }
      );
    }
    if (remoteOrder.status !== "paid" && !remoteOrder.paid) {
      return NextResponse.json(
        { error: `Payment is not complete (status: ${remoteOrder.status})` },
        { status: 409 }
      );
    }

    // ── Rebuild the order from database prices ───────────────────────────────
    const incoming = Array.isArray(body.items) ? body.items : [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: "No items to record" }, { status: 400 });
    }

    const wanted = new Map<number, number>();
    for (const raw of incoming) {
      const productId = Number(raw.productId);
      if (!Number.isFinite(productId) || productId <= 0) continue;
      const quantity = Math.min(99, Math.max(1, Math.floor(Number(raw.quantity) || 1)));
      wanted.set(productId, Math.min(99, (wanted.get(productId) ?? 0) + quantity));
    }

    if (wanted.size === 0) {
      return NextResponse.json({ error: "No valid items to record" }, { status: 400 });
    }

    const chargedInPaise = num(remoteOrder.amount);
    const chargedInRupees = chargedInPaise / 100;

    // `record_paid_order` re-reads prices from `products` and refuses to record the
    // order if they no longer add up to what Razorpay charged.
    const { data: order, error } = await db().rpc("record_paid_order", {
      p_user_id: session.id,
      p_order_no: generateOrderNo(),
      p_items: [...wanted.entries()].map(([product_id, quantity]) => ({
        product_id,
        quantity,
      })),
      p_address: body.address ?? {},
      p_notes: body.notes ?? "",
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
      p_charged_total: chargedInRupees,
    });

    if (error) return orderFunctionError(error);

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    console.error("POST /api/payments/verify error:", describeError(error));
    return NextResponse.json(
      {
        error:
          "Your payment succeeded but we could not record the order. Please contact support with your payment id.",
      },
      { status: 500 }
    );
  }
}