"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart, ShoppingCart, Search, ChevronDown,
  ChevronRight, Menu, X, Plus, Minus, ArrowRight, RefreshCcw, LogOut, User,
} from "lucide-react";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { BRAND_GRID, REFURBISHED_CATEGORIES } from "@/lib/catalog";

// ─── DATA CONFIGURATION ─────────────────────────────────────
const VISIBLE_CATEGORIES = [
  { label: "Phone", href: "/product-page?category=Phone" },
  { label: "Laptop", href: "/product-page?category=Laptop" },
  { label: "Airbud", href: "/product-page?category=Airbud" },
  { label: "Speaker", href: "/product-page?category=Speaker" },
  { label: "Light", href: "/product-page?category=Light" },
  { label: "Digital Board", href: "/product-page?category=Digital+Board" },
  { label: "Tripod", href: "/product-page?category=Tripod" },
  { label: "Camera", href: "/product-page?category=Camera" },
  { label: "Mic", href: "/product-page?category=Mic" },
  { label: "Monitor", href: "/product-page?category=Monitor" },
  { label: "Tablet / iPad", href: "/product-page?category=Tablet+%2F+iPad" },
  { label: "Accessories", href: "/product-page?category=Accessories" },
];

const HIDDEN_CATEGORIES = [
  { label: "OPS", href: "/product-page?category=OPS" },
  { label: "Acoustic", href: "/product-page?category=Acoustic" },
  { label: "Podium", href: "/product-page?category=Podium" },
];

const ALL_CATEGORIES = [...VISIBLE_CATEGORIES, ...HIDDEN_CATEGORIES];

const DEVICE_SUB = ["Phone", "Laptop", "Airbud", "Tablet / iPad"];

export default function Navbar() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const { user, logout } = useAuth();
  const { count: cartCount, ready: cartReady } = useCart();
  const { count: wishlistCount } = useWishlist();

  /** Admins use the admin console; there is no customer dashboard for them. */
  const isAdmin = user?.role === "admin";
  
  // Mobile Accordion State
  const [expandedMobileCats, setExpandedMobileCats] = useState<Set<string>>(new Set());

  // Desktop Mega Menu State
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Scroll Hide State
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  /*
    Measure the real navbar height rather than hard-coding one.

    The height is not a constant: it differs between mobile and desktop (the
    category bar is desktop-only) and grows again when the mobile search row is
    open. A guessed value leaves a gap under the bar on one breakpoint and
    pushes the first section off-screen on another — which is exactly how
    "mt-16 sm:mt-20" margins spread through the other pages. Measuring once and
    publishing it as --navbar-h means every page can offset from the same truth.
  */
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(110);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const measure = () => {
      const height = el.offsetHeight;
      if (height > 0) setNavHeight(height);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      // ResizeObserver is universal in modern browsers, but a window listener
      // covers older engines rather than silently never measuring.
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    // Observing the element catches the mobile search row opening as well as
    // window resizes and font-size changes, which a resize listener would miss.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Handle Scroll Visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Toggle Mobile Category Brands
  const toggleMobileCat = (label: string) => {
    setExpandedMobileCats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) newSet.delete(label);
      else newSet.add(label);
      return newSet;
    });
  };

  // Handle Desktop Category Hover
  const handleCategoryEnter = (label: string) => {
    setActiveCategory(label);
  };

  const handleMouseLeaveNav = () => {
    setActiveCategory(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/product-page?search=${encodeURIComponent(search.trim())}`);
      setMobileSearch(false);
    }
  };

  return (
    <>
      <nav 
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-sm font-sans transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        
        {/* ── ROW 1: LOGO, SEARCH, ACTIONS ─
            gap and padding step down on the narrowest phones. At 320px the row
            has to hold the menu button, the wordmark, search, cart and two
            account buttons — `gap-4` plus `px-4` alone pushes it past the edge. */}
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-3 xs:gap-3 xs:px-4 sm:gap-4 sm:px-6 lg:px-8">
          
          <button
            className="-ml-1 shrink-0 rounded p-1 text-gray-600 transition-colors hover:text-orange-600 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-lg font-bold text-white shadow-md transition-colors group-hover:bg-orange-700">
              E
            </div>
            {/* The wordmark carries the brand; on narrow screens the monogram reads
                as a bare letter, so it appears from 400px up rather than 640px. */}
            <span className="hidden text-lg font-extrabold tracking-tight text-gray-900 xs:block sm:text-xl">
              ECOMMERCE
            </span>
          </Link>

          <form onSubmit={handleSearchSubmit} className="mx-auto hidden max-w-2xl flex-1 items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 transition-all focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-50 md:flex">
            <Search className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for mobiles, digital boards, accessories & more..."
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
            />
          </form>

          <div className="flex flex-1 justify-end md:hidden">
             <button
              className="rounded p-1 text-gray-600 transition-colors hover:text-orange-600"
              onClick={() => setMobileSearch((v) => !v)}
              aria-label={mobileSearch ? "Close search" : "Open search"}
              aria-expanded={mobileSearch}
            >
              <Search className="h-6 w-6" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-5">
            {/*
              Admins are staff, not shoppers — they get the admin console and no
              wishlist or cart links. Those point into the customer dashboard,
              which proxy.ts now redirects admins away from, so showing them here
              would only be a dead end.
            */}
            {!isAdmin ? (
              <>
                <Link
                  href={user ? "/user-dashboard?tab=wishlist" : "/login"}
                  aria-label="Wishlist"
                  className="hidden sm:flex text-gray-500 hover:text-orange-600 transition-colors relative group"
                >
                  <Heart className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  {user && wishlistCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/user-dashboard?tab=cart"
                  aria-label="Shopping cart"
                  className="flex text-gray-500 hover:text-orange-600 transition-colors relative group"
                >
                  <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  {cartReady && cartCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </>
            ) : null}

             {user ? (
               <div className="flex items-center gap-1.5 xs:gap-2">
                 <span className="hidden text-xs font-semibold text-gray-700 sm:inline lg:text-sm">
                   {user.name}
                 </span>
                 <Link
                   href={isAdmin ? "/Admin-Dashboard" : "/user-dashboard"}
                   className="flex items-center gap-1 rounded-full bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-orange-700 active:scale-95 xs:px-4 sm:text-sm"
                 >
                   <User className="h-3 w-3" aria-hidden />
                   <span className="hidden xs:inline">{isAdmin ? "Admin" : "Dashboard"}</span>
                   <span className="sr-only xs:hidden">{isAdmin ? "Admin" : "Dashboard"}</span>
                 </Link>
                 {/* Icon-only on the narrowest phones; it needs an accessible name
                     rather than being dropped, since signing out is not optional. */}
                 <button
                   onClick={logout}
                   aria-label="Log out"
                   title="Log out"
                   className="flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-2 text-xs font-semibold text-white transition-all hover:bg-red-600 active:scale-95 xs:px-4 sm:text-sm"
                 >
                   <LogOut className="h-3 w-3" aria-hidden />
                   <span className="hidden lg:inline">Log out</span>
                 </button>
               </div>
             ) : (
               <Link
                 href="/login"
                 className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg active:scale-95 xs:px-5 sm:text-sm"
               >
                 Login
               </Link>
             )}
          </div>
        </div>

        {mobileSearch && (
          <form onSubmit={handleSearchSubmit} className="md:hidden px-4 pb-4 border-b border-gray-100 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-3 gap-3">
              <Search className="h-5 w-5 shrink-0 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
            </div>
          </form>
        )}

        {/* ─ ROW 2: CATEGORY NAVIGATION (DESKTOP ONLY) ─ */}
        <div 
          className="hidden md:block border-t border-gray-100 bg-white relative"
          onMouseLeave={handleMouseLeaveNav}
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            {/*
              Twelve categories plus "All Categories" do not fit between 768px and
              roughly 1200px. Without a scroll container the tail is simply cut off
              with no way to reach it — so this scrolls horizontally until there is
              room for it.
            */}
            <div className="scrollbar-hide flex items-center overflow-x-auto whitespace-nowrap py-1">
              
              <div 
                className="relative group/all shrink-0"
                onMouseEnter={() => handleCategoryEnter("ALL")}
              >
                <Link
                  href="/product-page"
                  className="inline-flex items-center gap-2 px-4 py-4 text-sm font-bold text-orange-700 hover:bg-orange-50 transition-colors border-b-2 border-transparent group-hover/all:border-orange-600"
                >
                  <Menu className="h-4 w-4" />
                  All Categories
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Link>
              </div>

              {VISIBLE_CATEGORIES.map((cat) => (
                <div 
                  key={cat.label} 
                  className="relative group/cat shrink-0"
                  onMouseEnter={() => handleCategoryEnter(cat.label)}
                >
                  <Link
                    href={cat.href}
                    className="inline-flex items-center gap-1 px-3 py-4 text-sm font-medium text-gray-600 hover:text-orange-700 hover:bg-gray-50 transition-colors border-b-2 border-transparent group-hover/cat:border-orange-600"
                  >
                    {cat.label}
                    <ChevronDown className="h-3 w-3 opacity-50 group-hover/cat:opacity-100 transition-opacity" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* FULL-WIDTH VERTICAL MEGA MENU */}
          {activeCategory && (
            <div 
              className="absolute left-0 right-0 top-full z-[100] bg-white shadow-xl border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-150"
              onMouseEnter={() => setActiveCategory(activeCategory)}
              onMouseLeave={() => setActiveCategory(null)}
            >
              <div className="mx-auto max-w-[1400px] px-8 py-8">
                
                {/* Header */}
                <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                    {activeCategory === "ALL" ? "Browse All Departments" : `Shop ${activeCategory}`}
                  </h3>
                  {activeCategory !== "ALL" && (
                    <Link
                      href={`/product-page?category=${encodeURIComponent(activeCategory)}`}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-800 flex items-center gap-1"
                    >
                      View All Products <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  
                  {activeCategory === "ALL" ? (
                    // ALL CATEGORIES VIEW - DEVICES NOW VERTICAL
                    <>
                      <div className="lg:col-span-2">
                        <p className="text-xs font-bold uppercase text-gray-400 mb-3">Devices</p>
                        <div className="space-y-4">
                          {DEVICE_SUB.map((catLabel) => {
                            const catData = ALL_CATEGORIES.find(c => c.label === catLabel);
                            return (
                              <div key={catLabel} className="group/item">
                                <Link
                                  href={catData?.href || `/product-page?category=${encodeURIComponent(catLabel)}`}
                                  className="block text-sm font-bold text-orange-700 group-hover/item:text-orange-800 mb-1.5"
                                >
                                  {catLabel} <ChevronRight className="inline h-3 w-3 ml-0.5 opacity-50" />
                                </Link>
                                <div className="flex flex-wrap gap-x-2 gap-y-1">
                                  {(BRAND_GRID[catLabel] || []).slice(0, 4).map(brand => (
                                    <Link
                                      key={brand}
                                      href={`/product-page?category=${encodeURIComponent(catLabel)}&brand=${encodeURIComponent(brand)}`}
                                      className="text-[11px] text-gray-500 hover:text-orange-600 cursor-pointer transition-colors"
                                    >
                                      {brand}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="lg:col-span-3">
                        <p className="text-xs font-bold uppercase text-gray-400 mb-3">All Categories</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                          {ALL_CATEGORIES.filter(c => !DEVICE_SUB.includes(c.label)).map((cat) => (
                            <div key={cat.label} className="group/item">
                              <Link
                                href={cat.href}
                                className="block text-sm font-bold text-gray-900 group-hover/item:text-orange-700 mb-1.5"
                              >
                                {cat.label} <ChevronRight className="inline h-3 w-3 ml-0.5 opacity-50" />
                              </Link>
                              <div className="flex flex-wrap gap-x-2 gap-y-1">
                                {(BRAND_GRID[cat.label] || []).slice(0, 3).map(brand => (
                                  <Link
                                    key={brand}
                                    href={`/product-page?category=${encodeURIComponent(cat.label)}&brand=${encodeURIComponent(brand)}`}
                                    className="text-[11px] text-gray-500 hover:text-orange-600 cursor-pointer transition-colors"
                                  >
                                    {brand}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    // SPECIFIC CATEGORY VIEW
                    <>
                      {/* LEFT COLUMN: TOP BRANDS ONLY */}
                      <div className="lg:col-span-2">
                        <p className="text-xs font-bold uppercase text-gray-400 mb-3">Top Brands</p>
                        <div className="space-y-3">
                          {(BRAND_GRID[activeCategory] || []).map((brand) => (
                            <Link 
                              key={brand} 
                              href={`/product-page?category=${encodeURIComponent(activeCategory)}&brand=${encodeURIComponent(brand)}`}
                              className="flex items-center justify-between group/brand py-1"
                            >
                              <span className="text-sm font-medium text-gray-700 group-hover/brand:text-orange-700 transition-colors">
                                {brand}
                              </span>
                              <ChevronRight className="h-3 w-3 text-gray-300 group-hover/brand:text-orange-500 transition-colors" />
                            </Link>
                          ))}
                        </div>
                      </div>
                      
                      {/* RIGHT COLUMN: REFURBISHED FOR PHONE/LAPTOP, POPULAR FILTERS FOR OTHERS */}
                      <div className="lg:col-span-2">
                         {(() => {
                           const refurbished = activeCategory
                             ? REFURBISHED_CATEGORIES[activeCategory]
                             : undefined;

                           if (refurbished) {
                             return (
                               /* REFURBISHED SECTION */
                               <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 h-full">
                                 <div className="flex items-center gap-2 mb-4">
                                    <RefreshCcw className="h-4 w-4 text-gray-700" />
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-900">
                                      {refurbished.title}
                                    </p>
                                 </div>
                                 <div className="space-y-3">
                                    {refurbished.brands.map((brand) => (
                                      <Link
                                        key={brand}
                                        href={`/product-page?category=${encodeURIComponent(activeCategory)}&brand=${encodeURIComponent(brand)}`}
                                        className="flex items-center justify-between group/ref py-1"
                                      >
                                        <span className="text-sm font-medium text-gray-700 group-hover/ref:text-orange-700 transition-colors">
                                          {brand}
                                        </span>
                                        <ChevronRight className="h-3 w-3 text-gray-300 group-hover/ref:text-orange-500 transition-colors" />
                                      </Link>
                                    ))}
                                 </div>
                              </div>
                             );
                           }

                           /* OTHER CATEGORIES: Popular Filters */
                           return (
                             <>
                               <p className="text-xs font-bold uppercase text-gray-400 mb-3">Popular Filters</p>
                               <div className="space-y-3">
                                  {["On sale", "New arrivals", "Best sellers"].map(term => (
                                    <Link
                                      key={term}
                                      href={`/product-page?category=${encodeURIComponent(activeCategory)}`}
                                      className="flex items-center justify-between group/search py-1"
                                    >
                                      <span className="text-sm text-gray-600 group-hover/search:text-orange-700 transition-colors">
                                        {term}
                                      </span>
                                      <ChevronRight className="h-3 w-3 text-gray-300 group-hover/search:text-orange-500 transition-colors" />
                                    </Link>
                                  ))}
                               </div>
                             </>
                           );
                         })()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer so the fixed navbar does not overlap the first section.
            Height comes from the measurement above, so it stays correct when the
            mobile search row opens and on every breakpoint. */}
      <div style={{ height: navHeight }} aria-hidden /> 

      {/* ── MOBILE DRAWER WITH BRANDS ─ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[200] md:hidden">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileOpen(false)}
          />
          
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <span className="font-bold text-lg text-gray-900">Menu</span>
              <button 
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-20">
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">Categories & Brands</h4>
                <div className="space-y-2">
                  {ALL_CATEGORIES.map((cat) => {
                    const isExpanded = expandedMobileCats.has(cat.label);
                    const brands = BRAND_GRID[cat.label] || [];
                    
                    return (
                      <div key={cat.label} className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                        {/* Category Header */}
                        <Link 
                          href={cat.href}
                          className="flex items-center justify-between px-4 py-3.5 text-sm font-medium text-gray-800 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                          onClick={() => setMobileOpen(false)}
                        >
                          <span>{cat.label}</span>
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </Link>

                        {/*
                          Animate height without a magic cap. `max-h-96` clipped
                          the categories with the most brands — Phone carries ten,
                          which overflows 24rem — so the last brands were
                          unreachable with no scrollbar to reveal that.
                        */}
                        {brands.length > 0 && (
                          <div
                            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                              isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="bg-gray-50/50 border-t border-gray-50 px-4 pb-4 pt-2">
                                <div className="flex flex-col gap-2">
                                  {brands.map(brand => (
                                    <Link
                                      key={brand}
                                      href={`/product-page?category=${encodeURIComponent(cat.label)}&brand=${encodeURIComponent(brand)}`}
                                      className="inline-flex items-center px-3 py-2 rounded-lg bg-white text-xs font-medium text-gray-600 border border-gray-200 shadow-sm active:scale-[0.98] transition-transform"
                                      onClick={() => setMobileOpen(false)}
                                    >
                                      {brand}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Toggle Button */}
                        {brands.length > 0 && (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              toggleMobileCat(cat.label);
                            }}
                            className="w-full flex items-center justify-center py-2 bg-gray-50 text-[10px] font-bold uppercase text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors border-t border-gray-100"
                          >
                            {isExpanded ? (
                              <span className="flex items-center gap-1"><Minus className="h-3 w-3" /> Hide Brands</span>
                            ) : (
                              <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Show Top Brands</span>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50">
               <Link
                 href="/login"
                 onClick={() => setMobileOpen(false)}
                 className="w-full block text-center py-3 rounded-xl bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95"
               >
                 Sign In / Register
               </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}