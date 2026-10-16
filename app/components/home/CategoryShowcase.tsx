import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import type { Product } from "@/lib/product-shape";
import ProductCard from "./ProductCard";

/**
 * The category rail + content grid.
 *
 * Amazon's signature layout: a narrow left column of category links that swaps
 * the grid beside it on hover. Implemented with CSS `:hover` via group classes
 * rather than React state so there is nothing to hydrate on the server render.
 *
 * Below `md` the rail becomes a horizontally scrollable chip row, because a
 * 240px column on a phone would squeeze the grid to two unusable cards.
 */
export default function CategoryShowcase({
  groups,
}: {
  /** Each group already carries exactly CATEGORY_GRID_SIZE products. */
  groups: { category: string; products: Product[]; inCategoryCount: number }[];
}) {
  if (groups.length === 0) return null;

  return (
    // No container of its own: the caller in app/page.tsx already supplies the
    // width and padding. A second `mx-auto max-w-7xl px-4` here doubled the
    // gutter and — worse — capped this section at 1280px even after the caller
    // was widened to 1680px.
    <section>
      {/* ── Mobile / tablet: chip rail ── */}
      <div className="scrollbar-hide -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        {groups.map((group) => (
          <a
            key={group.category}
            href={`#cat-${slug(group.category)}`}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-orange-300 hover:text-orange-700"
          >
            {group.category}
          </a>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-[236px_1fr]">
        {/* ── Left rail (desktop) ──
            Sticky, and offset below the fixed Navbar and its spacer.

            Without `sticky`, the rail scrolls away with the top of this section
            while its grid column keeps reserving 236px — which is what produced
            the large empty band down the left-hand side of the page. */}
        <nav
          aria-label="Product categories"
          className="sticky top-[140px] hidden max-h-[calc(100vh-168px)] self-start overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white md:block"
        >
          <div className="relative flex flex-col">
            {groups.map((group, index) => {
              const key = slug(group.category);

              return (
                <div key={group.category} className="group/rail relative">
                  {/* Rail entry. Padding-right clears the hovering sub-menu. */}
                  <Link
                    href={`#cat-${key}`}
                    className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 text-xs font-medium text-gray-700 transition-colors last:border-b-0 hover:bg-orange-50 hover:text-orange-800 md:pr-6"
                  >
                    <span className="truncate">{group.category}</span>
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover/rail:text-orange-600"
                      aria-hidden
                    />
                  </Link>

                  {/* Hover panel — absolute so it overlays the grid beside it.

                  `min()` against the viewport, because a fixed 680px plus the
                  236px rail is 916px — wider than a 768px tablet, so the panel
                  ran off the right edge with its last column unreachable. */}
                  <div
                    className="invisible absolute left-full top-0 z-20 w-[min(680px,calc(100vw-268px))] opacity-0 transition-opacity duration-150 group-hover/rail:visible group-hover/rail:opacity-100"
                  >
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 shadow-xl sm:grid-cols-4">
                      {group.products.slice(0, 8).map((product) => (
                        <div key={product.id || product.slug} className="bg-white p-3">
                          <Link
                            href={`/product/${product.slug}`}
                            className="block space-y-1.5 text-center"
                          >
                            <span className="flex aspect-square items-center justify-center overflow-hidden">
                              {product.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.image_url}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <Package className="h-7 w-7 text-gray-200" aria-hidden />
                              )}
                            </span>
                            <span className="line-clamp-2 block text-[11px] leading-tight text-gray-700">
                              {product.name}
                            </span>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* ── Content grids ── */}
        <div className="space-y-10">
          {groups.map((group) => (
            <div key={group.category} id={`cat-${slug(group.category)}`} className="scroll-mt-40">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900">
                    {group.category}
                  </h2>
                  {/* The real count, which may be lower than the four cards shown
                      when the row was topped up with recommendations. */}
                  <p className="mt-0.5 text-xs text-gray-500">
                    {group.inCategoryCount} product
                    {group.inCategoryCount === 1 ? "" : "s"}
                    {group.inCategoryCount < group.products.length ? (
                      <span className="text-gray-400"> · showing related items</span>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={`/product-page?category=${encodeURIComponent(group.category)}`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gray-600 transition-colors hover:text-orange-700"
                >
                  Shop all
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>

              {/* Two-up from the narrowest phone. Four cards stacked in one column meant
                  four screens of scrolling to compare one category. */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                {group.products.map((product) => (
                  <ProductCard key={product.id || product.slug} product={product} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** URL- and DOM-safe version of a category name. */
function slug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}