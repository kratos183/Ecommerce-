"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, Pause, Play } from "lucide-react";
import type { Product } from "@/lib/product-shape";
import ProductCard from "./ProductCard";

/** Scroll speed in pixels per second. Slow enough to read, fast enough to notice. */
const SPEED_PX_PER_SEC = 26;

/** How long after the shopper stops touching the rail before it drifts again. */
const RESUME_AFTER_MS = 4000;

/**
 * Minimum overflow, in pixels, before the drift is worth running.
 *
 * A rail that overflows by ten pixels is technically scrollable, so it passes
 * the arrow-visibility check — but wrapping from `max - 1` back to `0` every
 * few frames looks like a flicker, not a loop. Below this the rail shows its
 * arrows and stops still.
 */
const MIN_AUTOSCROLL_OVERFLOW = 48;

/**
 * A horizontally scrolling product rail that drifts sideways on its own.
 *
 * The drift is driven by requestAnimationFrame rather than a setInterval because
 * an interval produces visible jumps: each tick asks the browser to animate to a
 * new offset, and the compositor restarts the easing every time. Writing
 * `scrollLeft` once per frame gives continuous motion.
 *
 * Motion rules, all of which matter more than the effect itself:
 *
 *   - Stops under `prefers-reduced-motion`. An endlessly moving row is exactly
 *     what that setting is asking us not to do.
 *   - Stops on hover, on touch, and while the shopper is scrolling it by hand.
 *   - Stops while the rail is off-screen, so nothing animates off the page.
 *   - Stops while the tab is hidden (rAF is throttled anyway; the delta is
 *     clamped so it does not jump on return).
 *   - Has a visible pause button. Motion that lasts more than five seconds needs
 *     a way to stop it that does not require finding the rail first.
 *
 * The arrows stay useful while it drifts — pressing one takes over, and the
 * drift resumes after the shopper has stopped.
 */
export default function ProductRail({
  title,
  subtitle,
  href,
  products,
  icon,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  products: Product[];
  /** Rendered as a small tinted badge before the title. */
  icon?: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<number | null>(null);

  const [overflows, setOverflows] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const [hovered, setHovered] = useState(false);
  const [touching, setTouching] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  /**
   * Whether the rail drifts on its own. Also turned off by `prefers-reduced-motion`
   * on mount — but only on mount, so the pause button stays a working control
   * rather than a button that silently reverts on every click.
   */
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setAutoScroll(false);
    }
  }, []);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;

    // `scrollWidth` includes the padding-right on the last card; comparing against
    // `clientWidth` alone can report a few pixels of overflow that nothing can scroll to.
    setOverflows(el.scrollWidth - el.clientWidth > 8);

    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    measure();

    const el = scroller.current;
    if (!el) return;

    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, products.length]);

  /* ── Is the rail actually on screen? ─────────────────────────────────────
     A rail below the fold has no business animating. */
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setOnScreen(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { rootMargin: "100px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [products.length]);

  /* ── Take over when the shopper scrolls it by hand ────────────────────── */
  const interrupt = useCallback(() => {
    setTouching(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setTouching(false), RESUME_AFTER_MS);
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    []
  );

  /* ── The drift ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    // Hold still when there is nothing worth scrolling, when the shopper asked
    // for reduced motion, or whenever anything else says to pause.
    if (!overflows || !autoScroll || hovered || touching || !onScreen) return;
    if (el.scrollWidth - el.clientWidth < MIN_AUTOSCROLL_OVERFLOW) return;

    let raf = 0;
    let last = performance.now();
    let carry = 0;

    const tick = (now: number) => {
      // Clamp the delta: returning to a backgrounded tab produces one enormous
      // frame, which would otherwise teleport the rail across the page.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      carry += dt * SPEED_PX_PER_SEC;
      const step = Math.floor(carry);
      carry -= step;

      if (step > 0) {
        const max = el.scrollWidth - el.clientWidth;
        const next = el.scrollLeft + step;

        // Wrap to the start rather than stopping at the end, so the drift reads
        // as a loop rather than as something that ran out.
        el.scrollLeft = next >= max - 1 ? 0 : next;
        // No measure() call here: assigning scrollLeft fires a scroll event, and
        // the listener above already recomputes the arrow states. Calling it
        // directly too meant three setState calls per animation frame.
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [overflows, autoScroll, hovered, touching, onScreen]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;

    // The user is driving now. Wait for them to stop before taking it back.
    interrupt();

    // Roughly one card plus its gap, so the arrows land on whole cards.
    const step = Math.max(200, el.clientWidth * 0.8);
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section
      className="group/rail relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-roledescription="carousel"
      aria-label={title}
    >
      <div className="mb-4 flex items-end justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-gray-900 sm:gap-2.5 sm:text-lg">
            {icon}
            <span className="truncate">{title}</span>
          </h2>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {href ? (
            <Link
              href={href}
              className="hidden items-center gap-1 text-xs font-medium text-gray-600 transition-colors hover:text-orange-700 sm:inline-flex"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}

          {overflows ? (
            <div className="flex items-center gap-1.5">
              {/* Pause is a real control, not decoration — motion this continuous
                  needs an off switch that is reachable without hunting. */}
              <button
                type="button"
                onClick={() => setAutoScroll((on) => !on)}
                aria-label={autoScroll ? `Pause automatic scrolling of ${title}` : `Resume automatic scrolling of ${title}`}
                aria-pressed={!autoScroll}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                {autoScroll ? (
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Play className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>

              {/* Arrows are pointer affordances; a phone scrolls by swiping. */}
              <div className="hidden gap-1.5 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  disabled={atStart}
                  aria-label={`Scroll ${title} left`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  disabled={atEnd}
                  aria-label={`Scroll ${title} right`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/*
        No `scroll-smooth` here. It would make every one of the per-frame
        scrollLeft writes animate on its own, turning a smooth drift into a stutter.
        The arrows pass behavior: "smooth" explicitly instead.
      */}
      <div
        ref={scroller}
        onTouchStart={interrupt}
        onPointerDown={interrupt}
        onWheel={interrupt}
        className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2"
      >
        {products.map((product, index) => (
          <div
            key={product.id || product.slug}
            className="w-[164px] shrink-0 snap-start xs:w-[180px] sm:w-[210px] lg:w-[228px]"
          >
            <ProductCard product={product} compact priority={index < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}