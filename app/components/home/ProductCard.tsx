"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, ShoppingCart, Star, Package } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import type { Product } from "@/lib/product-shape";
import { inr, whatsappLink } from "@/lib/site";

/**
 * The storefront product card.
 *
 * Used by every grid and rail on the homepage, so the hover treatment, price
 * block and action buttons stay identical everywhere.
 *
 * "Add to cart" and the wishlist heart need client state, which is why this is a
 * client component — the homepage itself stays a Server Component and passes
 * plain product data down.
 */
export default function ProductCard({
  product,
  compact = false,
  priority = false,
}: {
  product: Product;
  /** Denser variant for horizontal rails. */
  compact?: boolean;
  /** Eagerly load the image — only worth it for above-the-fold cards. */
  priority?: boolean;
}) {
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useWishlist();
  const [added, setAdded] = useState(false);

  const saved = product.inStock;
  const favorited = isFavorite(product.id);

  function handleAdd() {
    if (!saved) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image_url ?? undefined,
    });
    // Flash a confirmation. The cart badge in the navbar already moves, so this
    // only needs to acknowledge the click, not persist.
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/60">
      {/* ── Badges ── */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1.5">
        {product.discount ? (
          <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
            -{product.discount}%
          </span>
        ) : null}
        {product.badge ? (
          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
            {product.badge}
          </span>
        ) : null}
      </div>

      {/* ── Wishlist ── */}
      <button
        type="button"
        onClick={() => toggleFavorite(product.id)}
        aria-label={favorited ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={favorited}
        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow-sm backdrop-blur transition-colors hover:text-rose-500"
      >
        <Heart className={`h-4 w-4 ${favorited ? "fill-rose-500 text-rose-500" : ""}`} />
      </button>

      {/* ── Image ── */}
      <Link
        href={`/product/${product.slug}`}
        className={`relative block overflow-hidden rounded-t-xl bg-white ${
          compact ? "aspect-square p-3" : "aspect-square p-4"
        }`}
      >
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-gray-200" aria-hidden />
          </div>
        )}
      </Link>

      {/* ── Body ── */}
      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
        {product.rating > 0 ? (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded bg-orange-600 px-1 py-0.5 text-[10px] font-bold text-white">
              {product.rating.toFixed(1)}
              <Star className="h-2.5 w-2.5 fill-white" aria-hidden />
            </span>
            <span className="text-[10px] text-gray-400">
              {product.review_count > 0
                ? `${product.review_count.toLocaleString("en-IN")} ratings`
                : "New"}
            </span>
          </div>
        ) : null}

        <h3 className="line-clamp-2 text-xs font-medium leading-snug text-gray-900">
          <Link href={`/product/${product.slug}`} className="hover:text-orange-700">
            {product.name}
          </Link>
        </h3>

        {product.description_intro ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
            {product.description_intro}
          </p>
        ) : null}

        <div className="mt-auto pt-3">
          {/* Wraps rather than overflowing: in a rail the card can be 164px wide,
              and an Indian-lakhs price plus its struck-through MRP does not fit
              on one line at that size. */}
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-bold tracking-tight text-gray-900">
              {product.price > 0 ? inr(product.price) : "On request"}
            </span>
            {product.mrp > product.price ? (
              <span className="text-[11px] text-gray-400 line-through">
                {inr(product.mrp)}
              </span>
            ) : null}
          </div>

          {saved ? (
            <p className="mt-0.5 text-[10px] font-medium text-green-600">In stock</p>
          ) : (
            <p className="mt-0.5 text-[10px] font-medium text-amber-600">
              {product.stock > 0 ? "Only a few left" : "Out of stock"}
            </p>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="mt-3 flex gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!saved}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-2 py-2 text-[11px] font-semibold text-gray-900 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
            {added ? "Added" : "Add"}
          </button>

          <a
            href={whatsappLink(
              `Hi Ecommerce, I'd like to order: ${product.name} (${inr(product.price)})`
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Order ${product.name} on WhatsApp`}
            className="flex w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}