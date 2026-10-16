-- ═══════════════════════════════════════════════════════════════════════════
--  Obryn — create an administrator
-- ═══════════════════════════════════════════════════════════════════════════
--
--  WHY THIS FILE EXISTS
--  POST /api/auth/signup always creates a "user", never an "admin". That is
--  deliberate: the signup request is unauthenticated, so trusting a `role` field
--  from it would let anyone mint an admin account. The consequence is that the
--  first admin has to be promoted directly in the database — which is what this
--  does.
--
--  HOW TO USE
--    1. Register normally at  /signup  (the app works as a customer).
--    2. Supabase SQL Editor → New query → paste below → Run.
--
--  Only an admin can reach /Admin-Dashboard, and POST /api/knowledge/reindex
--  requires an admin too — so this has to be done before either works.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Promote an existing account ───────────────────────────────────────────
-- Replace the email with your own, then run.
update public.users
   set role = 'admin'
 where email = 'YOUR_EMAIL_HERE';

-- Confirm it worked. Expect one row with role = admin.
select id, email, role, created_at
  from public.users
 order by created_at desc
 limit 10;


-- ─── Create an admin directly (optional alternative) ───────────────────────
-- Use this only if you have not registered through /signup yet. The password is
-- a bcrypt hash; generate one with:
--
--   node -e "console.log(require('bcryptjs').hashSync('YourPassword', 12))"
--
-- Then paste the hash below. Note that bcryptjs and bcrypt (python) produce
-- compatible hashes, so either works.
--
-- insert into public.users (name, email, password, role)
-- values (
--   'Owner',
--   'owner@example.com',
--   '$2b$12$REPLACE_WITH_THE_HASH_YOU_GENERATED',
--   'admin'
-- );


-- ─── Later: manage roles ───────────────────────────────────────────────────
-- Demote someone back to a normal customer:
--   update public.users set role = 'user' where email = 'someone@example.com';
--
-- Block a customer without deleting their data (their orders stay intact):
--   update public.users set status = 'blocked' where email = 'someone@example.com';