/**
 * Shared storefront identity + contact details.
 *
 * These were previously hardcoded in a dozen places (Navbar, Footer, home page CTAs).
 * Anything customer-facing that needs to reach the business — the WhatsApp order
 * handoff, support links, the AI assistant's answers — should read from here so a
 * detail is changed in one place.
 */

export const SITE = {
  name: "OBRYN",
  /** Used in prose and sentence case: "Obryn". */
  shortName: "Obryn",
  /** The wordmark, rendered as-is in the Navbar. */
  wordmarkLead: "OBRYN",
  wordmarkAccent: "",

  /**
   * One line, used in the top bar and as the page-title suffix. Kept short enough
   * to survive being rendered at 12px next to a phone number.
   */
  tagline: "Technology, delivered across India",

  /**
   * The longer promise, used for meta description and the footer's opening line.
   * Deliberately category-agnostic — Obryn is a general online store, not a
   * specialist in one product.
   */
  pitch:
    "Obryn is a full online store for electronics, computers, audio, cameras, accessories and office equipment — with honest pricing, fast delivery across India and real support when you need it.",

  /** What the business does — drives the footer's opening paragraph. */
  about:
    "Obryn is an online store for electronics, computers, audio, cameras and everyday tech. Buy online with secure payment, free delivery on larger orders, easy returns and a support team that actually answers — plus installation and setup for the displays, computers and studio gear we sell.",

  phoneDisplay: "+91 7992430183",
  /** Digits only, E.164 without the +, for wa.me links. */
  whatsappNumber: "917992430183",
  email: "chandansaricreative@gmail.com",
  address: "Shyamdih, Katras Baazar, Dhanbad, Jharkhand 828114",

  /** City and state on their own, for places that have room for less than the full address. */
  city: "Dhanbad",
  state: "Jharkhand",
  pincode: "828114",

  /** Four promises shown in the trust strip under the hero. */
  highlights: [
    { title: "Free delivery", detail: "On orders over ₹25,000" },
    { title: "Cash on delivery", detail: "Available on eligible orders" },
    { title: "7-day easy returns", detail: "On unused, unboxed products" },
    { title: "24/7 support", detail: "Real people, not a bot" },
  ],
} as const;

/** Builds a wa.me deep link with a pre-filled message. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Formats a number as Indian Rupees, matching the rest of the storefront. */
export function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

/** The percentage saved against an MRP, or null when there is no meaningful discount. */
export function discountPercent(price: number, mrp: number): number | null {
  if (!mrp || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}