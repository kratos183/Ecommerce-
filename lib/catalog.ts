/**
 * Single source of truth for the storefront catalogue taxonomy.
 *
 * Both the Navbar mega menu and the Admin Dashboard product form render brands from
 * BRAND_GRID, so a brand added here shows up in both places at once.
 *
 * `Ecommerce` leads every list as the house brand. The third-party names are the
 * manufacturers actually stocked — Apple, Samsung, Canon, Shure and so on — so the
 * brand filter is doing real work rather than filtering on our own name.
 *
 * CAVEAT: a brand listed here with no matching stock produces a filter that returns
 * nothing. `npm run test:catalogue` reports which of these have no products so the
 * list cannot quietly drift; remove any you do not carry.
 *
 * BRAND NAMES MUST MATCH `products.brand` EXACTLY. PostgREST `.eq()` is
 * case-sensitive, so "SONY" here would return nothing for "Sony" stock. The seed
 * uses `Sony` throughout; keep the two in step.
 */

export type BrandGrid = Record<string, string[]>;

export const BRAND_GRID: BrandGrid = {
  Phone: [
    "Ecommerce",
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
  Laptop: ["Ecommerce", "Apple", "HP", "Lenovo", "Dell", "Asus"],
  Airbud: ["Ecommerce", "boAt", "Samsung", "Apple", "Sony", "JBL"],
  Speaker: ["Ecommerce", "JBL", "Sony", "Bose", "LG"],
  Light: ["Ecommerce", "Philips", "Wipro", "Syska", "Godrej"],
  "Digital Board": [
    "Ecommerce",
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
  Tripod: ["Ecommerce", "DIGITEK", "Tygot", "Syvo", "NAFA", "ULANZI"],
  Camera: ["Ecommerce", "Canon", "Sony", "Nikon", "Fujifilm"],
  Mic: ["Ecommerce", "Shure", "Blue Yeti", "Rode", "Audio-Technica"],
  OPS: ["Ecommerce", "Evota", "Intel", "AMD"],
  Monitor: ["Ecommerce", "LG", "Samsung", "ViewSonic", "HP", "Dell"],
  Acoustic: ["Ecommerce", "LG", "Samsung", "Panasonic"],
  Podium: ["Custom", "Wooden", "Acrylic"],
  Accessories: ["Ecommerce", "Cables", "Mounts", "Stands", "Adapters"],
  "Tablet / iPad": ["Ecommerce", "Apple", "Samsung", "Lenovo", "Microsoft"],
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
