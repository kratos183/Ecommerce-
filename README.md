# Ecommerce — Electronics Storefront with a Grounded AI Assistant

A production-shaped e-commerce platform for consumer electronics, built with
Next.js 16 and Supabase Postgres. Amazon-style catalogue browsing, Razorpay and
cash-on-delivery checkout, and a retrieval-augmented assistant that answers
questions about the catalogue **and the customer's own orders** — including
"which product did I buy".

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [The interesting parts](#the-interesting-parts)
  - [A RAG assistant that knows your orders](#a-rag-assistant-that-knows-your-orders)
  - [Hybrid retrieval](#hybrid-retrieval)
  - [Money moves in Postgres, not JavaScript](#money-moves-in-postgres-not-javascript)
  - [Cash on delivery, honestly recorded](#cash-on-delivery-honestly-recorded)
  - [Search that behaves like a marketplace](#search-that-behaves-like-a-marketplace)
  - [A catalogue that is generated, not typed](#a-catalogue-that-is-generated-not-typed)
- [Getting started](#getting-started)
- [Project layout](#project-layout)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Honest limitations](#honest-limitations)
- [Contact](#contact)

---

## What it does

**Storefront.** An Amazon-shaped homepage: a hero carousel that advertises real
products, a department strip, a deal-of-the-day band with a live countdown, a
category rail with hover mega-panels, and auto-scrolling rails for best sellers
and new arrivals. Every category row is guaranteed four products.

**Catalogue.** 149 products across 15 categories and 53 brands, each with four
image URLs and a full specification block. Filtering by category, brand, price
and free-text, with pagination.

**Accounts.** Signup and sign-in with bcrypt-hashed passwords and JWT session
cookies. Wishlist, cart, saved addresses, order history.

**Checkout.** Two payment paths — Razorpay (UPI, cards, netbanking) and cash on
delivery — priced identically on the server, with Razorpay signature
verification before an order is ever marked paid.

**Admin console.** Staff-only, for users, products and orders. Administrators
are deliberately *not* customers: they are redirected away from the customer
dashboard and given no cart or wishlist.

**AI assistant.** A retrieval-augmented chat in the customer dashboard that
answers catalogue questions and looks up the signed-in customer's real orders.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16, App Router, React 19 | Server Components keep most of the page static — the homepage ships almost no client JS |
| Styling | Tailwind CSS v4 | CSS-first config, no `tailwind.config.js` |
| Database | Supabase Postgres + PostgREST | Row-level security, and RPC into functions that are `SECURITY DEFINER` |
| Vector search | pgvector (`vector(384)`) | Hybrid with Postgres full-text |
| Embeddings | `@huggingface/transformers`, `Xenova/bge-small-en-v1.5` | Runs **locally**. No embedding API, no cost, no data leaves the machine |
| Generation | Groq (`qwen/qwen3.8-27b`) | Free tier, ~170 ms for a grounded answer |
| Payments | Razorpay | UPI, cards, netbanking |
| Auth | `jsonwebtoken` + `bcryptjs` | Hand-rolled, deliberately — see [Security](#getting-started) |
| Media | Cloudinary | Direct browser uploads for product images |

**Scale:** 84 TypeScript files, ~22,800 lines. 20 API routes, 6 database tables,
5 SQL files (~3,900 lines), 14 components.

---

## The interesting parts

### A RAG assistant that knows your orders

Most product chatbots answer from a vector store of product descriptions and
hallucinate the moment you ask something personal. This one splits the problem
in two:

- **The catalogue** is embedded once, at index time, into `knowledge_chunks`.
- **Your orders** are *never embedded*. They are fetched fresh on every request,
  scoped to the session user id, and injected into the prompt as a short brief.

That second decision is the important one. Embedding personal data means it sits
in a vector store where a similarity search can surface one customer's order to
another. Fetching it per-request makes that structurally impossible, and it also
means "what did I buy" is answered from live data rather than a snapshot that
went stale the moment an order shipped.

```
lib/rag/personal.ts        fetch this user's orders, scoped by session id
lib/rag/personal-brief.ts  compress them into a few hundred tokens
lib/rag/retrieve.ts        hybrid search over the catalogue only
lib/rag/prompt.ts          system prompt + grounding rules
lib/rag/groq.ts            streaming, model fallbacks, SSE
```

### Hybrid retrieval

Vector search alone misses exact strings people type — a model number, "7 day",
"SM58". Full-text search alone misses paraphrase. Both run and their results are
fused with **Reciprocal Rank Fusion** inside a single SQL function:

```sql
-- match_knowledge() in supabase/rag.sql
  +-> vector search     (pgvector cosine similarity)
  +-> full-text search  (tsvector @@ websearch_to_tsquery)
  -> RRF fusion -> top chunks
```

RRF is used rather than score-normalisation because a cosine distance and a
`ts_rank` are not comparable numbers — merging them by score requires inventing a
calibration that does not exist. Ranking them and merging by *position* does not.

### Money moves in Postgres, not JavaScript

Supabase's REST layer cannot run a multi-statement transaction, so anything that
must be all-or-nothing is a Postgres function:

| Function | Used by | Atomic because |
| --- | --- | --- |
| `place_customer_order` | `POST /api/orders` | Order row + its line items |
| `record_paid_order` | `POST /api/payments/verify` | Same, plus the amount check |
| `upsert_address` | `POST/PATCH /api/addresses` | Clearing the old default and setting the new one |
| `delete_address` | `DELETE /api/addresses/[id]` | Deleting, then promoting a replacement default |

**Prices are resolved inside Postgres and never read from the request body.**
Both order functions look up product names and prices themselves, so a tampered
client cannot set its own total. `record_paid_order` additionally compares the
amount Razorpay says was charged against the amount it computed, and refuses the
order if they differ by more than ₹1.

### Cash on delivery, honestly recorded

COD is the one payment path that never touches a gateway, so it gets its own
route and its own database column state.

| Method | `payment_method` | `payment_status` |
| --- | --- | --- |
| Online (Razorpay) | `razorpay` | `paid` |
| Cash on delivery | `cod` | `pending` |

COD deliberately leaves `payment_status` at `pending`. Nobody has handed over
any money at that point, and marking it paid would let an uncollected order look
settled in the admin dashboard. The UI matches: the button reads *"Place order —
pay ₹X on delivery"* rather than *"Pay ₹X"*, and the confirmation says *"Order
confirmed — nothing has been charged."*

Both paths price the basket through the same function, so shipping and totals
cannot drift apart between them. The payment method arrives from the client, so
it is checked three times: whitelisted in the route, re-validated inside the
`SECURITY DEFINER` function, and constrained by a `CHECK` on the column.

### Search that behaves like a marketplace

Typing `mobile` returns phones — even though no product is *called* "mobile".

Three things come back at once: ranked products, a category fallback
(*"Search all Phone products"*) when the direct hits are thin, and brand chips.
The category link only appears when the direct hits are thin, so a genuine
product match is never displaced by a redundant link. This is the Flipkart
behaviour.

Brand suggestions are read from the product table at query time rather than from
a config list, so **a brand added through the admin dashboard becomes searchable
immediately** — there is no second list to forget to update.

### A catalogue that is generated, not typed

`supabase/seed.sql` is produced by `scripts/build-seed.mjs` from a structured
catalogue in `scripts/seed-data.mjs`.

Hand-writing 149 products × 4 images × a specification block is where mistakes
live: a missing comma, a duplicated slug, a category that quietly drops below
the homepage's four-card minimum. Generating it means those cannot drift.

Every row is deterministic — no random values, no `Math.random()` — so the same
input always produces byte-identical SQL. Prices, specification blocks and
image URLs are all derived.

The seed **replaces** the catalogue: it starts with `delete from public.products`,
so re-running leaves no ghosts from deleted rows behind.

---

## Getting started

You need Node 20.9+ (24 recommended) and a Supabase project.

```bash
git clone https://github.com/kratos183/Ecommerce-.git
cd Ecommerce-
npm install
cp .env.example .env.local     # then fill it in
```

**Required environment variables:**

```bash
# Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Sign a random secret. A weak one means anyone can forge a session cookie.
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=replace-me
```

**Optional:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `GROQ_API_KEY`,
`GROQ_MODEL`, and the four Cloudinary variables for image uploads. Each missing
group disables exactly one feature and nothing else.

**Apply the schema, then load the catalogue.** All four are idempotent — paste
them into the Supabase SQL Editor in this order:

| File | Purpose |
| --- | --- |
| `supabase/schema.sql` | Tables, transactional functions, RLS policies |
| `supabase/rag.sql` | pgvector extension, `knowledge_chunks`, hybrid search |
| `supabase/seed.sql` | The 149-product catalogue |
| `supabase/admin.sql` | Promote yourself to admin after signing up |

```bash
npm run dev
```

Then: sign up at `/signup`, run `supabase/admin.sql` with your email, and build
the assistant's index:

```bash
curl -X POST http://localhost:3000/api/knowledge/reindex -H "Cookie: token=YOUR_JWT"
```

Full detail in **[SETUP.md](./SETUP.md)**.

### Security note

`SUPABASE_SERVICE_ROLE_KEY` **bypasses row-level security entirely**. It is
git-ignored and must stay that way — a leaked key is not undone by rewriting git
history, only by rotating it in the Supabase dashboard.

---

## Project layout

```
app/
  page.tsx                    homepage (Server Component, revalidate = 60)
  product/[slug]/             product detail + 4-image gallery
  product-page/               catalogue with filters and pagination
  checkout/                   address → review → pay
  user-dashboard/             orders, wishlist, cart, "Ask the assistant"
  Admin-Dashboard/            staff console
  api/                        20 route handlers
  components/home/            carousel, rails, category showcase, search
  components/chat/            the assistant panel
lib/
  rag/                        the retrieval pipeline (8 modules)
  search.ts                   marketplace search rules
  pricing.ts                  basket maths shared by client and server
  auth.ts                     JWT sessions, bcrypt
  db.ts, supabase.ts          database access
scripts/                      seed generation, image sourcing, test suites
supabase/                     all SQL, applied through the SQL Editor
```

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run test` | All offline suites — no API key, no database |
| `npm run check` | End-to-end against the real database and Groq |
| `npm run seed` | Regenerate `supabase/seed.sql` |
| `npm run images` | Source and verify missing product images |
| `npm run reset:catalogue` | Delete every product (asks first; `--dry-run` to preview) |

---

## Testing

Three suites run against a real in-process Postgres (PGlite), not mocks:

```bash
npm run test
```

| Suite | What it proves |
| --- | --- |
| `test:schema` | Every SQL file executes. Includes cash-on-delivery behaviour — that a COD order is recorded unpaid, that a tampered payment method is coerced, and that a `CHECK` constraint rejects a bad write |
| `test:catalogue` | The generated seed is *semantically* sound, not just valid SQL: every category has four-plus products, no dangling bundle references, `mrp ≥ price`, and every image host is allowed in `next.config.ts` |
| `test:search` | The search and category-fallback rules behave as documented, including that "samsung" offers the Samsung brand and that a longer word sharing a prefix does not |

The catalogue suite catches a whole class of bug a syntax check cannot. A slug
function that drifts between two files produces no error at all — it just means
every product silently loses its images.

---

## Deployment

Deploys to Vercel with **no code changes and no build-time environment
variables**. Import the repository, leave every setting at its default, and add
the environment variables from `.env.example`.

Node 24 is pinned in `.nvmrc` and `engines.node`, so build and runtime cannot
drift onto different majors.

Two things are per-machine and will not exist on Vercel: the SQL files (applied
through the Supabase SQL Editor) and the assistant's index (rebuilt once after
the first deploy). See **[SETUP.md §6](./SETUP.md)** for the full checklist.

---

## Honest limitations

A portfolio project should say what it does not do.

- **The product images are category photographs, not pictures of each specific
  SKU.** They come from Wikimedia Commons and every URL was verified to resolve,
  but roughly 10 of 149 depict the exact model — the rest are the right brand or
  a similar product. Commons is a volunteer encyclopedia with thorough coverage
  of mass-market phones and effectively none of the niche hardware here.
  Replacing them through Admin Dashboard → Products is the intended workflow.
- **The house brand is sparse.** `Ecommerce` appears in the navbar brand filter
  for every category, but only the accessories, podium and acoustic lines are
  actually house-branded. Choosing "Ecommerce" under Phones returns nothing.
- **The assistant is retrieval-only.** It has no tool use and cannot take an
  action. It answers and cites; it does not act.
- **No test coverage in the browser.** The suites test logic and SQL against a
  real Postgres. Component behaviour, hydration and visual layout are unverified
  by automation.
- **Payments are single-currency (INR).** No tax breakdown, GST invoice, or
  multi-currency support.
- **Rate limiting is absent** on the auth and chat routes.

---

## Contact

Built by **Chandan Sari Creative**, Dhanbad, Jharkhand, India.

- Phone / WhatsApp: +91 79924 30183
- Email: chandansaricreative@gmail.com

---

## License

MIT — see [LICENSE](./LICENSE).

Product photographs are hotlinked from Wikimedia Commons under their respective
free licences; each file's licence is recorded on its Commons page.