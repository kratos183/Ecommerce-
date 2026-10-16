"use client";

import Link from "next/link";
import { ArrowRight, Flame, PackageSearch } from "lucide-react";
import type { Product } from "@/lib/product-shape";
import ProductCard from "./ProductCard";
import Countdown from "./Countdown";

/**
 * Deal of the Day.
 *
 * The countdown runs to the earliest `deal_ends_at` in the set, so the band
 * disappears the moment the first deal lapses rather than showing a stale clock.
 */
export default function DealOfTheDay({ deals }: { deals: Product[] }) {
  if (deals.length === 0) return null;

  const soonest = deals
    .map((deal) => deal.deal_ends_at)
    .filter((until): until is string => Boolean(until))
    .sort()[0];

  const best = deals.reduce((top, deal) =>
    (deal.discount ?? 0) > (top.discount ?? 0) ? deal : top
  );

  return (
    <section id="deals" className="bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* ── Deal header ── */}
          <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-400">
              <Flame className="h-3.5 w-3.5" aria-hidden />
              Deal of the day
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight">
              Up to {best.discount}% off
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {deals.length} {deals.length === 1 ? "product" : "products"} on offer
              today. While stocks last.
            </p>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Ends in
              </p>
              <Countdown until={soonest ?? null} />
            </div>

            <Link
              href="/product-page"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Shop all deals
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {/* ── Deal grid ── */}
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {deals.slice(0, 8).map((deal) => (
                <ProductCard key={deal.id || deal.slug} product={deal} />
              ))}
            </div>

            {deals.length > 8 ? (
              <p className="mt-4 text-center text-xs text-slate-400">
                Showing 8 of {deals.length} deals —{" "}
                <Link href="/product-page" className="font-medium text-orange-400 hover:underline">
                  see all {deals.length}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Shown in place of the deals band when the catalogue has nothing flagged as a
 * deal. Keeps the page rhythm intact without rendering an empty dark band.
 */
export function DealsPlaceholder() {
  return (
    <section className="border-y border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-12 text-center sm:px-6 lg:px-8">
        <PackageSearch className="h-8 w-8 text-gray-300" aria-hidden />
        <h2 className="mt-4 text-lg font-bold text-gray-900">No live deals right now</h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Deals appear here automatically once a product is flagged as a deal in the
          admin dashboard.
        </p>
        <Link
          href="/product-page"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          Browse the catalogue
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}