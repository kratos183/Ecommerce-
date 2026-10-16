/**
 * Product catalogue for the generated seed.
 *
 * Deliberately uses the real manufacturer brands listed in `lib/catalog.ts`
 * BRAND_GRID — the same list the Navbar mega menu filters by. A storefront whose
 * seed says "Ecommerce" everywhere but whose navbar offers "Samsung" as a filter is
 * internally inconsistent, and the filters return nothing.
 *
 * `scripts/build-seed.mjs` reads this and emits `supabase/seed.sql`.
 */

/**
 * The URL slug for a product.
 *
 * Exported rather than written out in each consumer, because three files need
 * it and the slug is the join key between the catalogue, the resolved image URLs
 * and the generated SQL. Two copies of a slug function is one drift away from
 * every product silently losing its images.
 */
export function slugFor(name, brand) {
  // Most names already begin with their brand ("Apple iPhone 15"), so only add
  // it when genuinely absent — otherwise every slug reads "apple-apple-iphone".
  const startsWithBrand = name.toLowerCase().startsWith(brand.toLowerCase());

  const base = (startsWithBrand ? name : `${brand} ${name}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Capped so it survives Postgres' 255-char column with room for a suffix.
  return base.length > 90 ? base.slice(0, 90).replace(/-+$/, "") : base;
}

/** Approximate Indian street prices per tier, used to derive realistic pricing. */
export const PRICE = {
  budget: [3999, 12999],
  mid: [12999, 34999],
  premium: [34999, 79999],
  high: [79999, 320000],
};

/**
 * Per-brand accent colour, so the generated placeholder images are visually
 * distinguishable in a grid instead of a wall of identical grey.
 */
export const BRAND_COLOUR = {
  Apple: "f5f5f7/1d1d1f",
  Samsung: "f1f5f9/0f172a",
  Xiaomi: "fef2f2/7f1d1d",
  Redmi: "fff7ed/9a3412",
  Oneplus: "fefce8/713f12",
  Poco: "fdf4ff/701a75",
  Vivo: "eff6ff/1e3a8a",
  Oppo: "ecfdf5/065f46",
  Realme: "fef2f2/9f1239",
  Motorola: "f5f3ff/4c1d95",
  Nokia: "f8fafc/0f172a",
  HP: "f0f9ff/075985",
  Lenovo: "fef2f2/b91c1c",
  Dell: "eff6ff/1e40af",
  Asus: "faf5ff/581c87",
  boAt: "fff7ed/c2410c",
  SONY: "f8fafc/0f172a",
  JBL: "fef2f2/991b1b",
  Bose: "f5f5f4/1c1917",
  LG: "fef2f2/b91c1c",
  Philips: "eff6ff/1e40af",
  Wipro: "ecfdf5/047857",
  Syska: "fffbeb/a16207",
  Godrej: "fdf4ff/86198f",
  MAXHUB: "eff6ff/1d4ed8",
  ViewSonic: "f0fdfa/0f766e",
  iSlate: "f5f3ff/5b21b6",
  Evota: "fefce8/a16207",
  Honor: "eff6ff/1d4ed8",
  DIGITEK: "f8fafc/334155",
  Tygot: "fef2f2/9f1239",
  Syvo: "ecfdf5/047857",
  NAFA: "f5f3ff/6d28d9",
  ULANZI: "f1f5f9/0f172a",
  Canon: "fef2f2/991b1b",
  Nikon: "f0f9ff/0c4a6e",
  Fujifilm: "fdf4ff/701a75",
  Shure: "f8fafc/0f172a",
  "Blue Yeti": "eff6ff/1d4ed8",
  Rode: "faf5ff/6b21a8",
  "Audio-Technica": "fef2f2/b91c1c",
  Intel: "eff6ff/1d4ed8",
  AMD: "fdf2f8/be185d",
  Panasonic: "eff6ff/1e40af",
  Microsoft: "f8fafc/334155",
  Ecommerce: "fff7ed/c2410c",
  Cables: "f8fafc/475569",
  Mounts: "f1f5f9/0f172a",
  Stands: "fdf4ff/86198f",
  Adapters: "ecfdf5/047857",
  Custom: "f8fafc/334155",
  Wooden: "fefce8/a16207",
  Acrylic: "eff6ff/1d4ed8",
};

/**
 * The catalogue.
 *
 * `tier` drives price; `badge` drives merchandising; `featured`/`deal` control
 * homepage placement. `images` is filled in by the builder so every product gets
 * the same four views.
 */
export const CATALOGUE = [
  /* ═══ PHONES ═══════════════════════════════════════════════════════════ */
  { name: "Apple iPhone 15 128 GB", brand: "Apple", category: "Phone", tier: "high", rating: 4.8, reviews: 1842, badge: "Premium", featured: true, deal: true },
  { name: "Apple iPhone 15 Plus 256 GB", brand: "Apple", category: "Phone", tier: "high", rating: 4.7, reviews: 921, badge: "Premium", featured: true },
  { name: "Samsung Galaxy S24 5G 256 GB", brand: "Samsung", category: "Phone", tier: "high", rating: 4.8, reviews: 2140, badge: "Best Seller", featured: true, deal: true },
  { name: "Samsung Galaxy A55 5G 128 GB", brand: "Samsung", category: "Phone", tier: "mid", rating: 4.5, reviews: 1673, badge: "Popular", featured: true },
  { name: "Samsung Galaxy A15 5G 128 GB", brand: "Samsung", category: "Phone", tier: "budget", rating: 4.3, reviews: 1120 },
  { name: "Xiaomi 14 Civi 5G 256 GB", brand: "Xiaomi", category: "Phone", tier: "mid", rating: 4.4, reviews: 486, badge: "New" },
  { name: "Redmi Note 13 Pro 5G 256 GB", brand: "Redmi", category: "Phone", tier: "mid", rating: 4.6, reviews: 3204, badge: "Best Seller", featured: true, deal: true },
  { name: "Redmi Note 13 5G 128 GB", brand: "Redmi", category: "Phone", tier: "budget", rating: 4.4, reviews: 4519, badge: "Popular" },
  { name: "OnePlus Nord CE4 Lite 5G 128 GB", brand: "Oneplus", category: "Phone", tier: "mid", rating: 4.4, reviews: 738, badge: "New" },
  { name: "OnePlus 12R 5G 256 GB", brand: "Oneplus", category: "Phone", tier: "premium", rating: 4.6, reviews: 612, featured: true },
  { name: "POCO X6 Pro 5G 256 GB", brand: "Poco", category: "Phone", tier: "mid", rating: 4.5, reviews: 1892, badge: "Popular", featured: true },
  { name: "POCO M6 Pro 5G 128 GB", brand: "Poco", category: "Phone", tier: "budget", rating: 4.2, reviews: 945 },
  { name: "vivo V30 5G 256 GB", brand: "Vivo", category: "Phone", tier: "premium", rating: 4.5, reviews: 534, badge: "New" },
  { name: "vivo Y28 5G 128 GB", brand: "Vivo", category: "Phone", tier: "budget", rating: 4.1, reviews: 1308 },
  { name: "OPPO Reno 12F 5G 256 GB", brand: "Oppo", category: "Phone", tier: "mid", rating: 4.4, reviews: 421, badge: "Popular" },
  { name: "realme 12 Pro+ 5G 256 GB", brand: "Realme", category: "Phone", tier: "premium", rating: 4.5, reviews: 867, featured: true },
  { name: "realme Narzo 70 5G 128 GB", brand: "Realme", category: "Phone", tier: "budget", rating: 4.2, reviews: 1560 },
  { name: "Motorola Edge 50 Fusion 5G 256 GB", brand: "Motorola", category: "Phone", tier: "mid", rating: 4.4, reviews: 392 },
  { name: "Honor 200 Lite 5G 128 GB", brand: "Honor", category: "Phone", tier: "budget", rating: 4.2, reviews: 534 },
  { name: "Honor X8b 5G 256 GB", brand: "Honor", category: "Phone", tier: "mid", rating: 4.4, reviews: 742, badge: "New" },
  { name: "Honor Pad 9 5G 256 GB", brand: "Honor", category: "Tablet / iPad", tier: "mid", rating: 4.3, reviews: 218 },
  { name: 'Honor X9b 75" 4K Interactive Display', brand: "Honor", category: "Digital Board", tier: "high", rating: 4.5, reviews: 96, badge: "New" },
  { name: "Nokia G42 5G 128 GB", brand: "Nokia", category: "Phone", tier: "budget", rating: 4.0, reviews: 611 },

  /* ═══ LAPTOPS ══════════════════════════════════════════════════════════ */
  { name: "Apple MacBook Air M3 13-inch 8 GB / 256 GB", brand: "Apple", category: "Laptop", tier: "high", rating: 4.9, reviews: 1284, badge: "Premium", featured: true, deal: true },
  { name: "Apple MacBook Pro 14-inch M3 Pro 18 GB / 512 GB", brand: "Apple", category: "Laptop", tier: "high", rating: 4.9, reviews: 642, badge: "Premium" },
  { name: "HP Pavilion 15 12th Gen Core i5 / 16 GB / 512 GB", brand: "HP", category: "Laptop", tier: "mid", rating: 4.4, reviews: 1533, badge: "Best Seller", featured: true },
  { name: "HP Victus 15 Ryzen 5 / 16 GB / 512 GB", brand: "HP", category: "Laptop", tier: "premium", rating: 4.5, reviews: 887, featured: true },
  { name: "HP EliteBook 840 G10 i7 / 16 GB / 512 GB", brand: "HP", category: "Laptop", tier: "high", rating: 4.6, reviews: 214 },
  { name: "Lenovo IdeaPad Slim 3 Ryzen 5 / 8 GB / 512 GB", brand: "Lenovo", category: "Laptop", tier: "mid", rating: 4.3, reviews: 2094, badge: "Popular" },
  { name: "Lenovo ThinkPad E14 i5 / 16 GB / 512 GB", brand: "Lenovo", category: "Laptop", tier: "premium", rating: 4.6, reviews: 943, featured: true },
  { name: "Lenovo Yoga Slim 7 Ryzen 7 / 16 GB / 1 TB", brand: "Lenovo", category: "Laptop", tier: "high", rating: 4.7, reviews: 376, badge: "New" },
  { name: "Dell Inspiron 15 i5 / 16 GB / 512 GB", brand: "Dell", category: "Laptop", tier: "mid", rating: 4.4, reviews: 1722, badge: "Best Seller", featured: true },
  { name: "Dell XPS 13 Plus i7 / 32 GB / 1 TB", brand: "Dell", category: "Laptop", tier: "high", rating: 4.7, reviews: 418, badge: "Premium" },
  { name: "Dell Latitude 5450 i5 / 16 GB / 512 GB", brand: "Dell", category: "Laptop", tier: "premium", rating: 4.5, reviews: 297 },
  { name: "ASUS VivoBook 15 Core i5 / 16 GB / 512 GB", brand: "Asus", category: "Laptop", tier: "mid", rating: 4.3, reviews: 986 },
  { name: "ASUS ROG Strix G16 RTX 4060 / 16 GB / 1 TB", brand: "Asus", category: "Laptop", tier: "high", rating: 4.8, reviews: 512, badge: "Premium" },

  /* ═══ TABLETS ══════════════════════════════════════════════════════════ */
  { name: "Apple iPad 10th Gen 64 GB Wi-Fi", brand: "Apple", category: "Tablet / iPad", tier: "mid", rating: 4.7, reviews: 1421, badge: "Best Seller", featured: true },
  { name: "Apple iPad Air M2 11-inch 128 GB Wi-Fi", brand: "Apple", category: "Tablet / iPad", tier: "premium", rating: 4.9, reviews: 634, badge: "Premium" },
  { name: "Apple iPad Pro 11-inch M4 256 GB Wi-Fi", brand: "Apple", category: "Tablet / iPad", tier: "high", rating: 4.9, reviews: 288, badge: "Premium", featured: true },
  { name: "Samsung Galaxy Tab S9 FE 5G 128 GB", brand: "Samsung", category: "Tablet / iPad", tier: "premium", rating: 4.6, reviews: 512, badge: "Popular" },
  { name: "Samsung Galaxy Tab A9+ 5G 128 GB", brand: "Samsung", category: "Tablet / iPad", tier: "budget", rating: 4.2, reviews: 876 },
  { name: "Lenovo Tab P12 256 GB", brand: "Lenovo", category: "Tablet / iPad", tier: "mid", rating: 4.1, reviews: 431 },
  { name: "Lenovo IdeaPad Duet 3i 256 GB", brand: "Lenovo", category: "Tablet / iPad", tier: "budget", rating: 4.0, reviews: 298 },
  { name: "Microsoft Surface Go 4 64 GB", brand: "Microsoft", category: "Tablet / iPad", tier: "mid", rating: 4.2, reviews: 356 },

  /* ═══ EARPHONES ════════════════════════════════════════════════════════ */
  { name: "boAt Airdopes 141 TWS Earbuds", brand: "boAt", category: "Airbud", tier: "budget", rating: 4.2, reviews: 3204, badge: "Best Seller", featured: true, deal: true },
  { name: "boAt Rockerz 255 Pro Wireless Headphones", brand: "boAt", category: "Airbud", tier: "budget", rating: 4.1, reviews: 1876, badge: "Popular" },
  { name: "boAt Airdopes 161 ANC TWS Earbuds", brand: "boAt", category: "Airbud", tier: "budget", rating: 4.3, reviews: 1145, badge: "New" },
  { name: "Samsung Galaxy Buds FE 2 TWS Earbuds", brand: "Samsung", category: "Airbud", tier: "budget", rating: 4.2, reviews: 634 },
  { name: "Apple AirPods Pro 2nd Gen USB-C", brand: "Apple", category: "Airbud", tier: "premium", rating: 4.8, reviews: 2814, badge: "Premium", featured: true, deal: true },
  { name: "Apple AirPods 4 ANC", brand: "Apple", category: "Airbud", tier: "mid", rating: 4.6, reviews: 942 },
  { name: "SONY WF-C700N ANC Earbuds", brand: "Sony", category: "Airbud", tier: "mid", rating: 4.5, reviews: 1486, featured: true },
  { name: "SONY WH-CH720N Noise Cancelling Headphones", brand: "Sony", category: "Airbud", tier: "mid", rating: 4.6, reviews: 2103, badge: "Best Seller" },
  { name: "JBL Tune 510BT Wireless Headphones", brand: "JBL", category: "Airbud", tier: "budget", rating: 4.2, reviews: 1654, badge: "Popular" },
  { name: "JBL Tune Beam TWS Earbuds ANC", brand: "JBL", category: "Airbud", tier: "mid", rating: 4.4, reviews: 723 },

  /* ═══ SPEAKERS ══════════════════════════════════════════════════════════ */
  { name: "JBL Go 4 Portable Bluetooth Speaker", brand: "JBL", category: "Speaker", tier: "budget", rating: 4.4, reviews: 2891, badge: "Best Seller", featured: true },
  { name: "JBL Charge 5 Portable Speaker", brand: "JBL", category: "Speaker", tier: "mid", rating: 4.6, reviews: 1432, badge: "Premium" },
  { name: "JBL PartyBox Club 120 Party Speaker", brand: "JBL", category: "Speaker", tier: "premium", rating: 4.5, reviews: 687, featured: true },
  { name: "SONY SRS-XB100 Wireless Speaker", brand: "Sony", category: "Speaker", tier: "budget", rating: 4.3, reviews: 934 },
  { name: "SONY HT-S400 5.1 Channel Soundbar", brand: "Sony", category: "Speaker", tier: "premium", rating: 4.5, reviews: 412 },
  { name: "Bose SoundLink Flex Portable Speaker", brand: "Bose", category: "Speaker", tier: "mid", rating: 4.6, reviews: 856, badge: "Premium" },
  { name: "Bose SoundBar 600 3.1 Channel Soundbar", brand: "Bose", category: "Speaker", tier: "premium", rating: 4.5, reviews: 298 },
  { name: "LG S40TS 300W Soundbar with Subwoofer", brand: "LG", category: "Speaker", tier: "premium", rating: 4.4, reviews: 534, featured: true },

  /* ═══ LIGHT ════════════════════════════════════════════════════════════ */
  { name: 'Philips 18" Ring Light with Stand', brand: "Philips", category: "Light", tier: "mid", rating: 4.5, reviews: 1287, badge: "Best Seller", featured: true },
  { name: "Philips 26\" Bi-Colour LED Panel Light", brand: "Philips", category: "Light", tier: "premium", rating: 4.4, reviews: 423 },
  { name: "Wipro Next 9W LED Smart Bulb (Pack of 2)", brand: "Wipro", category: "Light", tier: "budget", rating: 4.1, reviews: 2214, badge: "Popular" },
  { name: "Wipro Smart LED Batten 20W (Pack of 2)", brand: "Wipro", category: "Light", tier: "budget", rating: 4.2, reviews: 1098 },
  { name: "Syska LED Batten 20W Cool White (Pack of 4)", brand: "Syska", category: "Light", tier: "budget", rating: 4.0, reviews: 1862, badge: "Popular" },
  { name: "Syska 9W LED Bulb (Pack of 6)", brand: "Syska", category: "Light", tier: "budget", rating: 4.1, reviews: 2470 },
  { name: "Godrej Prima LED Batten 18W (Pack of 2)", brand: "Godrej", category: "Light", tier: "budget", rating: 4.0, reviews: 843 },
  { name: "Godrej Ezy LED Panel Light 18W", brand: "Godrej", category: "Light", tier: "budget", rating: 4.1, reviews: 512 },

  /* ═══ DIGITAL BOARDS ═══════════════════════════════════════════════════ */
  { name: 'MAXHUB V6 86" 4K Interactive Flat Panel', brand: "MAXHUB", category: "Digital Board", tier: "high", rating: 4.8, reviews: 412, badge: "Premium", featured: true, deal: true },
  { name: 'MAXHUB V6 75" 4K Interactive Flat Panel', brand: "MAXHUB", category: "Digital Board", tier: "high", rating: 4.7, reviews: 683, badge: "Best Seller", featured: true },
  { name: 'MAXHUB E3 65" 4K Interactive Panel', brand: "MAXHUB", category: "Digital Board", tier: "premium", rating: 4.5, reviews: 528, featured: true },
  { name: 'ViewSonic IFP7550 75" 4K Interactive Display', brand: "ViewSonic", category: "Digital Board", tier: "high", rating: 4.7, reviews: 486, badge: "Best Seller", featured: true, deal: true },
  { name: 'ViewSonic IFP6550 65" 4K Interactive Panel', brand: "ViewSonic", category: "Digital Board", tier: "premium", rating: 4.6, reviews: 331, featured: true },
  { name: 'ViewSonic IFP5550 55" 4K Interactive Panel', brand: "ViewSonic", category: "Digital Board", tier: "premium", rating: 4.4, reviews: 208 },
  { name: 'iSlate 86" AI Interactive Smart Board', brand: "iSlate", category: "Digital Board", tier: "high", rating: 4.6, reviews: 176, badge: "New", featured: true },
  { name: 'iSlate 75" Interactive Flat Panel', brand: "iSlate", category: "Digital Board", tier: "high", rating: 4.5, reviews: 243, badge: "New" },
  { name: 'Evota 75" Dual-OS Interactive Panel', brand: "Evota", category: "Digital Board", tier: "high", rating: 4.4, reviews: 198, badge: "Premium" },
  { name: 'Evota 65" 4K Interactive Panel', brand: "Evota", category: "Digital Board", tier: "premium", rating: 4.3, reviews: 287 },
  { name: 'Samsung Flip WM55R 55" Digital Flipchart', brand: "Samsung", category: "Digital Board", tier: "premium", rating: 4.4, reviews: 214 },
  { name: 'LG 86UH5W 86" 4K UHD Commercial Display', brand: "LG", category: "Digital Board", tier: "high", rating: 4.6, reviews: 356, badge: "Best Seller" },

  /* ═══ COMMERCIAL DISPLAYS ═══════════════════════════════════════════════ */
  { name: 'Samsung QM55R 55" 4K QLED Signage Display', brand: "Samsung", category: "Monitor", tier: "premium", rating: 4.6, reviews: 274, badge: "Best Seller", featured: true, deal: true },
  { name: 'Samsung PM55H 55" Full HD Video Wall Panel', brand: "Samsung", category: "Monitor", tier: "premium", rating: 4.3, reviews: 121 },
  { name: 'LG 75UN711C 75" 4K UHD Commercial TV', brand: "LG", category: "Monitor", tier: "premium", rating: 4.5, reviews: 187, featured: true },
  { name: 'LG 55UN731C 55" 4K UHD Smart TV', brand: "LG", category: "Monitor", tier: "mid", rating: 4.4, reviews: 942, badge: "Popular" },
  { name: 'LG 43UN500 43" 4K UHD LED TV', brand: "LG", category: "Monitor", tier: "budget", rating: 4.2, reviews: 618 },
  { name: 'ViewSonic VA5559 55" Commercial Display', brand: "ViewSonic", category: "Monitor", tier: "premium", rating: 4.3, reviews: 164 },
  { name: 'ViewSonic VP2756 27" 4K USB-C Monitor', brand: "ViewSonic", category: "Monitor", tier: "mid", rating: 4.5, reviews: 431 },
  { name: 'HP V27 G5 27" FHD IPS Monitor', brand: "HP", category: "Monitor", tier: "mid", rating: 4.3, reviews: 726, badge: "Popular" },
  { name: 'HP P24 G5 24" FHD Office Monitor', brand: "HP", category: "Monitor", tier: "budget", rating: 4.2, reviews: 534 },

  /* ═══ OPS / COMPUTING MODULES ═══════════════════════════════════════════ */
  { name: "Intel i5 OPS Computer Module 8 GB / 256 GB", brand: "Intel", category: "OPS", tier: "mid", rating: 4.5, reviews: 403, badge: "Best Seller", featured: true, deal: true },
  { name: "Intel i7 OPS Computer Module 16 GB / 512 GB", brand: "Intel", category: "OPS", tier: "premium", rating: 4.7, reviews: 152, badge: "Premium", featured: true },
  { name: "AMD Ryzen 5 OPS Module 16 GB / 512 GB", brand: "AMD", category: "OPS", tier: "premium", rating: 4.6, reviews: 187, badge: "New" },
  { name: "AMD Ryzen 7 OPS Module 16 GB / 1 TB", brand: "AMD", category: "OPS", tier: "high", rating: 4.7, reviews: 94 },
  { name: "Evota Core i5 OPS Module 8 GB / 256 GB", brand: "Evota", category: "OPS", tier: "mid", rating: 4.4, reviews: 231 },
  { name: "Evota Mini OPS Module 8 GB / 128 GB", brand: "Evota", category: "OPS", tier: "budget", rating: 4.3, reviews: 387 },
  { name: "Evota Pro i7 OPS Module 32 GB / 1 TB", brand: "Evota", category: "OPS", tier: "high", rating: 4.8, reviews: 76, badge: "Premium" },

  /* ═══ CAMERAS ═══════════════════════════════════════════════════════════ */
  { name: "Canon EOS R50 Mirrorless Camera 24 MP", brand: "Canon", category: "Camera", tier: "high", rating: 4.8, reviews: 412, badge: "Premium", featured: true },
  { name: "Canon EOS 200D II Kit with 18-55mm Lens", brand: "Canon", category: "Camera", tier: "premium", rating: 4.6, reviews: 687 },
  { name: "SONY Alpha 6400 Mirrorless 24 MP", brand: "Sony", category: "Camera", tier: "high", rating: 4.7, reviews: 534, badge: "Best Seller", featured: true },
  { name: "SONY Alpha ZV-E10 Vlogging Camera", brand: "Sony", category: "Camera", tier: "premium", rating: 4.7, reviews: 398, badge: "Popular", featured: true },
  { name: "SONY DSC-W830 20 MP Compact Camera", brand: "Sony", category: "Camera", tier: "budget", rating: 4.1, reviews: 812 },
  { name: "Nikon D5600 DSLR with 18-55mm Lens", brand: "Nikon", category: "Camera", tier: "premium", rating: 4.6, reviews: 743 },
  { name: "Nikon Z30 Mirrorless Camera 20 MP", brand: "Nikon", category: "Camera", tier: "premium", rating: 4.7, reviews: 356, badge: "New" },
  { name: "Fujifilm Instax Mini 12 Instant Camera", brand: "Fujifilm", category: "Camera", tier: "mid", rating: 4.6, reviews: 1094, badge: "Popular" },

  /* ═══ MICROPHONES ══════════════════════════════════════════════════════ */
  { name: "Shure SM58 Dynamic Vocal Microphone", brand: "Shure", category: "Mic", tier: "mid", rating: 4.8, reviews: 2143, badge: "Best Seller", featured: true },
  { name: "Shure MV7 USB Streaming Microphone", brand: "Shure", category: "Mic", tier: "premium", rating: 4.7, reviews: 687, badge: "Premium", featured: true, deal: true },
  { name: "Blue Yeti USB Condenser Microphone", brand: "Blue Yeti", category: "Mic", tier: "mid", rating: 4.6, reviews: 3204, badge: "Popular" },
  { name: "Blue Yeti X USB Microphone", brand: "Blue Yeti", category: "Mic", tier: "premium", rating: 4.5, reviews: 412 },
  { name: "Rode NT-USB Mini USB Microphone", brand: "Rode", category: "Mic", tier: "premium", rating: 4.6, reviews: 534, badge: "New" },
  { name: "Rode Wireless GO II Dual Channel Kit", brand: "Rode", category: "Mic", tier: "premium", rating: 4.7, reviews: 876, badge: "Premium", featured: true },
  { name: "Audio-Technica AT2020 USB-XL USB Microphone", brand: "Audio-Technica", category: "Mic", tier: "mid", rating: 4.6, reviews: 943 },
  { name: "Audio-Technica ATR2100i-USB Cardioid Mic", brand: "Audio-Technica", category: "Mic", tier: "mid", rating: 4.5, reviews: 621 },

  /* ═══ TRIPODS & MOUNTS ══════════════════════════════════════════════════ */
  { name: "DIGITEK Tripod 55\" for Camera", brand: "DIGITEK", category: "Tripod", tier: "budget", rating: 4.2, reviews: 1842, badge: "Best Seller" },
  { name: "DIGITEK Tabletop Tripod 40 cm", brand: "DIGITEK", category: "Tripod", tier: "budget", rating: 4.1, reviews: 986 },
  { name: "Tygot TF-08 Tripod with Bluetooth Remote", brand: "Tygot", category: "Tripod", tier: "budget", rating: 4.0, reviews: 723, badge: "Popular" },
  { name: "Tygot Flexi Gorilla Tripod", brand: "Tygot", category: "Tripod", tier: "budget", rating: 4.2, reviews: 1654 },
  { name: "Syvo 3m Heavy Duty Video Tripod", brand: "Syvo", category: "Tripod", tier: "mid", rating: 4.3, reviews: 812 },
  { name: "NAFA Studio Tripod 1.8 m Fluid Head", brand: "NAFA", category: "Tripod", tier: "premium", rating: 4.5, reviews: 287, badge: "Premium", featured: true },
  { name: "ULANZI MT-44 Travel Tripod", brand: "ULANZI", category: "Tripod", tier: "mid", rating: 4.6, reviews: 634, badge: "New" },
  { name: "ULANZI Phone Holder Clamp", brand: "ULANZI", category: "Tripod", tier: "budget", rating: 4.4, reviews: 1128, badge: "Popular" },

  /* ═══ ACCESSORIES ══════════════════════════════════════════════════════ */
  { name: "Cables Certified 8K HDMI Cable 3 m", brand: "Cables", category: "Accessories", tier: "budget", rating: 4.4, reviews: 2104, badge: "Best Seller", featured: true, deal: true },
  { name: "Cables USB-C 100 W Braided Cable 2 m", brand: "Cables", category: "Accessories", tier: "budget", rating: 4.5, reviews: 3204, badge: "Popular" },
  { name: "Cables XLR Balanced Cable 5 m", brand: "Cables", category: "Accessories", tier: "mid", rating: 4.3, reviews: 287 },
  { name: "Cables Cat6 LAN Patch Cable 3 m", brand: "Cables", category: "Accessories", tier: "budget", rating: 4.2, reviews: 612 },
  { name: "Mounts Heavy Duty Wall Mount for 55\"-98\"", brand: "Mounts", category: "Accessories", tier: "mid", rating: 4.5, reviews: 743, badge: "Best Seller", featured: true },
  { name: "Mounts Ceiling Mount for 43\"-75\"", brand: "Mounts", category: "Accessories", tier: "mid", rating: 4.3, reviews: 421 },
  { name: "Mounts Camera Doubler Base", brand: "Mounts", category: "Accessories", tier: "budget", rating: 4.2, reviews: 198 },
  { name: "Stands Active Stylus Pen (Pack of 2)", brand: "Stands", category: "Accessories", tier: "budget", rating: 4.6, reviews: 1024, badge: "Popular", featured: true },
  { name: "Stands Boom Arm Desk Clamp for Microphone", brand: "Stands", category: "Accessories", tier: "mid", rating: 4.5, reviews: 431 },
  { name: "Stands Tablet Folio Case 11\"", brand: "Stands", category: "Accessories", tier: "mid", rating: 4.3, reviews: 356 },
  { name: "Adapters 65 W GaN Fast Charger", brand: "Adapters", category: "Accessories", tier: "budget", rating: 4.6, reviews: 1103, badge: "Popular", featured: true },
  { name: "Adapters 120 W GaN Laptop Charger", brand: "Adapters", category: "Accessories", tier: "mid", rating: 4.5, reviews: 534 },
  { name: "Adapters USB-C to HDMI Adapter 4K", brand: "Adapters", category: "Accessories", tier: "budget", rating: 4.2, reviews: 743 },
  { name: "Adapters USB-A to USB-C OTG Adapter", brand: "Adapters", category: "Accessories", tier: "budget", rating: 4.1, reviews: 987 },
  { name: "Ecommerce Wireless Keyboard & Mouse Combo", brand: "Ecommerce", category: "Accessories", tier: "mid", rating: 4.4, reviews: 693, badge: "Popular" },
  { name: "Ecommerce Laptop Sleeve 14\"", brand: "Ecommerce", category: "Accessories", tier: "budget", rating: 4.5, reviews: 288 },
  { name: "Ecommerce Laptop Sleeve 16\"", brand: "Ecommerce", category: "Accessories", tier: "budget", rating: 4.4, reviews: 176 },

  /* ═══ ACOUSTIC & PODIUM ════════════════════════════════════════════════ */
  { name: 'LG 86" Acoustic Ceiling Tile (Box of 6)', brand: "LG", category: "Acoustic", tier: "mid", rating: 4.3, reviews: 87 },
  { name: "Samsung 60 cm Acoustic Panel (Box of 8)", brand: "Samsung", category: "Acoustic", tier: "mid", rating: 4.2, reviews: 64 },
  { name: "Panasonic Acoustic Wall Panel (Box of 10)", brand: "Panasonic", category: "Acoustic", tier: "mid", rating: 4.1, reviews: 52 },
  { name: "Ecommerce Custom Podium for Lectern", brand: "Custom", category: "Podium", tier: "premium", rating: 4.4, reviews: 41, badge: "Made to order" },
  { name: "Ecommerce Wooden Podium Stand", brand: "Wooden", category: "Podium", tier: "premium", rating: 4.5, reviews: 68 },
  { name: "Ecommerce Acrylic Podium Stand", brand: "Acrylic", category: "Podium", tier: "mid", rating: 4.2, reviews: 57 },
  { name: 'Ecommerce Acoustic Ceiling Tile 20mm (Box of 8)', brand: "Ecommerce", category: "Acoustic", tier: "budget", rating: 4.2, reviews: 39 },
  { name: "Ecommerce Bass Trap Corner Set (Pair)", brand: "Ecommerce", category: "Acoustic", tier: "mid", rating: 4.4, reviews: 28, badge: "New" },
  { name: "Ecommerce Podium with Built-in Mic", brand: "Custom", category: "Podium", tier: "premium", rating: 4.5, reviews: 33, badge: "Made to order" },
  { name: "Ecommerce Mobile Lectern Stand", brand: "Wooden", category: "Podium", tier: "budget", rating: 4.3, reviews: 46 },
];
