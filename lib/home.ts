/**
 * Home page content.
 *
 * The homepage is database-driven: `loadHomeData()` reads products and bundles
 * from Supabase so anything you add in the admin dashboard shows up immediately.
 *
 * This file holds the two things that are NOT in the database:
 *
 *   1. Static editorial content — the hero slides, solutions, services, testimonials.
 *      These are copy decisions, not records, and putting them in a table would
 *      mean an admin UI just to fix a typo.
 *
 *   2. `FALLBACK_CATALOGUE` — used only when Supabase is unreachable or still
 *      empty, so a fresh clone renders a real-looking storefront instead of an
 *      empty page. It is a mirror of `supabase/seed.sql`; once the database has
 *      data this is never read.
 */

import type { Product } from "./product-shape";
import { SITE } from "./site";

/**
 * Cards per category row on the homepage.
 *
 * Every row shows exactly this many. A category holding fewer is topped up with
 * best sellers from elsewhere, because rows of uneven length are what make a grid
 * look broken. Declared here rather than in `home-data.ts` because that module
 * imports the Supabase client, and this constant is needed by tests and by the
 * grid component.
 */
export const CATEGORY_GRID_SIZE = 4;

/* ──────────────────────────────────────────────────────────────────────────
   HERO
   ────────────────────────────────────────────────────────────────────────── */

export type HeroSlide = {
  eyebrow: string;
  title: string;
  /** Portion of `title` rendered in the accent colour. */
  accent: string;
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** Tailwind gradient classes for the slide background. */
  gradient: string;
  /** Decorative glow colour, as a raw CSS colour. */
  glow: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: "Shop Everything",
    title: "Everyday tech for",
    accent: "work, home & everywhere",
    body: "Phones, laptops, tablets, displays, audio, cameras and accessories — one store, one checkout, delivered anywhere in India. Pay online or cash on delivery.",
    primary: { label: "Shop all products", href: "/product-page" },
    secondary: { label: "Talk to us", href: "/#support" },
    gradient: "from-slate-900 via-slate-800 to-slate-900",
    glow: "#f97316",
  },
  {
    eyebrow: "Deal of the Day",
    title: "Up to 40% off on",
    accent: "today's best picks",
    body: "Real discounts on computers, phones, audio and accessories — refreshed daily, while stocks last. No inflated MRP, no fake sale.",
    primary: { label: "See today's deals", href: "/#deals" },
    secondary: { label: "Browse the catalogue", href: "/product-page" },
    gradient: "from-orange-900 via-slate-900 to-slate-900",
    glow: "#f59e0b",
  },
  {
    eyebrow: "Business & Bulk",
    title: "Buying for a whole",
    accent: "office or institution?",
    body: "Bulk pricing, consolidated invoicing, installation and annual maintenance. Tell us what you need and we will quote it the same working day.",
    primary: { label: "Request a quote", href: "/#support" },
    secondary: { label: "See our services", href: "/#services" },
    gradient: "from-indigo-950 via-slate-900 to-slate-900",
    glow: "#6366f1",
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   TRUST / VALUE PROPS
   ────────────────────────────────────────────────────────────────────────── */

export const VALUE_PROPS = SITE.highlights.map((item, index) => ({
  ...item,
  icon: ["Truck", "Wrench", "RefreshCcw", "Headphones"][index] as
    | "Truck"
    | "Wrench"
    | "RefreshCcw"
    | "Headphones",
}));

/* ──────────────────────────────────────────────────────────────────────────
   CATEGORY TILES
   ────────────────────────────────────────────────────────────────────────── */

export type CategoryTile = {
  label: string;
  href: string;
  icon:
    | "Monitor"
    | "Smartphone"
    | "Laptop"
    | "Mic"
    | "Camera"
    | "Headphones"
    | "Tablet"
    | "Cable"
    | "Projector"
    | "Speaker";
  blurb: string;
};

export const CATEGORY_TILES: CategoryTile[] = [
  { label: "Phones", href: "/product-page?category=Phone", icon: "Smartphone", blurb: "5G, from ₹19,999" },
  { label: "Laptops", href: "/product-page?category=Laptop", icon: "Laptop", blurb: "Ultrabooks & everyday" },
  { label: "Tablets", href: "/product-page?category=Tablet+%2F+iPad", icon: "Tablet", blurb: "With stylus support" },
  { label: "Monitors", href: "/product-page?category=Monitor", icon: "Monitor", blurb: "TVs & signage" },
  { label: "Audio", href: "/product-page?category=Mic", icon: "Mic", blurb: "Mics & soundbars" },
  { label: "Earphones", href: "/product-page?category=Airbud", icon: "Headphones", blurb: "ANC & sport" },
  { label: "Cameras", href: "/product-page?category=Camera", icon: "Camera", blurb: "PTZ & streaming 4K" },
  { label: "Accessories", href: "/product-page?category=Accessories", icon: "Cable", blurb: "Cables, mounts, stylus" },
];

/* ──────────────────────────────────────────────────────────────────────────
   SOLUTIONS & SERVICES
   ────────────────────────────────────────────────────────────────────────── */

export type Solution = {
  title: string;
  desc: string;
  includes: string[];
  icon: "GraduationCap" | "School" | "Home" | "Briefcase" | "MonitorPlay" | "Podcast";
};

export const SOLUTIONS: Solution[] = [
  {
    title: "Home & Everyday",
    desc: "The phone, laptop, tablet or earbuds you actually need — at a price that does not need a justification, with easy returns if you change your mind.",
    includes: ["Phones & tablets", "Laptops", "Audio & earphones", "7-day returns"],
    icon: "Home",
  },
  {
    title: "Students & Schools",
    desc: "Displays, computers and accessories that survive a full school day. Bulk pricing for a department, a floor or a whole institution.",
    includes: ["Interactive displays", "OPS modules", "Bulk pricing", "Installation"],
    icon: "GraduationCap",
  },
  {
    title: "Coaching Institutes",
    desc: "Multi-room rollouts with one invoice, the same specification in every room, and a single point of contact when something stops working.",
    includes: ["Room-wise billing", "Standardised specs", "AMC options", "Priority support"],
    icon: "School",
  },
  {
    title: "Office & Conference Rooms",
    desc: "Large-format displays with video calling built in, plus the cabling and controls that make them usable by everyone in the room.",
    includes: ["55-75 inch displays", "Camera & mic", "Matrix cabling", "Room controls"],
    icon: "Briefcase",
  },
  {
    title: "Creators & Studios",
    desc: "Broadcast-ready audio and video: condenser mics, boom arms, softboxes and streaming cameras that are matched to each other from the start.",
    includes: ["Streaming cameras", "Wireless lavalier", "Studio lighting", "Tripods"],
    icon: "Podcast",
  },
  {
    title: "Retail & Digital Signage",
    desc: "Screens that run unattended. Scheduled playlists, brightness control and a player that recovers by itself when nobody is watching.",
    includes: ["24/7 panels", "Media player", "Playlist scheduler", "Remote updates"],
    icon: "MonitorPlay",
  },
];

export type Service = {
  title: string;
  desc: string;
  icon: "Wrench" | "Monitor" | "Code" | "Share2" | "MapPin" | "LifeBuoy";
};

export const SERVICES: Service[] = [
  {
    title: "Installation & Commissioning",
    desc: "Our own technicians mount, cable, calibrate and test on site. We do not subcontract this.",
    icon: "Wrench",
  },
  {
    title: "Annual Maintenance",
    desc: "Scheduled preventive visits, firmware updates and a response SLA for anything under warranty.",
    icon: "LifeBuoy",
  },
  {
    title: "App & Platform Development",
    desc: "Android, iOS and cross-platform apps, including the dashboard that runs your devices.",
    icon: "Code",
  },
  {
    title: "Websites & LMS",
    desc: "Marketing sites, booking systems and learning management platforms built for institutions.",
    icon: "Monitor",
  },
  {
    title: "PAN-India Rollouts",
    desc: "Multi-site installations with standardised specs, consolidated billing and one accountable owner.",
    icon: "MapPin",
  },
  {
    title: "Digital Marketing",
    desc: "Search, social and paid campaigns for education businesses and edtech brands.",
    icon: "Share2",
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   TESTIMONIALS
   ────────────────────────────────────────────────────────────────────────── */

export const TESTIMONIALS = [
  {
    quote:
      "Ordered a laptop on a Tuesday evening and it arrived Thursday morning. The packaging was honest and the machine worked first time.",
    name: "Priya Nair",
    role: "Regular customer",
    location: "Ranchi, Jharkhand",
  },
  {
    quote:
      "Our coaching centre went from nine rooms to eighteen in a term. The bulk pricing and the single invoice made it far easier to approve.",
    name: "Anand Kumar",
    role: "Director, Vidya Edge Academy",
    location: "Dhanbad, Jharkhand",
  },
  {
    quote:
      "The camera and mic combination they recommended turned my online classes from a webcam on a shelf into something I am happy to be on camera for.",
    name: "Sneha Iyer",
    role: "Educator & content creator",
    location: "Jamshedpur, Jharkhand",
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   FALLBACK CATALOGUE
   ────────────────────────────────────────────────────────────────────────── */

/** Builds a fallback `Product` with sensible defaults so tiles below stay short. */
function fallback(over: Partial<Product> & Pick<Product, "name" | "slug" | "price">): Product {
  const mrp = over.mrp ?? Math.round(over.price * 1.35);
  return {
    id: 0,
    name: over.name,
    slug: over.slug,
    category: over.category ?? "Accessories",
    brand: "Obryn",
    price: over.price,
    mrp,
    image_url: over.image_url ?? null,
    images: [],
    description_intro: over.description_intro ?? "",
    specifications: {},
    badge: over.badge ?? "",
    rating: over.rating ?? 4.5,
    review_count: over.review_count ?? 0,
    stock: over.stock ?? 25,
    inStock: true,
    discount: mrp > over.price ? Math.round(((mrp - over.price) / mrp) * 100) : null,
    is_featured: over.is_featured ?? true,
    is_deal: over.is_deal ?? false,
    deal_ends_at: over.deal_ends_at ?? null,
    bundle_slugs: over.bundle_slugs ?? [],
    created_at: "",
  };
}

const IMG = {
  board86:
    "https://cdn11.bigcommerce.com/s-mfdnq9n4ks/images/stencil/1280x1280/products/5277/23617/1695890479.1280.1280__75644.1695890602.jpg?c=2",
  board75:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQD4MSZONvbVoAWOJ1v05zfkoUCLQFLQMGU_PbuY0Fne_PdlJDPjYmJvUoe&s=10",
  board65:
    "https://5.imimg.com/data5/SELLER/Default/2022/2/TM/ZR/VV/9197417/r-500x500.png",
  display:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvqnT7WmvnphqY_IXk2QxorWOAk-ThQLY9hSwFEvYpQ0osbMMrHVvp7amy&s=10",
  ops: "https://5.imimg.com/data5/SELLER/Default/2025/11/560410701/VI/DC/XK/201329385/i5-ops.jpg",
  phone: "https://gameloot.in/wp-content/uploads/sites/2/2025/10/Redmi-Note-12-5G.jpg",
  laptop:
    "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/macbook-air-size-unselect-202601-gallery-1_FMT_WHH?wid=690&hei=720&fmt=p-jpg&qlt=80",
  buds: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600",
  mic: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600",
  camera: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600",
  light: "https://images.unsplash.com/photo-1586083291447-864197473cec?w=600",
  stylus: "https://images.unsplash.com/photo-1587814055867-bd19de5da1f?w=600",
  cable: "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600",
};

export const FALLBACK_CATALOGUE: Product[] = [
  fallback({ name: 'Obryn Apex 86" 4K Interactive Display', slug: "obryn-apex-86", category: "Digital Board", price: 285000, mrp: 380000, badge: "Premium", rating: 4.8, review_count: 212, image_url: IMG.board86, is_deal: true, bundle_slugs: ["obryn-stylus", "obryn-mount", "obryn-cable"] }),
  fallback({ name: 'Obryn Apex 75" 4K Interactive Display', slug: "obryn-apex-75", category: "Digital Board", price: 189000, mrp: 245000, badge: "Best Seller", rating: 4.7, review_count: 486, image_url: IMG.board75, is_deal: true, bundle_slugs: ["obryn-stylus", "obryn-mount", "obryn-cable"] }),
  fallback({ name: 'Obryn Vertex 65" 4K Interactive Panel', slug: "obryn-vertex-65", category: "Digital Board", price: 145000, mrp: 185000, badge: "Featured", rating: 4.6, review_count: 331, image_url: IMG.board65, bundle_slugs: ["obryn-stylus", "obryn-mount"] }),
  fallback({ name: 'Obryn Halo 55" 4K QLED Signage Display', slug: "obryn-halo-55", category: "Monitor", price: 98000, mrp: 130000, badge: "Best Seller", rating: 4.6, review_count: 274, image_url: IMG.display, is_deal: true, bundle_slugs: ["obryn-player", "obryn-cable"] }),
  fallback({ name: "Obryn Core i5 OPS Computer Module", slug: "obryn-core-i5", category: "OPS", price: 28000, mrp: 38000, badge: "Best Seller", rating: 4.5, review_count: 403, image_url: IMG.ops, is_deal: true, bundle_slugs: ["obryn-cable", "obryn-kbm"] }),
  fallback({ name: "Obryn Halo Pro 5G 512 GB", slug: "obryn-halo-pro", category: "Phone", price: 42999, mrp: 54999, badge: "Premium", rating: 4.7, review_count: 642, image_url: IMG.phone, is_deal: true, bundle_slugs: ["obryn-buds", "obryn-charger"] }),
  fallback({ name: "Obryn Air 14\" Ultrabook", slug: "obryn-air-14", category: "Laptop", price: 64999, mrp: 84999, badge: "Best Seller", rating: 4.7, review_count: 388, image_url: IMG.laptop, is_deal: true, bundle_slugs: ["obryn-cable", "obryn-charger"] }),
  fallback({ name: "Obryn Buds Air Pro ANC", slug: "obryn-buds", category: "Airbud", price: 4999, mrp: 8999, badge: "Best Seller", rating: 4.6, review_count: 1842, image_url: IMG.buds, is_deal: true, bundle_slugs: ["obryn-cable"] }),
  fallback({ name: "Obryn Cam Stream 4K", slug: "obryn-cam-4k", category: "Camera", price: 18999, mrp: 25999, badge: "Best Seller", rating: 4.7, review_count: 356, image_url: IMG.camera, is_deal: true, bundle_slugs: ["obryn-tripod", "obryn-mic"] }),
  fallback({ name: "Obryn Mic Duo Wireless Lavalier", slug: "obryn-mic", category: "Mic", price: 6999, mrp: 11999, badge: "Popular", rating: 4.7, review_count: 421, image_url: IMG.mic, bundle_slugs: ["obryn-cable"] }),
  fallback({ name: 'Obryn Ring Light 18" with Tripod', slug: "obryn-ring-light", category: "Light", price: 2499, mrp: 3999, badge: "Featured", rating: 4.5, review_count: 771, image_url: IMG.light, bundle_slugs: ["obryn-tripod"] }),
  fallback({ name: "Obryn Stylus Pen 2 (Pack of 2)", slug: "obryn-stylus", category: "Accessories", price: 499, mrp: 899, rating: 4.6, review_count: 1024, image_url: IMG.stylus }),
  fallback({ name: "Obryn USB-C Cable 2 m", slug: "obryn-cable", category: "Accessories", price: 199, mrp: 399, rating: 4.5, review_count: 2104, image_url: IMG.cable }),
  fallback({ name: 'Obryn Wall Mount XL for 55"-98"', slug: "obryn-mount", category: "Accessories", price: 3999, mrp: 5999, rating: 4.5, review_count: 219, image_url: IMG.cable }),
  fallback({ name: "Obryn 65 W GaN Fast Charger", slug: "obryn-charger", category: "Accessories", price: 1299, mrp: 2199, badge: "Popular", rating: 4.6, review_count: 1103, image_url: IMG.cable }),
  fallback({ name: "Obryn Keyboard & Mouse Combo", slug: "obryn-kbm", category: "Accessories", price: 1499, mrp: 2499, rating: 4.4, review_count: 693, image_url: IMG.cable }),
  fallback({ name: "Obryn Media Player Mini", slug: "obryn-player", category: "Accessories", price: 8999, mrp: 12999, rating: 4.5, review_count: 142, image_url: IMG.cable }),
  fallback({ name: "Obryn Halo 43\" Commercial Display", slug: "obryn-halo-43", category: "Monitor", price: 62000, mrp: 84000, rating: 4.3, review_count: 118, is_deal: true }),
  fallback({ name: "Obryn Panel Light 30\" Studio Softbox", slug: "obryn-panel-light", category: "Light", price: 7999, mrp: 11999, rating: 4.6, review_count: 187, is_featured: false }),
  fallback({ name: "Obryn 65 W GaN Fast Charger", slug: "obryn-charger-2", category: "Accessories", price: 1299, mrp: 2199, rating: 4.6, review_count: 1103 }),
  fallback({ name: "Obryn Keyboard & Mouse Combo", slug: "obryn-kbm-2", category: "Accessories", price: 1499, mrp: 2499, rating: 4.4, review_count: 693 }),
  fallback({ name: "Obryn Laptop Sleeve 14\"", slug: "obryn-sleeve-14", category: "Accessories", price: 899, mrp: 1499, rating: 4.5, review_count: 288 }),
  fallback({ name: "Obryn Core i7 OPS Computer Module", slug: "obryn-core-i7", category: "OPS", price: 42000, mrp: 58000, badge: "New", rating: 4.7, review_count: 152, is_featured: false }),
  fallback({ name: "Obryn Halo 55\" 4K QLED Signage Display", slug: "obryn-halo-55-2", category: "Monitor", price: 98000, mrp: 130000, rating: 4.6, review_count: 274, is_deal: true }),
  fallback({ name: "Obryn Tripod Table 40 cm", slug: "obryn-tripod", category: "Tripod", price: 799, mrp: 1299, rating: 4.4, review_count: 528, image_url: IMG.cable }),
];