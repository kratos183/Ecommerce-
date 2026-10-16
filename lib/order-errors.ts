/**
 * Error translation for the Postgres order functions.
 *
 * The order functions in `supabase/schema.sql` run in one transaction, which
 * PostgREST's REST layer cannot do. They therefore report failures by raising an
 * exception whose message begins with a machine-readable code, and this module
 * turns that message back into the HTTP response the browser expects.
 *
 * Lives here rather than in a `route.ts` file because Next.js route modules may
 * only export HTTP methods and route config.
 */

import { NextResponse } from "next/server";

export function orderFunctionError(error: { message?: string }) {
  const message = error?.message ?? "";

  if (message.startsWith("PRODUCT_UNAVAILABLE")) {
    return NextResponse.json(
      { error: "One or more items are no longer available" },
      { status: 409 }
    );
  }

  if (message.startsWith("PRICED_ON_REQUEST")) {
    const name = message.slice("PRICED_ON_REQUEST:".length);
    return NextResponse.json(
      {
        error: `"${name}" is priced on request. Please contact us to order it.`,
        code: "on_request",
      },
      { status: 409 }
    );
  }

  if (message.startsWith("AMOUNT_MISMATCH")) {
    return NextResponse.json(
      {
        error:
          "The order total changed since checkout. Nothing has been recorded — please start the checkout again.",
        code: "amount_mismatch",
      },
      { status: 409 }
    );
  }

  if (message.startsWith("NO_VALID_ITEMS")) {
    return NextResponse.json({ error: "No valid items in cart" }, { status: 400 });
  }

  console.error("Order function error:", message);
  return NextResponse.json({ error: "Could not place order" }, { status: 500 });
}