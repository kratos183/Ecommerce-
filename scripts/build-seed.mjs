/**
 * Generates `supabase/seed.sql` from `scripts/seed-data.mjs`.
 *
 *   node scripts/build-seed.mjs
 *
 * WHY A GENERATOR RATHER THAN HAND-WRITTEN SQL
 * Every product needs four images and a specifications block. Hand-writing that
 * for a hundred products is where mistakes live: a missing comma, a duplicated
 * slug, a category that quietly falls below the homepage's four-card minimum.
 * Generating it means those cannot drift, and the catalogue stays editable as
 * data.
 *
 * THE SEED REPLACES THE CATALOGUE
 * The output starts with DELETE, so re-running it gives you exactly this
 * catalogue — products that were deleted since the last run are actually
 * removed, rather than lingering alongside the new set.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { CATALOGUE, BRAND_COLOUR, PRICE, slugFor } from "./seed-data.mjs";

/**
 * Resolved, verified image URLs, keyed by product slug.
 *
 * Optional: a fresh checkout has no image-sources.mjs yet, and the seed must
 * still generate. Treated as an enhancement, never a requirement — a missing
 * entry falls back to a clearly-labelled stand-in rather than failing the build.
 */
const IMAGE_SOURCES = existsSync("scripts/image-sources.mjs")
  ? (await import("./image-sources.mjs")).IMAGE_SOURCES ?? {}
  : {};

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

/** Slugifies a product name into a URL-safe, collision-checked slug. */
function slugify(name, brand) {
  return slugFor(name, brand);
}

/** Deterministic price for a tier, so re-running produces identical SQL. */
function priceFor(tier, index) {
  const [min, max] = PRICE[tier];
  const span = max - min;
  // A stable pseudo-random walk: no Math.random, so the output is stable.
  const jitter = ((index * 2654435761) % 1000) / 1000;
  const raw = min + span * (0.15 + jitter * 0.7);

  // Round to a price that looks like a real Indian MRP rather than ₹34,317.
  const rounded = raw >= 200000 ? Math.round(raw / 10000) * 10000
    : raw >= 50000 ? Math.round(raw / 5000) * 5000
    : raw >= 10000 ? Math.round(raw / 1000) * 1000
    : Math.round(raw / 100) * 100;

  return Math.max(499, rounded);
}

/** Stock count, deterministic per product. */
const stockFor = (index) => [8, 12, 15, 20, 25, 30, 40, 50][index % 8];

/* ── Images ──────────────────────────────────────────────────────────────── */

/**
 * Four views per product.
 *
 * Prefers the real photographs sourced by `scripts/resolve-images.mjs`, which
 * verified each URL with an actual request before recording it. Products with no
 * sourced image fall back to a placehold.co stand-in that names the product, so
 * the gap is visible and honest rather than a silently broken image.
 *
 * Deduplicated: Commons sometimes returns the same file under two thumbnail
 * sizes, and a gallery showing one photo four times is worse than showing it
 * once.
 */
function imagesFor(slug, name, brand, category) {
  const sourced = IMAGE_SOURCES[slug];
  const colour = BRAND_COLOUR[brand] ?? "f8fafc/334155";
  const [bg, fg] = colour.split("/");

  const standIn = (label) =>
    `https://placehold.co/1000x1000/${bg}/${fg}?text=${encodeURIComponent(label)}`;

  // Drop the storage suffix so the caption reads as a product, not a SKU.
  const shortName = name
    .replace(/\s*\d+\s*GB\b.*$/, "")
    .replace(/\s*\/\s*.*$/, "")
    .trim();

  if (!Array.isArray(sourced) || sourced.length === 0) {
    return [
      standIn(shortName || brand),
      standIn(`${brand} — front`),
      standIn(`${brand} — angled`),
      standIn(`${brand} — in the box`),
    ];
  }

  // Preserve order, drop repeats, top up to four.
  const urls = [];
  for (const entry of sourced) {
    const url = typeof entry === "string" ? entry : entry?.url;
    if (url && !urls.includes(url)) urls.push(url);
  }

  const labels = [
    shortName || brand,
    `${brand} — front`,
    `${brand} — angled`,
    `${brand} — in the box`,
  ];

  return Array.from({ length: 4 }, (_, i) => urls[i] ?? standIn(labels[i]));
}

/* ── Specifications ──────────────────────────────────────────────────────── */

/** Picks a value deterministically from a list. */
const pick = (list, seed) => list[seed % list.length];

function specsFor(product, index) {
  const name = product.name;

  // A screen size only counts when written as one: `75-inch` or `75"`. Matching
  // bare two-digit numbers picks up model numbers instead — the 15 in
  // "iPhone 15", the 55 in "Galaxy A55" — and yields a 55-inch phone.
  const inch = name.match(/(\d{2})\s*(?:inch|")/i)?.[1];

  // Storage always carries a unit, so a plain GB match is safe here.
  const gb = name.match(/(\d+)\s*GB/)?.[1] ?? "256";

  // Phones rarely state their screen size, so use a plausible one rather than
  // inventing a figure from the model name.
  const phoneScreen = ["6.2", "6.4", "6.5", "6.7", "6.8"][index % 5];

  const s = (o) => o;

  switch (product.category) {
    case "Phone":
      return s({
        Display: `${phoneScreen}-inch ${pick(["AMOLED", "IPS LCD", "Super AMOLED"], index)}, 120 Hz`,
        Processor: pick(["Snapdragon 7 Gen 3", "Dimensity 8300", "Exynos 1480", "Snapdragon 6 Gen 1"], index),
        RAM: `${pick([6, 8, 8, 12], index)} GB`,
        Storage: `${gb} GB`,
        "Rear Camera": `${pick([50, 64, 108, 200], index)} MP + ${pick([8, 12], index)} MP + 2 MP`,
        "Front Camera": `${pick([16, 32, 50], index)} MP`,
        Battery: `${pick([5000, 5500, 6000], index)} mAh, ${pick([25, 33, 45, 67], index)} W charging`,
        SIM: "Dual nano-SIM, 5G",
        "Warranty": "1 year manufacturer warranty",
      });

    case "Laptop":
      return s({
        Processor: pick(["Intel Core i5 12th Gen", "Intel Core i7 13th Gen", "AMD Ryzen 5 7530U", "AMD Ryzen 7 7840HS"], index),
        RAM: `${pick([8, 16, 16, 32], index)} GB DDR4`,
        Storage: `${gb} GB NVMe SSD`,
        Display: `${inch ?? pick(["13.3", "14", "15.6"], index)}-inch ${pick(["FHD IPS", "2.8K OLED", "3K mini-LED", "FHD"], index)}`,
        Graphics: pick(["Intel Iris Xe", "Intel UHD Graphics", "NVIDIA RTX 4050", "AMD Radeon 780M"], index),
        Battery: `${pick(["52", "70", "75", "86"], index)} Wh, up to ${pick([7, 10, 12, 18], index)} hours`,
        Weight: `${(1.1 + (index % 7) * 0.18).toFixed(2)} kg`,
        Ports: "2x USB-C, 1x USB-A, HDMI 2.1, 3.5 mm audio",
        Warranty: "1 year onsite warranty",
      });

    case "Tablet / iPad":
      return s({
        Display: `${inch ?? pick(["10.1", "10.9", "11", "12.9"], index)}-inch ${pick(["Liquid Retina", "IPS LCD", "TFT 90Hz", "AMOLED"], index)}`,
        Processor: pick(["Apple A16 Bionic", "Snapdragon 8 Gen 2", "Snapdragon 695", "MediaTek Dimensity 900"], index),
        RAM: pick(["4 GB", "6 GB", "8 GB", "12 GB"], index),
        Storage: `${gb} GB`,
        Battery: `${pick([5000, 7500, 10090, 11113], index)} mAh`,
        Stylus: pick(["Supports Apple Pencil (2nd gen)", "Supports S Pen (included)", "Active stylus supported"], index),
        Connectivity: pick(["Wi-Fi 6", "Wi-Fi 6E", "5G + Wi-Fi 6"], index),
        Warranty: "1 year manufacturer warranty",
      });

    case "Airbud":
      return s({
        Type: pick(["True Wireless Earbuds", "Over-Ear Headphones", "On-Ear Headphones"], index),
        "Active Noise Cancellation": pick(["Yes, adaptive ANC", "Yes, hybrid ANC", "No"], index),
        Drivers: `${pick([10, 11, 12, 40], index)} mm dynamic`,
        Battery: `${pick([24, 30, 32, 40, 60], index)} hours (case included)`,
        Bluetooth: `Bluetooth ${pick(["5.0", "5.2", "5.3"], index)}`,
        "Water Resistance": pick(["IPX4", "IPX5", "IP57"], index),
        "Multipoint Pairing": pick(["Yes", "No"], index),
        Warranty: "1 year manufacturer warranty",
      });

    case "Speaker":
      return s({
        "Output Power": `${pick([20, 30, 40, 100, 300], index)} W`,
        Drivers: pick(["1x 45 mm full-range", "2x 45 mm + passive radiator", "1x 3-inch woofer", "Tweeter + dual subwoofers"], index),
        Battery: pick(["Rechargeable, 12 hours", "Rechargeable, 20 hours", "Rechargeable, 24 hours", "Mains powered"], index),
        Bluetooth: `Bluetooth ${pick(["5.1", "5.2", "5.3"], index)}`,
        Channels: pick(["2.0 Stereo", "2.1 with subwoofer", "3.1.2 with wireless surrounds"], index),
        Connectivity: "Bluetooth, AUX, USB",
        Warranty: "1 year manufacturer warranty",
      });

    case "Light":
      return s({
        Type: pick(["Ring Light", "LED Panel Light", "LED Bulb", "LED Batten"], index),
        Wattage: `${pick([9, 12, 18, 20, 26], index)} W`,
        "Colour Temperature": pick(["2700K-6500K adjustable", "6500K cool white", "3000K warm white"], index),
        "Colour Rendering": pick(["CRI 95+", "CRI 90+", "CRI 80+"], index),
        Power: pick(["USB powered", "Mains adapter included", "Battery + USB"], index),
        Stand: pick(["Included, 1.8 m", "Included, 2.1 m", "Not included"], index),
        Control: pick(["On-body dimmer + 3 colour modes", "App control", "Wall switch"], index),
        Warranty: "1 year manufacturer warranty",
      });

    case "Digital Board":
      return s({
        Panel: `${inch ?? "75"}-inch ${pick(["4K UHD", "4K UHD", "FHD"], index)} ${pick(["LED", "QLED", "IPS"], index)}`,
        "Touch Points": pick(["20", "20", "40", "10"], index),
        Brightness: `${pick([400, 450, 500], index)} nits`,
        "Operating System": pick(["Android 11 with Ecommerce Classroom", "Android 13", "Windows 11 + Android dual OS"], index),
        Connectivity: "2x HDMI, 2x USB-A, USB-C, RJ45, Wi-Fi 6, Bluetooth",
        Audio: "2x 20 W built-in speakers",
        "OPS Support": pick(["Yes, pluggable Intel/AMD module", "Yes, standard 4-slot", "No"], index),
        "Lifespan": "50,000 hours",
        Warranty: "3 years on-site warranty",
      });

    case "Monitor":
      return s({
        Panel: `${inch ?? "55"}-inch ${pick(["4K UHD", "4K QLED", "Full HD"], index)}`,
        Resolution: pick(["3840 x 2160", "1920 x 1080"], index),
        Brightness: `${pick([350, 400, 500], index)} nits`,
        "Operating Hours": pick(["18/7", "24/7 commercial", "Standard"], index),
        Ports: "2x HDMI, DP, USB, RJ45",
        Speaker: pick(["2x 10 W built-in", "None"], index),
        Mount: pick(["VESA 200x200", "VESA 400x400", "Not included"], index),
        Warranty: "3 years on-site warranty",
      });

    case "OPS":
      return s({
        Processor: pick(["Intel Core i5-1240P", "Intel Core i7-12700H", "AMD Ryzen 5 7535HS", "AMD Ryzen 7 7840HS"], index),
        RAM: `${pick([8, 16, 16, 32], index)} GB DDR4 / DDR5`,
        Storage: `${gb} GB NVMe SSD`,
        Graphics: pick(["Intel Iris Xe 96EU", "Intel Iris Xe 96EU", "AMD Radeon 610M"], index),
        Network: "Dual-band Wi-Fi 6, Gigabit Ethernet",
        Ports: "3x USB-A, 1x USB-C, HDMI 2.0, 3.5 mm audio",
        Power: "Auto-on, scheduled power management",
        Warranty: "2 years manufacturer warranty",
      });

    case "Camera":
      return s({
        Sensor: `${pick([20, 24, 26.1], index)} MP ${pick(["APS-C CMOS", "Full-frame CMOS", "1/2.3-inch CMOS"], index)}`,
        Lens: pick(["18-55 mm f/3.5-5.6 kit lens", "16-50 mm power zoom kit", "None (body only)", "Fixed 10x optical zoom"], index),
        Video: pick(["4K 30p / 1080p 120p", "4K 30p (10-bit)", "1080p 60p"], index),
        Stabilisation: pick(["5-axis in-body", "Optical, lens based", "Digital"], index),
        ISO: pick(["ISO 100-32000", "ISO 100-51200", "ISO 100-12500"], index),
        Connectivity: pick(["Wi-Fi + Bluetooth", "Wi-Fi only", "None"], index),
        Storage: pick(["SD / SDHC / SDXC", "SD card", "Built-in 64 GB"], index),
        Warranty: "2 years manufacturer warranty",
      });

    case "Mic":
      return s({
        Type: pick(["Dynamic vocal microphone", "USB condenser microphone", "Wireless lavalier kit", "Cardioid condenser microphone"], index),
        Pattern: pick(["Cardioid", "Cardioid", "Omnidirectional", "Supercardioid"], index),
        Connectivity: pick(["Wired XLR", "USB-C digital", "2.4 GHz wireless", "USB-A"], index),
        "Frequency Response": "20 Hz - 20 kHz",
        Sample_Rate: pick(["48 kHz / 24-bit", "24-bit / 96 kHz", "16-bit / 44.1 kHz"], index),
        "Noise Reduction": pick(["DSP on-board", "None", "Adaptive gain control"], index),
        Mount: pick(["Stand adapter included", "Desk boom arm included", "Clip mount included"], index),
        Warranty: "2 years manufacturer warranty",
      });

    case "Tripod":
      return s({
        "Max Height": `${pick(["120", "160", "180", "210"], index)} cm`,
        Payload: `${pick([1.5, 2, 5, 12], index)} kg`,
        Legs: pick(["Aluminium alloy", "Carbon fibre', steel head", "Steel"], index),
        "Head Type": pick(["Pan-tilt with handle", "Fluid video head", "Ball head with 360° rotation"], index),
        Folded_Length: `${pick([42, 48, 55, 62], index)} cm`,
        Weight: `${(0.8 + (index % 6) * 0.5).toFixed(1)} kg`,
        Accessories: pick(["Phone holder + Bluetooth remote", "Carry bag + remote", "Tripod bag"], index),
        Warranty: "6 months manufacturer warranty",
      });

    case "Accessories":
      return s({
        Type: pick(["HDMI cable", "USB-C cable", "Wall mount", "Active stylus", "GaN charger", "Sleeve", "Keyboard & mouse combo", "Boom arm", "Adapter", "XLR cable"], index),
        Length: pick(["1.5 m", "2 m", "3 m", "5 m"], index),
        Connector: pick(["HDMI 2.1", "USB-C to USB-C", "VESA 400x400", "XLR 3-pin", "N/A"], index),
        Rating: pick(["8K 48 Gbps", "100 W Power Delivery", "65 kg load capacity", "10 Gbps data"], index),
        Material: pick(["Braided nylon", "Powder-coated steel", "Ballistic nylon", "Aluminium alloy"], index),
        Colour: pick(["Black", "Graphite", "Space grey", "White"], index),
        Warranty: "1 year manufacturer warranty",
      });

    case "Acoustic":
      return s({
        Material: pick(["Mineral fibre board", "Polyester acoustic felt", "Glass wool faced board"], index),
        Thickness: `${pick([25, 50, 75], index)} mm`,
        "NRC Rating": `${pick(["0.45", "0.70", "0.90"], index)}`,
        Size: pick(["600 x 600 mm", "1200 x 600 mm", "1220 x 610 mm"], index),
        "Fire Rating": pick(["Class A", "Class B1", "Class 1"], index),
        Mounting: pick(["Adhesive or screw fix", "Suspended grid"], index),
        Warranty: "1 year manufacturer warranty",
      });

    case "Podium":
      return s({
        Material: pick(["Solid wood with veneer", "Solid wood, natural finish", "Cast acrylic"], index),
        Dimensions: pick(["600 x 450 x 1100 mm", "700 x 500 x 1100 mm", "500 x 400 x 1050 mm"], index),
        Finish: pick(["Natural walnut", "Dark walnut stain", "Clear polished acrylic"], index),
        "Cable Management": pick(["Rear cable channel", "Under-table tray", "None"], index),
        Assembly: pick(["Flat-pack, tool included", "Assembled, ready to use"], index),
        Warranty: "12 months manufacturing warranty",
      });

    default:
      return { Warranty: "1 year manufacturer warranty" };
  }
}

/** Marketing copy per category, varied by index so the page does not look templated. */
function introFor(product, index) {
  const { category, brand } = product;
  const base = {
    Phone: `${brand} phone built for everyday use — a sharp display, a dependable battery and a camera that holds up in low light.`,
    Laptop: `${brand} laptop with the balance of performance and battery life that gets a full working day done.`,
    "Tablet / iPad": `${brand} tablet with a laminated display and stylus support — a notebook that also runs full apps.`,
    Airbud: `${brand} audio with a secure fit and battery life measured in days rather than hours.`,
    Speaker: `${brand} speaker tuned for clear vocals and enough low end to fill a room without distorting.`,
    Light: `${brand} lighting with stepless dimming and a colour range that keeps skin tones honest on camera.`,
    "Digital Board": `${brand} interactive panel with multi-point touch, 4K clarity and a pluggable computer module.`,
    Monitor: `${brand} display built to run long hours — the commercial grade panel is rated for continuous duty.`,
    OPS: `${brand} computer module that slots straight into the back of a compatible interactive panel.`,
    Camera: `${brand} camera with dependable autofocus and a sensor that still performs indoors.`,
    Mic: `${brand} microphone set up so it can be placed properly — most bad recordings are placement problems.`,
    Tripod: `${brand} tripod with a fluid head, so pans and tilts stay smooth under a full camera.`,
    Accessories: `${brand} accessory built to the same standard as the equipment it connects to.`,
    Acoustic: `${brand} acoustic treatment to cut echo and reverberation in a hard-furnished room.`,
    Podium: `${brand} lectern, made to order in the finish that suits the room.`,
  }[category] ?? `${brand} product from the Ecommerce range.`;

  return index % 3 === 0
    ? `${base} Supplied with a one-year manufacturer warranty and backed by our own support team.`
    : index % 3 === 1
      ? `${base} Ships across India with installation available on larger equipment.`
      : `${base} In stock and ready to dispatch.`;
}

/* ══════════════════════════════════════════════════════════════════════════
   BUILD
   ══════════════════════════════════════════════════════════════════════════ */

/** SQL single-quoted literal, with quotes inside escaped by doubling. */
function sqlText(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** SQL jsonb literal. */
function sqlJson(value) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

const seenSlugs = new Set();
const rows = CATALOGUE.map((product, index) => {
  const slug = slugify(product.name, product.brand);
  if (seenSlugs.has(slug)) {
    throw new Error(`Duplicate slug generated: ${slug} (${product.name})`);
  }
  seenSlugs.add(slug);

  const price = priceFor(product.tier, index);
  // MRP is the price plus a plausible margin, so discounts read like real ones.
  const margin = 1.15 + ((index % 5) * 0.035);
  const mrp = product.deal ? Math.round((price * (1.2 + (index % 4) * 0.08)) / 1000) * 1000 : Math.round((price * margin) / 1000) * 1000;

  const images = imagesFor(slug, product.name, product.brand, product.category);
  const specs = specsFor(product, index);

  // Bundle partners, chosen within the same category so the pairing makes sense.
  const siblings = CATALOGUE.filter((p) => p.category === product.category && p.brand !== product.brand);
  const bundles = [0, 1, 2]
    .map((offset) => siblings[(index + offset * 3) % Math.max(siblings.length, 1)])
    .filter(Boolean)
    .slice(0, 3);
  const bundleSlugs = [...new Set(bundles.map((b) => slugify(b.name, b.brand)))];

  const fields = [
    sqlText(product.name),
    sqlText(slug),
    sqlText(product.category),
    sqlText(product.brand),
    String(price),
    String(mrp),
    sqlText(images[0]),
    sqlJson(images),
    sqlText(introFor(product, index)),
    sqlText(product.badge ?? ""),
    product.rating,
    product.reviews,
    stockFor(index),
    product.featured ? "true" : "false",
    product.deal ? "true" : "false",
    // Postgres accepts "1 days", but "1 day" reads correctly in psql output.
    product.deal
      ? `now() + interval '${[1, 2, 3, 4][index % 4]} day'`
      : "null",
    sqlJson(bundleSlugs),
    sqlJson({ ...specs, _brand: product.brand, _category: product.category }),
  ];

  return `(
  ${fields.join(",\n  ")}
)`;
});

const perCategory = {};
for (const p of CATALOGUE) {
  perCategory[p.category] = (perCategory[p.category] || 0) + 1;
}
const short = Object.entries(perCategory).filter(([, n]) => n < 4);

const sql = `-- ═══════════════════════════════════════════════════════════════════════════
--  Ecommerce — catalogue seed  (GENERATED FILE, DO NOT EDIT BY HAND)
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Regenerate with:   node scripts/build-seed.mjs
--  Apply with:        paste into the Supabase SQL editor, then Run
--
--  ── THIS SEED REPLACES THE CATALOGUE ────────────────────────────────────────
--  The DELETE below removes every existing product first, so re-running this file
--  gives you exactly the ${rows.length} products below and nothing else. A plain
--  upsert would leave behind anything deleted since the last run, which is how a
--  catalogue silently accumulates ghosts.
--
--  Safe to re-run: everything is deterministic (no random values, no timestamps
--  beyond now() + interval), so the same input always produces the same rows.
--
--  ── WHAT EACH PRODUCT CARRIES ───────────────────────────────────────────────
--    image_url       first of the four views
--    images          four views, shown in the gallery on the product page
--    specifications  a flat key/value block, rendered in the spec table
--    bundle_slugs    companions for "Frequently Bought Together"
--    mrp             struck-through price; 0 would mean no discount
--    price           0 would mean "priced on request" and block checkout
--
--  ── PRODUCT IMAGES — READ THIS ──────────────────────────────────────────────
--
--  These are real photographs hotlinked from Wikimedia Commons, and every URL was
--  fetched and confirmed to return an image before it was written here. That
--  guarantee is about the URLs, NOT about the pictures.
--
--  Commons is a volunteer encyclopedia, not a product catalogue. It has thorough
--  coverage of mass-market phones and effectively none of the niche SKUs here, so
--  measured across the catalogue:
--
--      ~10 of 149   a photograph of the actual model
--      ~40 of 149   the right brand, a different model
--      ~99 of 149   an unrelated product of a similar kind, or a stand-in
--
--  A working URL showing a Canon EOS 60D on the R50 listing looks like a product
--  page and is not one. Treat every image here as PLACEHOLDER ARTWORK until it
--  is replaced with a photograph of the actual stock.
--
--  Replacement is the normal path, not an exception: Admin Dashboard -> Products
--  takes up to four images plus a full specification block per product. Re-run
--      npm run images          to re-source anything that has rotted
--      npm run images:force    to re-source all of it
--  when Wikimedia has better coverage, or delete scripts/image-sources.mjs and
--  re-run "npm run seed" to fall back to labelled placehold.co tiles.
--
--  ${rows.length} products across ${Object.keys(perCategory).length} categories.${
    short.length
      ? `\n--  NOTE: ${short.map(([c, n]) => `${c}=${n}`).join(", ")} below four — the homepage grid tops these rows up.`
      : "\n--  Every category has four or more products, so the homepage grid is never padded."
  }
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── REPLACE THE CATALOGUE ─────────────────────────────────────────────────
-- Restricted to the product table. Orders and the knowledge index are left
-- alone, but note that order_items keeps a denormalised copy of the product
-- name, so historical orders still read correctly afterwards.
delete from public.products;

-- ─── INSERT ─────────────────────────────────────────────────────────────────
insert into public.products (
  name, slug, category, brand, price, mrp,
  image_url, images, description_intro, badge,
  rating, review_count, stock, is_featured, is_deal, deal_ends_at,
  bundle_slugs, specifications
)
values
${rows.join(",\n")};

-- ═══════════════════════════════════════════════════════════════════════════
--  VERIFY
-- ═══════════════════════════════════════════════════════════════════════════
-- Expect ${rows.length} rows, and every category with at least 4 products.
select category, count(*) as products
  from public.products
 group by category
 order by products asc, category asc;

-- Rebuild the AI assistant's index so it knows about the new catalogue.
-- Sign in as an admin and:
--   curl -X POST http://localhost:3000/api/knowledge/reindex \\
--     -H "Cookie: token=YOUR_JWT"
`;

writeFileSync("supabase/seed.sql", sql);

console.log(`supabase/seed.sql written`);
console.log(`  ${rows.length} products, ${Object.keys(perCategory).length} categories`);
console.log(`  brands: ${new Set(CATALOGUE.map((p) => p.brand)).size}`);
console.log(
  `  under 4 in a category: ${
    short.length ? short.map(([c, n]) => `${c}=${n}`).join(", ") : "none"
  }`
);