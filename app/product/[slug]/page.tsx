"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  Share2,
  CheckCircle2,
  Truck,
  Wrench,
  Star,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Heart,
  ShoppingCart
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';

const AccordionItem = ({ title, icon: Icon, children, isOpen, onClick }: any) => {
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-slate-700"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-gray-500" />}
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function DynamicProductSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('why-buy');
  const [mainImage, setMainImage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [cartNotice, setCartNotice] = useState('');
  const [wishlistNotice, setWishlistNotice] = useState('');

  const { addItem, setBuyNowItem } = useCart();
  const { isFavorite, toggleFavorite } = useWishlist();
  const { user } = useAuth();

  const isFavorited = product?.id ? isFavorite(Number(product.id)) : false;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    fetch(`/api/products/${slug}`)
      .then((r) => (r.ok ? r.json() : { product: null }))
      .then((d) => {
        setProduct(d.product || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch related products
    fetch('/api/products')
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d) => {
        const filtered = (d.products || []).filter((p: any) => p.slug !== slug);
        setRelatedProducts(filtered.slice(0, 4));
      })
      .catch(() => {});
  }, [slug]);

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(p);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: Number(product.id),
      slug: product.slug || slug,
      name: product.name,
      price: Number(product.price) || 0,
      image: product.image_url || undefined,
      quantity,
    });
    setCartNotice(`Added ${quantity} item(s) to your cart!`);
    setTimeout(() => setCartNotice(''), 3000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    // Requires an account: checkout records an order against the signed-in user.
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/product/${slug}`)}`);
      return;
    }
    setBuyNowItem({
      productId: Number(product.id),
      slug: product.slug || slug,
      name: product.name,
      price: Number(product.price) || 0,
      image: product.image_url || undefined,
      quantity,
    });
    router.push('/checkout');
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const nowFavorited = await toggleFavorite(Number(product.id));
    setWishlistNotice(
      nowFavorited ? 'Saved to your wishlist!' : 'Removed from your wishlist.'
    );
    setTimeout(() => setWishlistNotice(''), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Product Details...
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-32 space-y-4 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-2">
            🔍
          </div>
          <h1 className="text-2xl font-black text-slate-900">Product Not Found</h1>
          <p className="text-xs text-slate-500 max-w-sm">
            We could not find the product &ldquo;{slug}&rdquo;. It may have been relocated or removed.
          </p>
          <Link
            href="/product-page"
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow transition-colors"
          >
            Explore Catalog →
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Parse images
  const images: string[] = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image_url].filter(Boolean);

  // A product can have neither `image_url` nor `images` if no photo has been
  // uploaded yet. Fall back to a real static asset so the gallery's first slot
  // is never a broken image.
  if (images.length === 0) {
    images.push('/product-placeholder.svg');
  }

  // Parse specifications
  let specs: Record<string, Record<string, string>> = {};
  if (typeof product.specifications === 'string') {
    try {
      specs = JSON.parse(product.specifications);
    } catch {
      specs = {};
    }
  } else if (typeof product.specifications === 'object' && product.specifications !== null) {
    specs = product.specifications;
  }

  const priceNum = Number(product.price) || 0;
  const originalPriceNum = priceNum > 0 ? Math.round(priceNum * 1.35) : 0;
  const brandName = product.brand || product.category?.replace(/-/g, ' ') || 'Ecommerce';

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Navbar />

      {/*
        Both notices span the viewport on a phone and pin to the right from sm.
        `right-5` alone let a long message push its left edge past the viewport,
        because nothing was constraining its width.
      */}
      {cartNotice && (
        <div
          role="status"
          className="fixed left-4 right-4 top-20 z-50 flex animate-in slide-in-from-top-2 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl sm:left-auto sm:right-5 sm:max-w-md sm:px-5"
        >
          <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          <span className="min-w-0 flex-1">{cartNotice}</span>
          <Link
            href="/user-dashboard?tab=cart"
            className="ml-1 shrink-0 rounded-lg bg-orange-600 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-orange-700"
          >
            View cart
          </Link>
        </div>
      )}

      {wishlistNotice && (
        <div
          role="status"
          className="fixed left-4 right-4 top-20 z-50 flex animate-in slide-in-from-top-2 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl sm:left-auto sm:right-5 sm:max-w-md sm:px-5"
        >
          <Heart className="h-4 w-4 shrink-0 text-rose-400" aria-hidden />
          <span className="min-w-0 flex-1">{wishlistNotice}</span>
        </div>
      )}

      {/* BREADCRUMB
          No offset margin — Navbar renders its own measured spacer. */}
      <div className="border-b border-gray-100 bg-slate-50 py-2.5">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-hidden px-4 text-xs font-semibold text-gray-500 sm:px-6 lg:px-8">
          <Link href="/" className="hover:text-orange-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/product-page" className="hover:text-orange-600 transition-colors">
            Products
          </Link>
          <span>/</span>
          <span className="min-w-0 flex-1 truncate text-gray-900">{product.name}</span>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* PRODUCT GRID */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* LEFT COLUMN: IMAGES */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row gap-3.5 self-start lg:sticky lg:top-24">
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-visible py-1 sm:py-0 order-2 sm:order-1 shrink-0">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMainImage(idx)}
                    className={`relative h-16 w-16 shrink-0 rounded-xl border-2 overflow-hidden transition-all bg-slate-50 ${
                      mainImage === idx
                        ? 'border-orange-600 ring-2 ring-orange-100 shadow-md scale-105'
                        : 'border-slate-200 hover:border-gray-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`View ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image */}
            <div className="relative aspect-[4/3] sm:aspect-square w-full max-h-[460px] overflow-hidden rounded-2xl bg-slate-50 border border-slate-200/80 p-4 sm:p-6 flex items-center justify-center order-1 sm:order-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[mainImage] || images[0]}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
              />
              <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-orange-700 shadow-sm border border-slate-200 backdrop-blur-sm">
                {product.category}
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILS */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Header Info */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-black tracking-wider text-orange-600 uppercase bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  {brandName}
                </span>
                <span className="text-xs text-slate-400 font-semibold">• Certified Solution</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black leading-tight text-slate-900 mb-2.5">
                {product.name}
              </h1>

              {priceNum > 0 ? (
                <div className="flex flex-wrap items-end gap-3 mb-1.5">
                  <span className="text-sm sm:text-base text-gray-400 line-through decoration-gray-400 font-medium">
                    {formatPrice(originalPriceNum)}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {formatPrice(priceNum)}
                  </span>
                  <span className="mb-0.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                    Sale 35% Off
                  </span>
                </div>
              ) : (
                <div className="mb-1.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">
                    Price on Request / Consultation
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500 font-medium">
                Inclusive of all taxes • Free nationwide delivery & consultation
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3.5 mb-6">
              {/* Quantity */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-700">Quantity</span>
                <div className="flex h-9 w-28 items-center justify-between rounded-xl border border-gray-300 px-2.5 bg-slate-50/50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-gray-500 hover:text-slate-900 disabled:opacity-50 font-bold"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-bold text-slate-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="text-gray-500 hover:text-slate-900 font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex gap-2.5">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white py-3 text-xs font-bold text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-98"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    onClick={handleToggleWishlist}
                    aria-label={isFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
                    title={isFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
                    className={`w-12 shrink-0 inline-flex items-center justify-center rounded-xl border-2 transition-all active:scale-98 ${
                      isFavorited
                        ? 'border-rose-500 bg-rose-50 text-rose-600'
                        : 'border-slate-900 bg-white text-slate-900 hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <button
                  onClick={handleBuyNow}
                  disabled={priceNum <= 0}
                  title={
                    priceNum <= 0
                      ? 'This product is priced on request — contact us to order it'
                      : undefined
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-3 text-xs font-bold text-white transition-all shadow-md shadow-orange-600/20 hover:from-orange-700 hover:to-amber-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {priceNum <= 0 ? 'Buy Now · On Request' : 'Buy Now →'}
                </button>
                {priceNum <= 0 && (
                  <p className="text-center text-[10px] text-slate-400">
                    Add to your cart or contact us for a quote on this product.
                  </p>
                )}
              </div>
            </div>

            {/* Accordions */}
            <div className="mb-6 border-t border-gray-200">
              <AccordionItem
                title="Why Buy From Us"
                icon={CheckCircle2}
                isOpen={activeAccordion === 'why-buy'}
                onClick={() =>
                  setActiveAccordion(activeAccordion === 'why-buy' ? null : 'why-buy')
                }
              >
                <ul className="list-disc space-y-1 pl-4 text-xs">
                  <li>PAN India On-Site Installation & Training Support</li>
                  <li>100% Genuine Manufacturer Product with Official Warranty</li>
                  <li>Free Pre-Sale Technical Consultation & Classroom Design</li>
                  <li>Direct Dedicated After-Sales Engineering Support</li>
                </ul>
              </AccordionItem>

              <AccordionItem
                title="Ideal For & Setup Use-Cases"
                icon={Truck}
                isOpen={activeAccordion === 'perfect-for'}
                onClick={() =>
                  setActiveAccordion(activeAccordion === 'perfect-for' ? null : 'perfect-for')
                }
              >
                <p className="text-xs">
                  Engineered specifically for Smart Classrooms, Schools & Colleges, Coaching Institutes,
                  Corporate Boardrooms, Digital Learning Labs, and Hybrid Online Teaching Studios.
                </p>
              </AccordionItem>

              <AccordionItem
                title="Installation, Warranty & Support"
                icon={Wrench}
                isOpen={activeAccordion === 'install'}
                onClick={() =>
                  setActiveAccordion(activeAccordion === 'install' ? null : 'install')
                }
              >
                <p className="text-xs">
                  Complete doorstep delivery and professional wall mounting / mobile stand setup included across all major Indian cities and educational hubs.
                </p>
              </AccordionItem>
            </div>

            {/* Description Intro */}
            {product.description_intro && (
              <div className="prose prose-slate max-w-none mb-6 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-black text-slate-900 mb-1.5">Product Overview</h3>
                <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-line">
                  {product.description_intro}
                </p>
              </div>
            )}

            {/* Share Action */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-orange-600 transition-colors w-fit self-start"
            >
              <Share2 className="h-4 w-4" />
              <span>{copied ? 'Link Copied to Clipboard! ✓' : 'Share this Product'}</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            DYNAMIC TECHNICAL SPECIFICATIONS BUILDER RENDER
        ═══════════════════════════════════════════════════════════ */}
        {Object.keys(specs).length > 0 && (
          <section className="mt-10 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Technical Specifications
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(specs).map(([sectionTitle, fields], secIdx) => {
                const sectionColors = [
                  'border-orange-500 text-orange-700 bg-orange-50/60',
                  'border-indigo-500 text-indigo-700 bg-indigo-50/60',
                  'border-orange-500 text-orange-700 bg-orange-50/60',
                  'border-purple-500 text-purple-700 bg-purple-50/60',
                ];
                const headerStyle = sectionColors[secIdx % sectionColors.length];

                return (
                  <div
                    key={sectionTitle}
                    className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white"
                  >
                    <div className={`px-4 py-2.5 border-b border-slate-200 ${headerStyle}`}>
                      <h3 className="text-xs font-black uppercase tracking-wider">
                        {sectionTitle}
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {fields && typeof fields === 'object' && Object.entries(fields).map(([key, val]) => (
                        <div
                          key={key}
                          className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs hover:bg-slate-50/80 transition-colors"
                        >
                          <span className="font-bold text-slate-600 uppercase tracking-wide text-[10.5px] sm:w-1/2">
                            {key}
                          </span>
                          <span className="font-semibold text-slate-900 sm:w-1/2 sm:text-right">
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════
            RELATED CATALOG PRODUCTS
        ═══════════════════════════════════════════════════════════ */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  You May Also Like
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore top recommended educational and corporate equipment
                </p>
              </div>
              <Link
                href="/product-page"
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <span>View All Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {relatedProducts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/product/${rel.slug}`}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:shadow-lg sm:p-4"
                >
                  <div>
                    <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-slate-100 sm:aspect-[4/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rel.image_url || '/product-placeholder.svg'}
                        alt={rel.name}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/95 text-orange-700 shadow-sm border border-slate-100">
                        {rel.category}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors">
                      {rel.name}
                    </h4>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="min-w-0 truncate text-xs font-black text-slate-900 sm:text-sm">
                      {Number(rel.price) > 0 ? formatPrice(Number(rel.price)) : 'On Request'}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-orange-600 transition-transform group-hover:translate-x-0.5">
                      View →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
