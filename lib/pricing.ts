/**
 * Order totals, shared by the server routes and the browser so the amount a customer sees
 * can never drift from the amount that gets charged.
 *
 * If you change these numbers, change them here only.
 */

export const SHIPPING_FLAT = 499;
export const FREE_SHIPPING_ABOVE = 25000;

export type PricedLine = { unit_price: number; quantity: number };

export type OrderTotals = {
  subtotal: number;
  shipping: number;
  total: number;
  amountToFreeShipping: number;
  qualifiesForFreeShipping: boolean;
};

export function computeTotals(lines: PricedLine[]): OrderTotals {
  const subtotal = lines.reduce((sum, l) => sum + (Number(l.unit_price) || 0) * l.quantity, 0);
  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_ABOVE;
  const shipping = qualifiesForFreeShipping || subtotal === 0 ? 0 : SHIPPING_FLAT;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    amountToFreeShipping: Math.max(0, FREE_SHIPPING_ABOVE - subtotal),
    qualifiesForFreeShipping,
  };
}