/**
 * Razorpay integration.
 *
 * Uses Razorpay's REST API directly with `fetch` rather than the `razorpay` npm package, so
 * the project gains no new dependency. The browser side loads the official
 * `checkout.js` script (see `app/checkout/page.tsx`).
 *
 * Required environment variables:
 *   RAZORPAY_KEY_ID      — safe to expose to the browser
 *   RAZORPAY_KEY_SECRET  — server only, never sent to the client
 *
 * With no keys configured the checkout page still renders, but payment is disabled rather
 * than silently failing at the last step.
 */

import crypto from "crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export function getRazorpayCredentials() {
  const key_id = process.env.RAZORPAY_KEY_ID || "";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "";
  return {
    keyId: key_id,
    keySecret: key_secret,
    configured: Boolean(key_id && key_secret),
  };
}

export function isRazorpayConfigured() {
  return getRazorpayCredentials().configured;
}

/**
 * Razorpay amounts are in the smallest currency unit — paise for INR. Guards against a
 * fractional or negative amount reaching the gateway.
 */
export function toPaise(amount: number): number {
  const paise = Math.round(Number(amount) * 100);
  if (!Number.isFinite(paise) || paise <= 0) {
    throw new Error("Order amount must be greater than zero");
  }
  return paise;
}

type CreateRazorpayOrderInput = {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
};

/** Creates a Razorpay order. Throws if the gateway rejects the request. */
export async function createRazorpayOrder({
  amountInPaise,
  receipt,
  notes,
}: CreateRazorpayOrderInput): Promise<{ id: string; amount: number; currency: string }> {
  const { keyId, keySecret } = getRazorpayCredentials();

  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      // Razorpay expects HTTP Basic auth with the key id as username and secret as password.
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${detail}`);
  }

  return (await res.json()) as { id: string; amount: number; currency: string };
}

/**
 * Razorpay ids are `order_` / `pay_` followed by an opaque alphanumeric string.
 *
 * Validating the shape before signing is defence in depth: the signature is an HMAC over
 * `order_id|payment_id`, so without this check a value containing a `|` would be ambiguous
 * against the separator. It is not exploitable in practice, because Razorpay only signs ids
 * in this format and the server re-fetches the order from Razorpay by id afterwards — but
 * rejecting malformed ids removes the ambiguity entirely.
 */
const ORDER_ID_RE = /^order_[A-Za-z0-9_]+$/;
const PAYMENT_ID_RE = /^pay_[A-Za-z0-9_]+$/;

export function isValidRazorpayOrderId(id: unknown): boolean {
  return typeof id === "string" && ORDER_ID_RE.test(id);
}

export function isValidRazorpayPaymentId(id: unknown): boolean {
  return typeof id === "string" && PAYMENT_ID_RE.test(id);
}

/**
 * Verifies the signature Razorpay returns after a successful payment.
 *
 * This is the security-critical step: without it, a client could POST any payment id and
 * have an order marked as paid. The signature is an HMAC over `order_id|payment_id` keyed
 * with the secret, so only Razorpay (and the server) can produce a matching value.
 *
 * Returns false for anything malformed instead of throwing, so a hostile payload produces a
 * clean 400 rather than a 500.
 */
export function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  razorpayOrderId: unknown;
  razorpayPaymentId: unknown;
  razorpaySignature: unknown;
}): boolean {
  const { keySecret } = getRazorpayCredentials();
  if (!keySecret) return false;

  if (!isValidRazorpayOrderId(razorpayOrderId)) return false;
  if (!isValidRazorpayPaymentId(razorpayPaymentId)) return false;
  if (typeof razorpaySignature !== "string" || razorpaySignature.length === 0) return false;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const received = Buffer.from(razorpaySignature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  // Length check first: timingSafeEqual throws on mismatched buffer lengths.
  if (received.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(received, expectedBuf);
}

/** Fetches an order's current status from Razorpay, used to confirm a payment server-side. */
export async function fetchRazorpayOrder(
  razorpayOrderId: string
): Promise<{ id: string; status: string; amount: number; paid?: boolean } | null> {
  const { keyId, keySecret } = getRazorpayCredentials();

  const res = await fetch(`${RAZORPAY_API}/orders/${razorpayOrderId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
  });

  if (!res.ok) return null;
  return (await res.json()) as { id: string; status: string; amount: number; paid?: boolean };
}