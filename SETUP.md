# Ecommerce — storefront

A full online storefront for electronics — phones, laptops, tablets, TVs and
displays, audio, cameras and accessories — with installation and bulk ordering
alongside the retail catalogue. Next.js 16 (App Router) + Tailwind v4, **Supabase
Postgres** as the database, and a **RAG-powered assistant** built on Groq.

---

## 1. First-time setup

### 1.1 Install

```bash
npm install
```

### 1.2 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Wait for the database to finish provisioning.

### 1.3 Apply the schema

Supabase dashboard → **SQL Editor** → **New query** → paste the whole of
[`supabase/schema.sql`](./supabase/schema.sql) → **Run**.

Alternatively, with the connection string from **Project Settings → Database**:

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
```

This creates `users`, `products`, `customer_orders`, `customer_order_items`,
`favorites` and `addresses`, plus the order/address functions and the row-level
security policies. Every statement is idempotent, so re-running it is safe.

### 1.4 Load the starter catalogue

```bash
npm run seed          # regenerate supabase/seed.sql from scripts/seed-data.mjs
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Or paste `supabase/seed.sql` into the SQL Editor.

**The seed replaces the catalogue.** It starts with `delete from public.products`,
so re-running gives you exactly the generated catalogue and nothing else —
products you deleted since the last run are actually removed. Every row is
deterministic (no random values), so the same input always produces the same SQL.

It loads 149 products across 15 categories and 53 brands — the real manufacturer
names from the navbar's brand grid, so every navbar filter matches something. Each
product carries:

| Column | What it holds |
|---|---|
| `images` | Four views, shown in the gallery on the product page |
| `specifications` | A flat key/value block, rendered in the spec table |
| `bundle_slugs` | Companions for **Frequently Bought Together** |
| `mrp` | Struck-through price; `0` would mean no discount |

Every category has four or more products, so the homepage "Shop by Category"
grids are never padded with unrelated items.

> **Do not edit `seed.sql` by hand** — it is generated, and your changes are lost
> on the next `npm run seed`. Edit `scripts/seed-data.mjs` (the product list) or
> `scripts/build-seed.mjs` (pricing, images, spec templates) and regenerate.

### 1.4.1 Deleting the catalogue

Two ways, depending on what you want.

**Reload it** — the normal path. `supabase/seed.sql` already deletes before
inserting, so just re-run it. This is what you want whenever the products are
merely outdated.

**Empty it without reloading:**

```bash
npm run reset:catalogue -- --dry-run   # show what would go
npm run reset:catalogue                # asks before deleting
npm run reset:catalogue -- --yes       # no prompt, for scripts
```

Or paste `supabase/reset-catalogue.sql` into the SQL Editor. Both do the same
thing and leave **customers, orders, order items, addresses and the AI index
alone**. Order items keep their denormalised product name and price, so past
invoices still read correctly — only the live link to a product is cleared, which
is what you want, since an invoice should not change because someone retitled a
product. Favourites *are* deleted, because every entry would dangle.

Either way, finish with `npm run seed` and reload `seed.sql`, then rebuild the
AI index (see §5.5).

### 1.4.2 Product images

```bash
npm run images          # source any that are missing, verify each URL
npm run images:force    # re-source everything from scratch
```

> ### ⚠ The seeded images are placeholder artwork, not product photographs
>
> Every URL is real and was confirmed to return an image, but **that is a
> statement about the URL, not the picture.** Measured across the catalogue:
>
> | | |
> |---|---|
> | A photograph of the actual model | **~10 of 149** |
> | Right brand, different model | ~40 |
> | Unrelated similar product, or a stand-in | ~99 |
>
> Wikimedia Commons is a volunteer encyclopedia, not a product catalogue. It has
> thorough coverage of mass-market phones (Galaxy S24, Redmi Note 13, POCO X6,
> vivo V30) and effectively none of the niche SKUs here — no MAXHUB V6 86", no
> Shure MV7, no Ecommerce acoustic tile. When it has no photo, its search returns
> *something*, and what it returns is arbitrary.
>
> **Treat every seeded image as artwork to be replaced.** A working URL showing
> a Canon EOS 60D on the R50 listing looks like a product page and is not one —
> that is a worse failure than a grey tile, because it invites an order.
>
> Replacing them is the normal path, not an exception: **Admin Dashboard →
> Products** takes up to four images plus a full specification block per product.
>
> If you would rather ship honest grey tiles than plausible wrong photos, delete
> `scripts/image-sources.mjs` and run `npm run seed` — the generator falls back
> to labelled placehold.co tiles.

`scripts/resolve-images.mjs` searches Wikimedia Commons for each product, scores
every candidate by how well its filename identifies the product, rejects
filenames that cannot be a product photo (a concert shot of the right microphone
is not a product shot), and then **fetches each URL to confirm it really returns
an image** before recording it. Results are cached in
`scripts/image-sources.mjs`, which `npm run seed` reads. It is a one-off sourcing
pass — nothing runs at build or request time — so the seed is reproducible offline.

Why Commons: real photographs, stable `upload.wikimedia.org` URLs, no API key, no
per-image cost, and a stated licence per file. Why the constraints exist at all:
Commons search is full-text, not a catalogue, and roughly one in twenty "image"
results is a diagram, an SVG or a deleted file.

Each product gets four slots. A slot with no photograph is filled with a
placehold.co stand-in naming the product.

> Commons does occasionally delete or rename a file. If an image breaks later,
> run `npm run images:force` rather than editing `image-sources.mjs` by hand —
> that file is generated too.

### 1.5 Configure the environment

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Where to find it | Server only? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | Safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role | **Yes — never expose** |
| `JWT_SECRET` | Generate your own, see below | Yes |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Settings → API Keys | Yes |
| `CLOUDINARY_*` | Cloudinary console | Yes |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary console | Safe to expose |

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 1.6 Check it

```bash
npm run check
```

Reports what is still outstanding, in order. Run it whenever setup surprises you.

### 1.7 Run it

```bash
npm run dev
```

---

## 2. How the data layer works

The app used to talk to MySQL through a raw `query(sql, params)` helper. That is
gone. Postgres is accessed through `@supabase/supabase-js`, which changes three
things worth knowing:

**There is no arbitrary SQL.** Every read and write goes through PostgREST's
query builder (`.from("products").select(...)`) or a vetted Postgres function
(`.rpc(...)`). Hand-written SQL in a route handler is how injection bugs happen,
so it is no longer possible here.

**There are no transactions in application code.** Supabase's REST layer cannot
run a multi-statement transaction. Anything that must be all-or-nothing is a
Postgres function in [`supabase/schema.sql`](./supabase/schema.sql):

| Function | Used by | Why it must be atomic |
| --- | --- | --- |
| `place_customer_order` | `POST /api/orders` (cash on delivery, WhatsApp quotes) | Order row + its line items |
| `record_paid_order` | `POST /api/payments/verify` | Same, plus the amount check |
| `upsert_address` | `POST/PATCH /api/addresses` | Clearing the old default and setting the new one |
| `delete_address` | `DELETE /api/addresses/[id]` | Deleting, then promoting a replacement default |

> **If you change a function's parameter list, update the `revoke`/`grant`
> statements near the bottom of `schema.sql` too.** Postgres treats a mismatched
> argument list as a *different function*, so the grant silently applies to
> nothing and the file fails with `function ... does not exist`. `npm run
> test:schema` catches this.

**Prices are always re-read from the database.** Both order functions resolve
product names and prices inside Postgres and never trust the request body, so a
tampered client cannot set its own total.

### Payment methods

| Method | Route | `payment_method` | `payment_status` |
| --- | --- | --- | --- |
| Online (UPI, card, netbanking) | `POST /api/payments/checkout` → `verify` | `razorpay` | `paid` |
| Cash on delivery | `POST /api/orders` | `cod` | `pending` |

Cash on delivery deliberately leaves `payment_status` at `pending`. Nobody has
handed over any money at that point, and marking it paid would let an uncollected
order look settled in the admin dashboard — collect the cash, then mark it paid.

Both paths price the basket through the same `place_customer_order` function, so
shipping and totals cannot drift apart between them. The method arrives from the
client, so it is validated twice: whitelisted in the route, and re-checked inside
the SECURITY DEFINER function, with a `CHECK` constraint on the column as a third
layer.

### Where the code lives

| File | Responsibility |
| --- | --- |
| `lib/db.ts` | The lazy Supabase client. Server-only. |
| `lib/supabase.ts` | `num()` / `json()` coercion, error formatting |
| `lib/products.ts` | Every product read and write, and row → `Product` mapping |
| `lib/bundles.ts` | Resolves `bundle_slugs` into "Frequently Bought Together" bundles |
| `lib/schema.ts` | `assertSchemaReady()` — turns "you forgot to run the schema" into a useful error |
| `lib/order-errors.ts` | Translates Postgres exceptions into HTTP responses |

### Shipping rules live in two places

`lib/pricing.ts` is what the browser renders; `shipping_for()` in
`supabase/schema.sql` is what the database charges. **Change one, change the
other** or the amount shown and the amount taken will disagree.

---

## 3. Editing the catalogue

### Via the admin dashboard

`/Admin-Dashboard` → Products. Writes go through `POST/PUT/DELETE /api/products`,
which calls `revalidatePath("/")` so the homepage updates immediately.

### Via SQL

```sql
update products
   set bundle_slugs = '["ecommerce-stylus-pen-2","ecommerce-usb-c-cable-2m"]'::jsonb,
       mrp = 220000,
       is_deal = true
 where slug = 'ecommerce-apex-75';
```

The homepage is re-rendered from Postgres at most once a minute
(`revalidate = 60` in `app/page.tsx`), and immediately after any admin write.

### Useful product columns

| Column | Notes |
| --- | --- |
| `price` | `0` means "priced on request" — shown in the catalogue, cannot be bought |
| `mrp` | The struck-through price. Leave `0` for no discount. |
| `is_deal` | Puts the product in the Deal-of-the-Day band |
| `deal_ends_at` | Timestamptz; drives that band's countdown |
| `is_featured` | Eligible for the homepage's best-sellers and bundle rails |
| `bundle_slugs` | **Drives "Frequently Bought Together"** |
| `rating` / `review_count` | Shown on the card and used to rank best sellers |

### "Frequently Bought Together"

Each product's `bundle_slugs` array names the slugs usually bought with it. The
section resolves them server-side, skips any slug that no longer matches a live
product, and hides itself entirely when no product has a bundle configured — so
deleting an accessory never leaves a gap.

---

## 4. Branding

Everything customer-facing reads from [`lib/site.ts`](./lib/site.ts): name,
tagline, phone, WhatsApp number, email and address. Change it there and it
updates across the Navbar, Footer, hero, CTAs and page metadata.

Current contact details:

| | |
| --- | --- |
| Phone / WhatsApp | +91 7992430183 |
| Email | chandansaricreative@gmail.com |
| Office | Shyamdih, Katras Baazar, Dhanbad, Jharkhand 828114 |

`SITE` also exposes `city`, `state` and `pincode` separately, which the
address forms use as placeholders — so those follow the real location too rather
than being hardcoded strings that drift.

The Navbar wordmark and the Razorpay checkout merchant name are hardcoded
(`app/components/Navbar.tsx`, `app/checkout/page.tsx`) rather than reading
`SITE.name`, so they are set separately.

### Colour

Orange is the brand accent across the storefront. It replaces an earlier teal
palette. `green-*` and `emerald-*` are deliberately kept only where they carry
meaning — "in stock", "free delivery", "you save", and order-status pills — the
same way Amazon uses green for availability against an orange brand. If you want
one colour throughout, those are the classes to change.

### Admins and the customer dashboard

`proxy.ts` sends an admin who opens `/user-dashboard` to `/Admin-Dashboard`,
and the Navbar hides the wishlist, cart and dashboard links for admins. Admins
are staff, not shoppers: the customer dashboard would show them their own empty
orders rather than the store's, which is a dead end rather than a useful page.

---

## 5. The AI assistant ("Ask Ecommerce")

A retrieval-augmented customer service assistant, in the **Ask Ecommerce** tab of the
user dashboard. It answers questions about the customer's own orders, the product
catalogue and the store's policies — and shows which sources each answer used.

Its knowledge base lives in `lib/rag/documents.ts` and the system prompt in
`lib/rag/prompt.ts`. **Both describe the business, so changing how you sell means
changing both, then re-indexing.** Leaving them describing a different company is
how an assistant ends up confidently quoting a policy you do not have.

### 5.1 Set up

**1. Enable the vector store.** Supabase SQL Editor → paste
[`supabase/rag.sql`](./supabase/rag.sql) → Run. This creates the
`knowledge_chunks` table, the pgvector index, the hybrid search function and the
RLS policy.

**2. Add a Groq key.** Free, about a minute:

```bash
# https://console.groq.com/keys
GROQ_API_KEY=gsk_...
```

Optionally set `GROQ_MODEL`. The default (`lib/rag/groq.ts`) is
`qwen/qwen3.8-27b`, the fastest good option on the free tier — roughly 170 ms
for a grounded answer against ~900 ms for `openai/gpt-oss-120b`. For a customer
chat, that latency difference is the difference between feeling responsive and
feeling broken, so the smaller model is the default deliberately.

> **Your key may not have these models.** Groq's catalogue differs per account and
> the free tier often does not expose the Llama models at all. `npm run check`
> lists what your key actually has and fails if none of the configured models
> answer. If it fails, put one of the listed models into `DEFAULT_MODEL` and
> `FALLBACK_MODELS` in `lib/rag/groq.ts`.

**3. Build the index.** Sign in as an admin, then:

```bash
# build it
curl -X POST http://localhost:3000/api/knowledge/reindex -H "Cookie: token=YOUR_JWT"

# check its state without doing any work
curl http://localhost:3000/api/knowledge/reindex -H "Cookie: token=YOUR_JWT"
```

Re-run it after importing or editing the catalogue. It is idempotent.

### 5.2 How it works

```
question
   |
   +-> embed locally (bge-small-en-v1.5, 384 dims, L2-normalised)
   |      +-> match_knowledge()  -- vector search  -+
   |                             -- full-text search+-> RRF fusion -> top chunks
   |
   +-> read the signed-in customer's orders / wishlist / addresses  (NOT embedded)
   |
   +-> system prompt: rules + personal brief + numbered context
          +-> Groq, streamed over SSE -> answer + citations
```

| File | Responsibility |
| --- | --- |
| `lib/rag/embeddings.ts` | Loads the local model, embeds batches, asserts the dimension |
| `lib/rag/documents.ts` | The static policy / service / FAQ documents |
| `lib/rag/chunk.ts` | Chunking, and building a retrievable chunk from a product |
| `lib/rag/ingest.ts` | Replaces `knowledge_chunks` from the catalogue + documents |
| `lib/rag/retrieve.ts` | Calls `match_knowledge`, applies the cutoff, keyword fallback |
| `lib/rag/personal-brief.ts` | The customer data shape and its prompt rendering (pure) |
| `lib/rag/personal.ts` | Reads that data from Postgres, scoped to the session |
| `lib/rag/prompt.ts` | System prompt and the grounding rules |
| `lib/rag/groq.ts` | Streaming client |
| `app/api/chat/route.ts` | The pipeline, and the SSE stream |
| `app/components/chat/ChatPanel.tsx` | The UI |

**Why retrieval is hybrid.** Vector search alone misses the exact strings people
type — a model number, "7 day". Full-text search alone misses paraphrase. The two
are fused with Reciprocal Rank Fusion, which needs no score calibration between
them, because cosine similarity and `ts_rank` are not on the same scale.

**Why personal data is not embedded.** Orders change constantly and are private.
Reading them fresh per request keeps answers accurate to the second, costs no
embedding budget, and means nothing private is ever written to the knowledge
base. Every query is filtered by the session's user id, so there is only ever one
customer's rows in scope.

**Why the relevance cutoff is relative.** `bge` scores everything fairly high —
an unrelated pair still scores around 0.46 — so an absolute threshold cannot
separate a good hit from a bad one. `retrieve.ts` instead keeps chunks within a
proportion of the best score.

### 5.3 Cost and latency

Embedding runs on your server: no API key, no per-request cost, and no product or
customer text leaves the machine. The first request downloads ~90 MB of model
weights (about 45 s); after that it is cached and loads in ~250 ms. Embedding the
whole catalogue takes well under a second.

Generation is the only metered part, and Groq's free tier is generous for
development.

### 5.4 Extending the knowledge base

| To add | Do this |
| --- | --- |
| A policy or FAQ | Add an entry to `KNOWLEDGE_DOCUMENTS` in `lib/rag/documents.ts`, then re-index |
| A product | Import it as usual — re-indexing picks it up |
| New searchable product fields | Extend `chunkProduct` in `lib/rag/chunk.ts` |
| A different embedding model | Change `EMBEDDING_MODEL` and resize `vector(384)` in `supabase/rag.sql`. A dimension mismatch fails loudly rather than silently. |

### 5.5 Verifying it works

```bash
npm run check            # end-to-end: DB, schema, index, search, admin, Groq
npm run test             # schema + catalogue + search - no API key needed
npm run test:rag         # chunking, prompt assembly, embeddings - no DB needed
node --env-file=.env.local --import tsx scripts/test-stream.mts   # live Groq stream
```

`npm run test` runs the three offline suites: `test:schema` executes every SQL
file against a real Postgres (PGlite), `test:catalogue` checks the generated seed
is semantically sound — not just valid SQL — and `test:search` covers the matching
rules.

### 5.6 Troubleshooting

| Symptom | Cause |
| --- | --- |
| Tab says the assistant is not configured | `GROQ_API_KEY` missing from `.env.local` |
| Re-index returns "knowledge table is missing" | `supabase/rag.sql` has not been applied |
| Answers cite nothing, or refuse everything | The index is empty — run the re-index |
| "keyword fallback" in the status line | Retrieval failed. Still answering, just without semantic ranking — check the server logs. |
| First answer is very slow | The embedding model is downloading (~90 MB). Later requests are fast. |
| Answers come back empty | The model is a reasoning model and `max_tokens` is too low for it to emit visible text. Raise it rather than lowering it. |
| `npm run check` says no models usable | Your Groq key has different models. Use the list it prints to update `lib/rag/groq.ts`. |
| Shipping rule disagreement | `shipping_for()` in `supabase/rag.sql` and `lib/pricing.ts` must match |

---

## 6. Deploying to Vercel

The project is ready to deploy with no code changes. Nothing is generated at
build time and **the build succeeds with no environment variables at all**, so
you can connect the repo and add secrets afterwards.

### 6.1 Import the project

Vercel → **Add New → Project** → import the repository. Leave every setting at
its default:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (auto-detected) |
| Build command | `npm run build` (auto) |
| Install command | `npm install` (auto) |
| Output directory | *(leave blank)* |

Node 24 is pinned in `.nvmrc`, and `engines.node` in `package.json` agrees, so
the build and the runtime cannot drift onto different majors.

### 6.2 Environment variables

Settings → Environment Variables. **Which scope matters:**

| Variable | Scope | Required | Where to get it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | **Yes** | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | **Yes** | Supabase → Settings → API → service_role |
| `JWT_SECRET` | Production + Preview | **Yes** | See below |
| `RAZORPAY_KEY_ID` | Production | For payments | Razorpay → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Production | For payments | Razorpay → Settings → API Keys |
| `GROQ_API_KEY` | Production | For the assistant | console.groq.com/keys |
| `GROQ_MODEL` | Production | No | Unset uses `DEFAULT_MODEL` in `lib/rag/groq.ts` |
| `CLOUDINARY_CLOUD_NAME` | Production | For image uploads | Cloudinary console |
| `CLOUDINARY_API_KEY` | Production | For image uploads | Cloudinary console |
| `CLOUDINARY_API_SECRET` | Production | For image uploads | Cloudinary console |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Production | For image uploads | Safe to expose |

Without `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` the site
still deploys and renders — it falls back to placeholder rows and shows an amber
notice. Everything else degrades one feature at a time rather than failing.

Generate `JWT_SECRET` — a weak one means anyone can forge a session cookie:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Use the same `JWT_SECRET` in Preview as in Production.** If they differ, a
session cookie minted by a preview deploy is rejected by the production one, and
vice versa, which is a confusing way to spend an afternoon.

### 6.3 Before you open it to anyone

Two things are per-machine and will not exist on Vercel:

1. **Apply the SQL to Supabase, not to Vercel.** `schema.sql`, `rag.sql`,
   `admin.sql` and `seed.sql` all run in the Supabase SQL Editor. They are in the
   repo, but nothing executes them at deploy time.
2. **Rebuild the assistant's index.** After the first deploy:

   ```bash
   curl -X POST https://YOUR-DOMAIN/api/knowledge/reindex \
     -H "Cookie: token=YOUR_JWT"
   ```

### 6.4 Things that will need attention later

| Symptom | Cause and fix |
| --- | --- |
| Reindex times out | `/api/knowledge/reindex` is capped at 60s, the Vercel Hobby maximum. Raise `maxDuration` on a paid plan, or run it from your own machine — it only needs the two Supabase variables. |
| First assistant answer is slow | Embeddings are computed locally by `@huggingface/transformers` (43 MB of WASM). Cold-start cost only; subsequent requests reuse the cached pipeline. |
| Images 404 in production | A remote host missing from `remotePatterns` in `next.config.ts`. Add the hostname — this is why `thumb.wikimedia.org` is listed alongside `upload.wikimedia.org`. |
| "Razorpay not configured" | Test keys only work against test mode. Switch Razorpay to live keys in the dashboard and update the two variables. |
| Site is stale after an edit | The homepage is `revalidate = 60` and reads from Postgres. Admin writes revalidate immediately; direct SQL edits wait up to a minute. |

### 6.5 Not deployable as-is

Deliberately excluded, and why:

- **`scripts/`** — seeding, image sourcing and the test suites. Node scripts run
  locally against the database. They are committed for reproducibility but never
  invoked by the build.
- **`supabase/*.sql`** — applied through the Supabase SQL Editor, not at deploy.
- **`.env.local`** — git-ignored, and must stay that way. It holds the Supabase
  service-role key, which bypasses row-level security entirely.

---

## 6b. Scripts

```bash
npm run dev            # dev server
npm run build          # production build
npm start              # serve the production build
npx tsc --noEmit       # typecheck
npm run check          # end-to-end: DB, schema, index, search, admin, Groq
npm run test           # schema + catalogue + search - no API key needed
npm run seed           # regenerate supabase/seed.sql from scripts/seed-data.mjs

npm run images         # source + verify missing product images
npm run images:force   # re-source every product image
npm run reset:catalogue            # delete all products (asks first)
npm run reset:catalogue -- --dry-run
```

`npm run test` runs three offline suites:

| Suite | What it proves |
| --- | --- |
| `test:schema` | Every SQL file executes against a real Postgres (PGlite) |
| `test:catalogue` | The generated seed is *semantically* sound, not just valid SQL |
| `test:search` | The search and category-fallback rules behave as documented |

### 6.1 How search works

Search lives in `lib/search.ts` and runs over the in-memory product list, so the
same code serves the API route and the tests. Three things come back at once:

1. **Products**, ranked by name, then category, then brand, then description.
   Every query word must match somewhere, so "samsung phone" never returns a
   random Samsung laptop.
2. **A category fallback.** Typing "mobile" — a department name, not a product
   name — returns matching products *and* a "Search all Phone products" link. The
   category only surfaces when the direct hits are thin, so a real product match
   is never displaced by a redundant link. This is the Flipkart behaviour.
3. **Brand chips.** Typing "samsung" offers "Samsung · 3". These are read from the
   product table at query time, not from a config list, so **a brand added through
   the admin dashboard is searchable immediately** — there is no second list to
   update.

> **Brand names must match `products.brand` exactly.** `lib/products.ts` filters
> with PostgREST `.eq("brand", …)`, which is case-sensitive: `SONY` in the data
> and `Sony` in the navbar means the filter returns nothing.
> `npm run test:catalogue` checks the two against each other.

---

## 7. Troubleshooting (storefront)

| Symptom | Cause |
| --- | --- |
| Amber banner: "connect Supabase to show your live products" | `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` missing from `.env.local` |
| Amber banner: "run supabase/seed.sql to load the starter catalogue" | Schema applied, but no products yet |
| `relation "products" does not exist` | `supabase/schema.sql` has not been run |
| `Could not load products` | Check the server logs — usually a wrong service-role key |
| Homepage not showing a new product | Admin writes revalidate immediately; direct SQL edits wait up to 60s |
| Empty "Frequently Bought Together" | No product has a non-empty `bundle_slugs` |
| A navbar brand filter returns nothing | Brand casing differs between `lib/catalog.ts` and `products.brand` — see §6.1 |
| Broken images on a product page | The product has no photo — `/product-placeholder.svg` is the intended fallback |
| Payments return `payments_not_configured` | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` missing |
