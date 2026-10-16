"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  X,
  ArrowRight,
  Package,
  LayoutGrid,
  TrendingUp,
  Tags,
} from "lucide-react";
import type { Product } from "@/lib/product-shape";
import { inr } from "@/lib/site";

type SearchResponse = {
  query: string;
  products: Product[];
  category: { name: string; count: number } | null;
  /**
   * Brands matching the query. The server derives these from the live product
   * table, so a brand added through the admin dashboard shows up here without
   * any code change.
   */
  brands: { name: string; count: number }[];
  lookedUpCategory: boolean;
  categoryTotal: number;
  error?: string;
};

/** Settle time before querying, so typing does not fire a request per keystroke. */
const DEBOUNCE_MS = 220;

/**
 * The homepage search box.
 *
 * Typeahead with the marketplace behaviour shoppers already know: type a
 * department name like "mobile" and you get matching products, plus a link into
 * the Mobiles category — because "mobile" is a department, not a product name.
 * See lib/search.ts for the matching rules.
 */
export default function HomeSearch() {
  const router = useRouter();

  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Query, debounced ────────────────────────────────────────────────── */
  useEffect(() => {
    const query = term.trim();

    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(async () => {
      // Cancel the previous request so a slow response cannot overwrite a newer
      // one — typing "iphone" quickly would otherwise race itself.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search failed");
        setResults(await response.json());
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults({ query, products: [], category: null, brands: [], lookedUpCategory: false, categoryTotal: 0 });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [term]);

  /* ── Close on outside click or Escape ────────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    const onClickAway = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Abort any in-flight request if the component goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  /* ── Derived flags ────────────────────────────────────────────────────── */
  // Declared before the callbacks below, because they are read in a dependency
  // array — referencing them earlier in the file would hit the temporal dead zone.
  const hasResults = (results?.products.length ?? 0) > 0;
  const hasCategory = Boolean(results?.category);
  const hasBrands = (results?.brands.length ?? 0) > 0;
  const showPanel = open && term.trim().length >= 2;

  /* ── Navigation ──────────────────────────────────────────────────────── */
  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const submit = useCallback(() => {
    const query = term.trim();
    if (query.length < 2) return;

    // Prefer the resolved department when the shopper typed one, so "mobile"
    // lands on the Phones category rather than an accidental product.
    if (results?.category) {
      go(`/product-page?category=${encodeURIComponent(results.category.name)}`);
      return;
    }

    // A brand that matched but produced no product rows means the products are
    // reachable only through the brand filter, so send them there instead of to
    // an empty search results page.
    if (!hasResults && results?.brands.length === 1) {
      go(`/product-page?brand=${encodeURIComponent(results.brands[0].name)}`);
      return;
    }

    go(`/product-page?search=${encodeURIComponent(query)}`);
  }, [term, results, hasResults, go]);

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        role="search"
      >
        <div
          className={`flex items-center gap-2 rounded-xl border bg-white pl-3.5 pr-2 shadow-sm transition-colors ${
            open ? "border-orange-400 ring-2 ring-orange-100" : "border-gray-300"
          }`}
        >
          <Search className="h-4.5 w-4.5 shrink-0 text-gray-400" aria-hidden />

          <input
            ref={inputRef}
            type="search"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search for mobiles, laptops, Samsung, JBL, Canon & more…"
            aria-label="Search products"
            aria-expanded={showPanel}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none [&::-webkit-search-cancel-button]:hidden"
          />

          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-500" aria-hidden />
          ) : term ? (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="submit"
            disabled={term.trim().length < 2}
            className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            Search
          </button>
        </div>
      </form>

      {/* ══════ RESULTS PANEL ══════ */}
      {showPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {/* Loading, but keep the previous results visible so the panel does not
              collapse and reflow on every keystroke. */}
          {loading && !results ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400">Searching…</p>
          ) : !hasResults && !hasCategory && !hasBrands ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold text-gray-900">
                No matches for “{term.trim()}”
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Check the spelling, or browse the catalogue.
              </p>
              <Link
                href="/product-page"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                Browse all products
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto">
              {/* ── Category fallback ── */}
              {hasCategory ? (
                <Link
                  href={`/product-page?category=${encodeURIComponent(
                    results!.category!.name
                  )}`}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 border-b border-gray-100 bg-orange-50/70 px-4 py-3 transition-colors hover:bg-orange-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white">
                    <LayoutGrid className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-gray-900">
                      Search all {results!.category!.name} products
                    </span>
                    <span className="block text-[11px] text-gray-500">
                      {results!.category!.count} item
                      {results!.category!.count === 1 ? "" : "s"} in this category
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-orange-500 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              ) : null}

              {/* ── Brand suggestions ──
                  Driven by whatever is actually in the product table, so brands
                  added later from the admin dashboard appear here too. */}
              {hasBrands ? (
                <>
                  <p className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <Tags className="h-3 w-3" aria-hidden />
                    Brands
                  </p>

                  <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-3">
                    {results!.brands.map((brand) => (
                      <Link
                        key={brand.name}
                        href={`/product-page?brand=${encodeURIComponent(brand.name)}`}
                        onClick={() => setOpen(false)}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800"
                      >
                        {brand.name}
                        <span className="text-[10px] font-semibold text-gray-400 group-hover:text-orange-600">
                          {brand.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}

              {/* ── Product matches ── */}
              {hasResults ? (
                <>
                  <p className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <TrendingUp className="h-3 w-3" aria-hidden />
                    Products
                  </p>

                  {results!.products.map((product) => (
                    <Link
                      key={product.id || product.slug}
                      href={`/product/${product.slug}`}
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3 border-b border-gray-50 px-4 py-2.5 transition-colors last:border-b-0 hover:bg-gray-50"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white">
                        {product.image_url ? (
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
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-gray-900 group-hover:text-orange-700">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-gray-500">
                          {product.category}
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        <span className="block text-xs font-bold text-gray-900">
                          {product.price > 0 ? inr(product.price) : "On request"}
                        </span>
                        {product.mrp > product.price ? (
                          <span className="block text-[10px] text-gray-400 line-through">
                            {inr(product.mrp)}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ))}

                  <Link
                    href={`/product-page?search=${encodeURIComponent(term.trim())}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center gap-1.5 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    See all results for “{term.trim()}”
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}