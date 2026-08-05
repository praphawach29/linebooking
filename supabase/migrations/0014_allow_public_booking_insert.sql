-- 0014_allow_public_booking_insert.sql
-- Allow anon/authenticated users to upsert into users table (for LINE profile sync)
-- and insert/select bookings directly from Supabase client (no backend required)

-- ---------------------------------------------------------------
-- users table: allow public upsert via line_user_id
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "users_public_insert" ON users;
CREATE POLICY "users_public_insert" ON users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "users_public_update" ON users;
CREATE POLICY "users_public_update" ON users
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_public_select" ON users;
CREATE POLICY "users_public_select" ON users
    FOR SELECT USING (true);

-- ---------------------------------------------------------------
-- bookings table: allow public insert and select
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_public_insert" ON bookings;
CREATE POLICY "bookings_public_insert" ON bookings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_public_select" ON bookings;
CREATE POLICY "bookings_public_select" ON bookings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "bookings_public_update" ON bookings;
CREATE POLICY "bookings_public_update" ON bookings
    FOR UPDATE USING (true) WITH CHECK (true);
