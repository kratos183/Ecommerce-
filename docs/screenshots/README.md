# Screenshots

The captures used in the main [README](../README.md). A recruiter scrolling the
repository sees these before they read a word of the prose, so they are worth
getting right.

**Live site:** https://ecommerce-eight-weld.vercel.app/

---

## The eight files

| # | Filename | Live URL it came from | Shows |
| --- | --- | --- | --- |
| 1 | `01-homepage-hero.png` | `/` | Hero carousel, marketplace search, category nav |
| 2 | `02-category-showcase.png` | `/` (scrolled) | The category rail beside the product grids |
| 3 | `03-product-detail.png` | `/product/apple-iphone-15-128-gb` | 4-image gallery, price block, spec table |
| 4 | `04-catalogue-filters.png` | `/product-page` | Brand dropdown open over the product grid |
| 5 | `05-user-dashboard.png` | `/user-dashboard` | Account overview — orders, cart, wishlist, spend |
| 6 | `06-checkout.png` | `/checkout` | The two payment-method cards |
| 7 | `07-ai-assistant.png` | `/user-dashboard?tab=assistant` | The "Ask Ecommerce" panel with suggested questions |
| 8 | `08-admin-dashboard.png` | `/Admin-Dashboard` | User management, roles and status |

Full URLs:

```
https://ecommerce-eight-weld.vercel.app/
https://ecommerce-eight-weld.vercel.app/product-page
https://ecommerce-eight-weld.vercel.app/product/apple-iphone-15-128-gb
https://ecommerce-eight-weld.vercel.app/checkout
https://ecommerce-eight-weld.vercel.app/user-dashboard
https://ecommerce-eight-weld.vercel.app/user-dashboard?tab=assistant
https://ecommerce-eight-weld.vercel.app/Admin-Dashboard
```

The `01-` … `08-` prefix fixes the display order. Numbering beats alphabetical,
because `1-`, `2-` and `10-` sort as `1`, `10`, `2`.

---

## If you recapture

**Viewport: 1440 × 900.** Wide enough to show the desktop layout, which is the
one worth showing a reviewer. A phone-width screenshot of a desktop-designed
storefront reads as "unfinished" rather than "responsive".

**PNG, not JPG.** These are flat UI with text. JPG's artefacts around 12px labels
are visible at that size, and the file is barely larger.

**Sign in first for shots 5, 6, 7 and 8.** The dashboard and checkout redirect
to `/login` when signed out, and the assistant needs a JWT cookie so it will not
render in an incognito window.

**For shot 6, select "Cash on delivery"** before capturing. It is the option a
reviewer will not expect a store to offer, so it is worth showing deliberately.

**Avoid the five Podium products** — Mobile Lectern Stand, Custom Podium,
Wooden Podium, Acrylic Podium and Podium with Built-in Mic still show a labelled
placeholder. They are the only ones left.

---

## Keep them honest

These are screenshots of a real, working deployment, which is the whole point —
a reviewer should be able to open the live site and see the same thing.

If a screenshot would misrepresent the product, don't take it. The "Honest
limitations" section of the main README covers what this project does not do,
and saying so is a better way to earn trust than an omission.
