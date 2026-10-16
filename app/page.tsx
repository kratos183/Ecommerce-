import Link from "next/link";
import {
  ArrowRight,
  Truck,
  Wrench,
  RefreshCcw,
  Headphones,
  Monitor,
  Smartphone,
  Laptop,
  Mic,
  Camera,
  Cable,
  Tablet,
  Speaker,
  Projector,
  Award,
  ShieldCheck,
  Users,
  Store,
  Package,
  Info,
  type LucideIcon,
} from "lucide-react";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HeroCarousel from "./components/home/HeroCarousel";
import CategoryStrip from "./components/home/CategoryStrip";
import ProductCard from "./components/home/ProductCard";
import ProductRail from "./components/home/ProductRail";
import DealOfTheDay, { DealsPlaceholder } from "./components/home/DealOfTheDay";
import CategoryShowcase from "./components/home/CategoryShowcase";
import FrequentlyBoughtTogether from "./components/home/FrequentlyBoughtTogether";
import ContactSection from "./components/home/ContactSection";
import { ServicesSection, SolutionsSection, TestimonialsSection } from "./components/home/Sections";

import { loadHomeData } from "@/lib/home-data";
import {
  CATEGORY_TILES,
  HERO_SLIDES,
  SOLUTIONS,
  VALUE_PROPS,
} from "@/lib/home";
import { SITE } from "@/lib/site";

/**
 * The homepage is database-driven, so it is re-rendered from Postgres at most
 * once a minute and served from cache in between. Without this Next would
 * prerender the page at build time and freeze whatever products existed then.
 *
 * `POST/PUT/DELETE /api/products` call `revalidatePath("/")`, so a change made
 * in the admin dashboard appears immediately rather than after the window.
 */
export const revalidate = 60;

/* Icon names come through lib/home.ts as strings so that data file stays free
   of a react import and can be shared with server code. */
const VALUE_PROP_ICONS = { Truck, Wrench, RefreshCcw, Headphones } as const;

/**
 * Category tile icons, keyed by the name used in lib/home.ts.
 * A `Record` rather than a literal map so adding a tile there cannot break the
 * type here — `Package` below is the fallback for anything unmapped.
 */
const TILE_ICONS: Record<string, LucideIcon> = {
  Monitor,
  Smartphone,
  Laptop,
  Mic,
  Camera,
  Cable,
  Tablet,
  Speaker,
  Projector,
};

/**
 * The storefront homepage.
 *
 * A Server Component: products and bundles are read from Supabase in
 * `loadHomeData()` and handed to the small client components that need
 * interactivity (carousel, rails, cart buttons, countdown). Anything that can be
 * static markup stays static and ships zero JavaScript.
 *
 * Section order follows the pattern shoppers already know:
 *   hero → trust strip → deals → category rail + grid → best sellers →
 *   new arrivals → solutions → services → testimonials → contact →
 *   frequently bought together → footer
 */
export default async function Home() {
  const data = await loadHomeData();

  const hasCatalogue = data.products.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased">
      {/* ═══════ TOP BAR ═══════ */}
      <div className="bg-slate-900 text-xs text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <a
              href={`tel:+${SITE.whatsappNumber}`}
              className="transition-colors hover:text-white"
            >
              {SITE.phoneDisplay}
            </a>
            <span className="hidden text-slate-600 sm:inline">Free delivery over ₹25,000</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">{SITE.tagline}</span>
            <span className="text-slate-500 sm:hidden">Free delivery over ₹25,000</span>
          </div>
        </div>
      </div>

      {/* ═══════ NAVBAR ═══════ */}
      <Navbar />

      <main>
        {/* ═══════ HERO ═══════ */}
        <HeroCarousel slides={HERO_SLIDES} products={data.heroProducts} />

        {/* ═══════ DEPARTMENT STRIP ═══════ */}
        <CategoryStrip categories={data.categories} products={data.products} />

        {/* ═══════ DATA-SOURCE NOTICE ═══════ */}
        {data.notice ? (
          <div className="border-b border-amber-200 bg-amber-50">
            <div className="mx-auto flex max-w-7xl items-start gap-2.5 px-4 py-2.5 text-xs text-amber-900 sm:px-6 lg:px-8">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <p>{data.notice}</p>
            </div>
          </div>
        ) : null}

        {/* ═══════ TRUST STRIP ═══════ */}
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-x-6 gap-y-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {VALUE_PROPS.map((prop) => {
              const Icon = VALUE_PROP_ICONS[prop.icon];
              return (
                <div key={prop.title} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">{prop.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                      {prop.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══════ DEAL OF THE DAY ═══════ */}
        {data.deals.length > 0 ? <DealOfTheDay deals={data.deals} /> : <DealsPlaceholder />}

        {/* ═══════ CATEGORY TILES ═══════ */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                Shop by category
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Everything we sell, in one place.
              </p>
            </div>
            <Link
              href="/product-page"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gray-600 transition-colors hover:text-orange-700"
            >
              All products
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {CATEGORY_TILES.map((tile) => {
              const Icon = TILE_ICONS[tile.icon] ?? Package;
              return (
                <Link
                  key={tile.label}
                  href={tile.href}
                  className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                >
                  <span className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold text-gray-900">{tile.label}</span>
                  <span className="mt-0.5 text-[10px] text-gray-400">{tile.blurb}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ═══════ CATEGORY RAIL + GRIDS ═══════ */}
        {data.byCategory.length > 0 ? (
          /* Wider than the rest of the page. Four cards per row plus a rail need
             more room than max-w-7xl gives, and the leftover width was landing
             as dead space either side. */
          <section className="mx-auto max-w-[1680px] py-12 px-4 sm:px-6 lg:px-8">
            <CategoryShowcase groups={data.byCategory} />
          </section>
        ) : null}

        {/* ═══════ BEST SELLERS ═══════ */}
        {data.bestSellers.length > 0 ? (
          <section className="border-y border-gray-200 bg-white py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <ProductRail
                title="Best sellers"
                subtitle="The ones our customers keep coming back for."
                href="/product-page"
                products={data.bestSellers}
                icon={
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Award className="h-4 w-4" aria-hidden />
                  </span>
                }
              />
            </div>
          </section>
        ) : null}

        {/* ═══════ NEW ARRIVALS ═══════ */}
        {data.newArrivals.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <ProductRail
              title="New arrivals"
              subtitle="Just added to the Obryn catalogue."
              href="/product-page"
              products={data.newArrivals}
              icon={
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                  <Store className="h-4 w-4" aria-hidden />
                </span>
              }
            />
          </section>
        ) : null}

        {/* ═══════ WHY OBRYN ═══════ */}
        <section className="border-y border-gray-200 bg-white py-14">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
                Why Obryn
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                We install what we sell
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                Most marketplaces drop a box at your door and disappear. We measure the
                wall, spec the room, mount and calibrate the display, cable it properly,
                and train whoever has to use it. That is the whole business.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                It is also why we publish real specifications rather than marketing
                copy — a 65-inch panel that is genuinely 65 inches, a stylus that does
                not need pairing, a mount that holds.
              </p>

              <dl className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { value: "1,250+", label: "Institutions served", icon: Users },
                  { value: "19", label: "States covered", icon: Store },
                  { value: "4.6★", label: "Average rating", icon: ShieldCheck },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <stat.icon className="mb-1.5 h-4 w-4 text-orange-600" aria-hidden />
                      <span className="block text-xl font-bold tracking-tight text-gray-900">
                        {stat.value}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-gray-500">
                        {stat.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {SOLUTIONS.slice(0, 4).map((solution) => (
                <Link
                  key={solution.title}
                  href="/#solutions"
                  className="group rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-all hover:border-orange-200 hover:bg-white hover:shadow-md"
                >
                  <p className="text-xs font-bold text-gray-900">{solution.title}</p>
                  <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-gray-500">
                    {solution.desc}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700">
                    See what&apos;s included
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ SOLUTIONS ═══════ */}
        <SolutionsSection />

        {/* ═══════ SERVICES ═══════ */}
        <ServicesSection />

        {/* ═══════ TESTIMONIALS ═══════ */}
        <TestimonialsSection />

        {/* ═══════ CONTACT ═══════ */}
        <ContactSection />

        {/* ═══════ FREQUENTLY BOUGHT TOGETHER ═══════ */}
        {data.bundles.length > 0 ? (
          <FrequentlyBoughtTogether bundles={data.bundles} />
        ) : hasCatalogue ? (
          /* A catalogue exists but nobody has configured bundles yet — explain
             rather than silently dropping the section. */
          <section className="border-t border-gray-200 bg-gray-50/60">
            <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
              <Package className="mx-auto h-7 w-7 text-gray-300" aria-hidden />
              <h2 className="mt-3 text-base font-bold text-gray-900">
                Bundles are not set up yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Fill in a product&apos;s <code className="text-xs">bundle_slugs</code>{" "}
                column in Supabase (or the admin dashboard) to show the accessories
                people buy alongside it here.
              </p>
            </div>
          </section>
        ) : null}
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <Footer />
    </div>
  );
}