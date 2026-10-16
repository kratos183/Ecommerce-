"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, ArrowRight, Package } from "lucide-react";
import type { HeroSlide } from "@/lib/home";
import type { Product } from "@/lib/product-shape";
import { inr, SITE } from "@/lib/site";
import HomeSearch from "./HomeSearch";

const ROTATE_MS = 6500;

/**
 * The hero carousel.
 *
 * Each slide pairs its copy with a real product, so the carousel advertises the
 * catalogue instead of showing three variations of the same gradient. Products
 * are assigned to slides in order and reused if there are more slides than
 * products.
 *
 * Auto-advances, but pauses on hover and when the tab is hidden, and does not
 * rotate at all under `prefers-reduced-motion` — an auto-moving full-width banner
 * is exactly the kind of thing that causes vestibular discomfort.
 */
export default function HeroCarousel({
  slides,
  products = [],
}: {
  slides: HeroSlide[];
  products?: Product[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current || count < 2) return;

    const timer = window.setInterval(() => go(index + 1), ROTATE_MS);

    // Don't burn cycles on a banner nobody is looking at.
    const onVisibility = () => {
      if (document.hidden) window.clearInterval(timer);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [index, paused, go, count]);

  if (count === 0) return null;

  return (
    <section
      className="relative overflow-hidden bg-slate-900 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.title}
          className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          <div
            className="absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-30 blur-3xl"
            style={{ background: slide.glow }}
          />
          <div
            className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full opacity-20 blur-3xl"
            style={{ background: slide.glow }}
          />
        </div>
      ))}

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {slides.map((slide, i) => {
          const product = products[i % Math.max(products.length, 1)];
          const active = i === index;

          return (
            <div
              key={slide.title}
              className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                active ? "" : "pointer-events-none absolute inset-x-4 opacity-0 sm:inset-x-6 lg:inset-x-8"
              }`}
              aria-hidden={!active}
            >
              {/* ── Copy ── */}
              <div className="max-w-xl">
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                  {slide.eyebrow}
                </p>

                <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                  {slide.title}{" "}
                  <span className="text-orange-400">{slide.accent}</span>
                </h1>

                <p className="mt-5 text-sm leading-relaxed text-slate-300 sm:text-base">
                  {slide.body}
                </p>

                <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex" aria-hidden>
                    {[...Array(5)].map((_, star) => (
                      <Star key={star} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                  <span>Trusted by 1,250+ schools, institutes and studios</span>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={slide.primary.href}
                    tabIndex={active ? 0 : -1}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-orange-600 hover:shadow-xl"
                  >
                    {slide.primary.label}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <a
                    href={`tel:+${SITE.whatsappNumber}`}
                    tabIndex={active ? 0 : -1}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                  >
                    Talk to sales
                  </a>
                </div>

                {/*
                  Search only on the first slide. Repeating it on all three would
                  mean three identical inputs in the DOM and three competing
                  dropdowns for one visitor.
                */}
                {active ? (
                  <div className="mt-6">
                    <HomeSearch />
                  </div>
                ) : null}
              </div>

              {/* ── Product ── */}
              <div className="hidden lg:block">
                {product ? <HeroProductCard product={product} active={active} /> : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Controls ── */}
      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25 md:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25 md:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>

          <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pb-6 sm:px-6 lg:px-8">
            <div className="flex gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}: ${slide.eyebrow}`}
                  aria-current={i === index}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-8 bg-orange-500" : "w-4 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>

            {/* Thumbnail picker — Amazon shows the slide contents, not just dots. */}
            {products.length ? (
              <div className="hidden items-center gap-2 sm:flex">
                {slides.map((slide, i) => {
                  const product = products[i % Math.max(products.length, 1)];
                  return (
                    <button
                      key={slide.title}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Show ${slide.eyebrow}`}
                      aria-current={i === index}
                      className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-white/95 transition-all ${
                        i === index
                          ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-900"
                          : "opacity-50 hover:opacity-90"
                      }`}
                    >
                      {product?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-gray-300" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

/**
 * The product panel beside the slide copy.
 *
 * Styled as a floating white card so it reads as a product rather than a
 * background image, and shows the price so the slide carries actual information.
 */
function HeroProductCard({ product, active }: { product: Product; active: boolean }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      tabIndex={active ? 0 : -1}
      className="group block rounded-2xl bg-white p-5 shadow-2xl transition-transform duration-500 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-md bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
          {product.badge || product.category}
        </span>
        {product.discount ? (
          <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
            -{product.discount}%
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-white">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Package className="h-12 w-12 text-gray-200" aria-hidden />
        )}
      </div>

      <h2 className="mt-4 line-clamp-2 text-sm font-bold leading-snug text-gray-900">
        {product.name}
      </h2>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl font-extrabold tracking-tight text-gray-900">
          {product.price > 0 ? inr(product.price) : "On request"}
        </span>
        {product.mrp > product.price ? (
          <span className="text-xs text-gray-400 line-through">{inr(product.mrp)}</span>
        ) : null}
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600">
        View this product
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </p>
    </Link>
  );
}