-- 0030_fix_booking_access_and_visibility.sql
-- Ensure LIFF customers (anon) can insert and read bookings,
-- and merchants (authenticated) have full access to manage and view bookings.

BEGIN;

-- 1. Grant table privileges to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bookings TO anon;
GRANT ALL PRIVILEGES ON TABLE public.bookings TO authenticated;

-- 2. Ensure RLS is active with open and resilient policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_insert_policy" ON public.bookings;
CREATE POLICY "bookings_insert_policy" ON public.bookings
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_select_policy" ON public.bookings;
CREATE POLICY "bookings_select_policy" ON public.bookings
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "bookings_update_policy" ON public.bookings;
CREATE POLICY "bookings_update_policy" ON public.bookings
    FOR UPDATE TO anon, authenticated
    USING (true) WITH CHECK (true);

-- 3. Also ensure users table allows public insert/upsert for LINE customers
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO anon;
GRANT ALL PRIVILEGES ON TABLE public.users TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_public_insert" ON public.users;
CREATE POLICY "users_public_insert" ON public.users
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "users_public_select" ON public.users;
CREATE POLICY "users_public_select" ON public.users
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "users_public_update" ON public.users;
CREATE POLICY "users_public_update" ON public.users
    FOR UPDATE TO anon, authenticated
    USING (true) WITH CHECK (true);

COMMIT;
