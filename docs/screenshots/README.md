# Screenshots

Six screenshots of the live site, used in the main [README](../README.md) and
shown to reviewers on GitHub.

**Live site:** https://ecommerce-eight-weld.vercel.app/

---

## Naming — rename your files to exactly these

The `01-` … `06-` prefix is what fixes the order they appear in the README.
Numbering beats alphabetical, because `1-`, `2-` and `10-` sort as `1`, `10`, `2`.

| # | Filename | What to capture |
| --- | --- | --- |
| 1 | `01-homepage-hero.png` | The top of the homepage: hero carousel, search box, department strip |
| 2 | `02-category-showcase.png` | "Shop by category" and the left rail with the product grids |
| 3 | `03-product-detail.png` | A product page: the 4-image gallery, price block and the specification table |
| 4 | `04-catalogue-filters.png` | The catalogue page (`/product-page`) with the filter bar and product grid |
| 5 | `05-checkout.png` | Checkout with the two payment-method cards — Online payment and Cash on delivery |
| 6 | `06-ai-assistant.png` | The "Ask" assistant open in the customer dashboard, showing a grounded answer |

All lowercase, hyphens not spaces, `.png` not `.jpg`.

---

## How to capture them

**Viewport: 1440 × 900.** Wide enough to show the desktop layout, which is the
one worth showing a reviewer. A phone-width screenshot of a desktop-designed
storefront reads as "unfinished" rather than "responsive".

**Save the full image, not a screenshot of a screenshot.** Use your browser's
"Save image as" on a full-page capture, or a tool like FireShot / GoFullPage.
Aim for roughly 1400–1600px wide.

**PNG, not JPG.** These are flat UI with text. JPG's artefacts around 12px labels
are visible at that size, and the file is barely larger.

---

## Notes for each shot

**1 — Homepage hero.** The carousel auto-advances, so wait for a slide showing a
product rather than a gradient. Make sure the search box is visible — it is the
first thing a reviewer looks for on a storefront.

**2 — Category showcase.** Scroll so the left rail and at least two category
grids are in frame. The rail sticks to the left of the grids, which is the
layout worth demonstrating.

**3 — Product detail.** Pick a product with a real photograph, not one of the
five still showing a placeholder. `Apple iPhone 15 128 GB` has one, and its
specification table is long enough to look like real data.

**4 — Catalogue with filters.** Open the **Brand** dropdown so the filter panel
is visible, and make sure products are in the grid behind it. A screenshot of
the filter bar alone, with no products, looks empty.

**5 — Checkout.** You must be signed in — the checkout redirects to `/login`
otherwise. Select **Cash on delivery** before capturing, because that is the
option a reviewer will not expect a store to offer and it is worth showing
explicitly. Include the order summary column with the totals.

**6 — AI assistant.** Sign in, open `/user-dashboard`, and open the **Ask**
tab. The assistant needs a JWT cookie, so it will not render from an incognito
window. Ask it something with a grounded answer — *"what do you sell?"* or
*"which product did I buy?"* — and wait for the reply so the answer and its
citations are visible. A screenshot of an empty input box shows nothing.

---

## Keep them honest

These are screenshots of a real, working deployment, which is the whole point —
a reviewer should be able to open the live site and see the same thing.

If a screenshot would misrepresent the product, don't take it. The
"Honest limitations" section of the main README covers what this project does
not do, and that is a better way to earn trust than an omission.
