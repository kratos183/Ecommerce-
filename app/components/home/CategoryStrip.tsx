import Link from "next/link";
import type { Product } from "@/lib/product-shape";
import { inr } from "@/lib/site";

/**
 * The horizontal category strip under the hero.
 *
 * Amazon puts a single scannable row of categories directly beneath the main nav
 * so a shopper can drill into a department without scrolling past the carousel.
 * Rendered as a server component — it has no state and needs none.
 */
export default function CategoryStrip({
  categories,
  products,
}: {
  categories: { category: string; count: number }[];
  /** Used only to show a starting price on each category. */
  products: Product[];
}) {
  if (categories.length === 0) return null;

  // Cheapest sellable product per category, so the strip can show "from ₹X".
  const cheapest = new Map<string, number>();
  for (const product of products) {
    if (product.price <= 0) continue;
    const current = cheapest.get(product.category);
    if (current === undefined || product.price < current) {
      cheapest.set(product.category, product.price);
    }
  }

  return (
    <nav
      aria-label="Shop by department"
      className="border-b border-gray-200 bg-white shadow-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="scrollbar-hide -mx-1 flex items-stretch gap-1 overflow-x-auto py-2">
          {categories.map(({ category, count }) => {
            const from = cheapest.get(category);

            return (
              <Link
                key={category}
                href={`/product-page?category=${encodeURIComponent(category)}`}
                className="group flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-orange-50"
              >
                <span className="whitespace-nowrap text-xs font-semibold text-gray-700 group-hover:text-orange-700">
                  {category}
                </span>
                <span className="whitespace-nowrap text-[10px] text-gray-400">
                  {from !== undefined ? `from ${inr(from)}` : `${count} items`}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}