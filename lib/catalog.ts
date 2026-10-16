/**
 * Single source of truth for the storefront catalogue taxonomy.
 *
 * Both the Navbar mega menu and the Admin Dashboard product form render brands from
 * BRAND_GRID, so a brand added here shows up in both places at once.
 *
 * `Obryn` leads every list because the catalogue is now house-brand — every seeded
 * product has `brand = 'Obryn'`. The third-party names are kept so the filter still
 * works if you ever list real branded stock alongside your own; remove the ones you
 * do not carry, or the mega menu will offer filters that match nothing.
 *
 * BRAND NAMES MUST MATCH `products.brand` EXACTLY. PostgREST `.eq()` is
 * case-sensitive, so "SONY" here would return nothing for "Sony" stock. The seed
 * uses `Sony` throughout; keep the two in step.
 */

export type BrandGrid = Record<string, string[]>;

export const BRAND_GRID: BrandGrid = {
  Phone: [
    "Obryn",
    "Apple",
    "Samsung",
    "Xiaomi",
    "Redmi",
    "Oneplus",
    "Poco",
    "Vivo",
    "Oppo",
    "Realme",
    "Motorola",
    "Nokia",
  ],
  Laptop: ["Obryn", "Apple", "HP", "Lenovo", "Dell", "Asus"],
  Airbud: ["Obryn", "boAt", "Samsung", "Apple", "Sony", "JBL"],
  Speaker: ["Obryn", "JBL", "Sony", "Bose", "LG"],
  Light: ["Obryn", "Philips", "Wipro", "Syska", "Godrej"],
  "Digital Board": [
    "Obryn",
    "Apple",
    "Samsung",
    "HP",
    "Lenovo",
    "Dell",
    "Honor",
    "LG",
    "MAXHUB",
    "ViewSonic",
    "iSlate",
    "Evota",
  ],
  Tripod: ["Obryn", "DIGITEK", "Tygot", "Syvo", "NAFA", "ULANZI"],
  Camera: ["Obryn", "Canon", "Sony", "Nikon", "Fujifilm"],
  Mic: ["Obryn", "Shure", "Blue Yeti", "Rode", "Audio-Technica"],
  OPS: ["Obryn", "Evota", "Intel", "AMD"],
  Monitor: ["Obryn", "LG", "Samsung", "ViewSonic", "HP", "Dell"],
  Acoustic: ["Obryn", "LG", "Samsung", "Panasonic"],
  Podium: ["Custom", "Wooden", "Acrylic"],
  Accessories: ["Obryn", "Cables", "Mounts", "Stands", "Adapters"],
  "Tablet / iPad": ["Obryn", "Apple", "Samsung", "Lenovo", "Microsoft"],
};

/**
 * Categories whose mega-menu right column shows a "Buy Refurbished <Category>" panel
 * instead of Popular Filters. Each entry reuses that category's own brand list so the
 * two columns can never drift apart.
 */
export const REFURBISHED_CATEGORIES: Record<
  string,
  { title: string; brands: string[] }
> = {
  Phone: { title: "Buy Refurbished Phones", brands: BRAND_GRID.Phone },
  Laptop: { title: "Buy Refurbished Laptops", brands: BRAND_GRID.Laptop },
};
