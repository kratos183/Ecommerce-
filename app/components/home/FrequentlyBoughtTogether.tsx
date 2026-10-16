"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Plus, ShieldCheck, ShoppingCart, Sparkles, Truck } from "lucide-react";
import type { Bundle } from "@/lib/bundles";
import type { Product } from "@/lib/product-shape";
import { useCart } from "@/context/CartContext";
import { inr, whatsappLink } from "@/lib/site";

/**
 * "Frequently Bought Together" — the last section on the homepage.
 *
 * The pairs come from each product's `bundle_slugs` column, resolved server-side
 * (see lib/bundles.ts). A customer picks which companions to include, the combined
 * total updates live, and the whole set can be added to the cart in one click.
 */
export default function FrequentlyBoughtTogether({ bundles }: { bundles: Bundle[] }) {
  const [bundleIndex, setBundleIndex] = useState(0);
  const { addItem } = useCart();

  const bundle = bundles[bundleIndex];

  // Held per bundle index so switching between bundles keeps each one's picks.
  const [picked, setPicked] = useState<Record<number, Set<string>>>({});

  const selectedSlugs = picked[bundleIndex];

  const chosen = useMemo(() => {
    if (!bundle) return [] as Product[];
    if (!selectedSlugs) return [bundle.hero, ...bundle.companions];
    return [bundle.hero, ...bundle.companions.filter((c) => selectedSlugs.has(c.slug))];
  }, [bundle, selectedSlugs]);

  if (!bundle) return null;

  const total = chosen.reduce((sum, item) => sum + item.price, 0);
  const listPrice = chosen.reduce((sum, item) => sum + (item.mrp || item.price), 0);
  const saving = Math.max(0, listPrice - total);

  function toggle(slug: string) {
    setPicked((prev) => {
      const current = prev[bundleIndex] ?? new Set(bundle!.companions.map((c) => c.slug));
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return { ...prev, [bundleIndex]: next };
    });
  }

  function addAll() {
    for (const item of chosen) {
      addItem({
        productId: item.id,
        slug: item.slug,
        name: item.name,
        price: item.price,
        image: item.image_url ?? undefined,
      });
    }
  }

  const lines: Product[] = [bundle.hero, ...bundle.companions];

  return (
    <section id="frequently-bought" className="border-t border-gray-200 bg-gray-50/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-gray-900">
              <Sparkles className="h-5 w-5 text-orange-600" aria-hidden />
              Frequently bought together
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
              The setups our customers buy again and again, paired by the Ecommerce team.
              Tick what you need and add the whole set to your cart in one go.
            </p>
          </div>

          {bundles.length > 1 ? (
            <div className="flex shrink-0 gap-1.5">
              {bundles.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setBundleIndex(index)}
                  aria-label={`Show bundle ${index + 1}`}
                  aria-current={index === bundleIndex}
                  className={`h-2 rounded-full transition-all ${
                    index === bundleIndex
                      ? "w-7 bg-orange-600"
                      : "w-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[1fr_320px]">
            {/* ── Items ── */}
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-start gap-3 sm:gap-5">
                {lines.map((item, index) => {
                  const isHero = index === 0;
                  const isSelected = isHero || chosen.some((c) => c.slug === item.slug);

                  return (
                    // Full-width rows on the narrowest phones, wrapping into a row
                    // from xs up. The text column is a fixed 160px only once there
                    // is room for it. An inline width of 160px on a 320px screen
                    // left the image and its caption overflowing the card.
                    <div key={item.slug} className="flex w-full items-start gap-3 xs:w-auto sm:gap-5">
                      <div className="relative w-[104px] shrink-0 sm:w-[128px]">
                        <Link
                          href={`/product/${item.slug}`}
                          className="block aspect-square overflow-hidden rounded-xl border border-gray-200 bg-white p-2"
                        >
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image_url}
                              alt={item.name}
                              loading="lazy"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-gray-300">
                              —
                            </div>
                          )}
                        </Link>

                        {!isHero ? (
                          <button
                            type="button"
                            onClick={() => toggle(item.slug)}
                            aria-pressed={isSelected}
                            aria-label={`${isSelected ? "Remove" : "Add"} ${item.name} ${
                              isSelected ? "from" : "to"
                            } the bundle`}
                            className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm transition-colors ${
                              isSelected
                                ? "bg-orange-600 text-white"
                                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                            }`}
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3" aria-hidden />
                            ) : (
                              <Plus className="h-3 w-3" aria-hidden />
                            )}
                          </button>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1 xs:w-[160px] xs:flex-none">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                          {isHero ? "This item" : "Add on"}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-gray-900">
                          <Link href={`/product/${item.slug}`} className="hover:text-orange-700">
                            {item.name}
                          </Link>
                        </h3>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {inr(item.price)}
                        </p>
                        {item.mrp > item.price ? (
                          <p className="text-[10px] text-gray-400 line-through">
                            {inr(item.mrp)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Trust row ── */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100 pt-5 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-orange-600" aria-hidden />
                  7-day returns
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-orange-600" aria-hidden />
                  Free delivery over ₹25,000
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-orange-600" aria-hidden />
                  Installation available
                </span>
              </div>
            </div>

            {/* ── Summary ── */}
            <aside className="border-t border-gray-200 bg-gray-50/70 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Bundle total
              </p>

              <div className="mt-4 space-y-2.5">
                {chosen.map((item) => (
                  <div key={item.slug} className="flex items-start justify-between gap-3 text-xs">
                    <span className="line-clamp-2 text-gray-600">{item.name}</span>
                    <span className="shrink-0 font-medium tabular-nums text-gray-900">
                      {inr(item.price)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    Subtotal ({chosen.length} {chosen.length === 1 ? "item" : "items"})
                  </span>
                  <span className="tabular-nums text-gray-900">{inr(total)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span className="text-xs font-medium text-gray-500">
                    {total >= 25000 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      inr(499)
                    )}
                  </span>
                </div>

                {saving > 0 ? (
                  <div className="flex items-center justify-between text-green-700">
                    <span>You save</span>
                    <span className="font-semibold tabular-nums">−{inr(saving)}</span>
                  </div>
                ) : null}

                <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold tracking-tight text-gray-900">
                    {inr(total)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={addAll}
                disabled={chosen.length === 0}
                className="mt-5 w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                Add {chosen.length} {chosen.length === 1 ? "item" : "items"} to cart
              </button>

              <a
                href={whatsappLink(
                  `Hi Ecommerce, I'd like this bundle:\n${chosen
                    .map((item) => `• ${item.name} — ${inr(item.price)}`)
                    .join("\n")}\nTotal: ${inr(total)}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
              >
                Order on WhatsApp
              </a>

              <p className="mt-4 text-center text-[10px] leading-relaxed text-gray-400">
                Priced on request? Message us and we&apos;ll send a written quote the
                same working day.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
