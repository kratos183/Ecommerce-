-- ═══════════════════════════════════════════════════════════════════════════
--  Ecommerce — DELETE THE CATALOGUE
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Use this when you want an empty product catalogue without touching anything
--  else: customers, orders, addresses, favourites and the AI index all survive.
--
--  ── WHEN TO USE WHICH ─────────────────────────────────────────────────────
--
--    Just want the catalogue reloaded?      Run supabase/seed.sql
--                                           It deletes and re-inserts in one go.
--                                           This is the normal path.
--
--    Need a genuinely empty catalogue?      Run THIS file.
--                                           Useful when the products are wrong
--                                           enough that a reload would look
--                                           like nothing changed.
--
--    Everything, including orders?          See "FULL WIPE" at the bottom.
--
--  ── WHAT IT DOES TO ORDERS ────────────────────────────────────────────────
--
--  `customer_order_items` keeps a denormalised copy of the product name and
--  price at the time of purchase, so historical invoices still read correctly
--  after this runs. What is lost is the live link: `product_id` becomes NULL and
--  such orders stop following edits to a product. That is usually what you want
--  — an invoice should not change because someone retitled a product.
--
--  ── SAFE TO RE-RUN ────────────────────────────────────────────────────────
--
--  Every statement is idempotent. Running it twice is the same as running it
--  once. Wrapped in a transaction so a failure part-way leaves the catalogue
--  intact rather than half-deleted.
--
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ═══ ORDERS FIRST ═══════════════════════════════════════════════════════════
--
-- They reference `products`, so they go before it. This clears the live link
-- from past orders while keeping the order rows, the customer, the totals and
-- the stored product names.

update public.customer_order_items
   set product_id = null
 where product_id is not null;

-- ═══ CATALOGUE ═════════════════════════════════════════════════════════════

delete from public.products;

-- ═══ FAVOURITES ════════════════════════════════════════════════════════════
--
-- Starred product ids would dangle. Wishlists are not worth preserving across a
-- catalogue wipe — every entry would point at nothing.

delete from public.favorites;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
--  VERIFY
-- ═══════════════════════════════════════════════════════════════════════════
-- Expect 0. The order count should be unchanged.
select count(*) as products from public.products;
select count(*) as orders_kept from public.customer_orders;
select count(*) as favourites_kept from public.favorites;

-- ═══════════════════════════════════════════════════════════════════════════
--  FULL WIPE — NOT USUALLY WHAT YOU WANT
-- ═══════════════════════════════════════════════════════════════════════════
-- Deletes customers, orders and addresses too. Uncomment and run ONLY if you are
-- rebuilding the database from scratch.
--
--   begin;
--   delete from public.customer_order_items;
--   delete from public.customer_orders;
--   delete from public.favorites;
--   delete from public.addresses;
--   delete from public.products;
--   delete from public.users;
--   commit;
--
-- Deleting users means re-registering, and re-promoting yourself to admin with
-- supabase/admin.sql afterwards. The schema, RLS policies and the AI index are
-- left alone either way.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
--  RELOAD AFTER DELETING
-- ═══════════════════════════════════════════════════════════════════════════
--   1. Regenerate:  npm run seed
--   2. Load:        psql "$SUPABASE_DB_URL" -f supabase/seed.sql
--      or paste supabase/seed.sql into the Supabase SQL Editor.
--
--  seed.sql deletes and re-inserts anyway, so you can skip straight to it.
--  Then rebuild the AI assistant's index:
--      curl -X POST http://localhost:3000/api/knowledge/reindex \
--        -H "Cookie: token=YOUR_JWT"
-- ═══════════════════════════════════════════════════════════════════════════