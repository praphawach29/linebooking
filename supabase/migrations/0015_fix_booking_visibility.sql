-- 0015_fix_booking_visibility.sql
-- Fix two issues:
-- 1. get_my_bookings: also find bookings where user_id is NULL but user_name matches via stored line profile
--    (because our fallback booking may have stored user_id=null when users table upsert failed)
-- 2. Ensure merchant dashboard can select all bookings from any tenant (public SELECT already in 0014)

-- ---------------------------------------------------------------
-- Fix get_my_bookings to also handle NULL user_id (fallback bookings stored without user row)
-- These bookings still have user_name from LINE profile but no FK to users table
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_bookings(p_line_user_id TEXT)
RETURNS SETOF bookings
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Case 1: booking linked to a users row that has the LINE user ID (normal flow)
  SELECT b.* FROM bookings b
  JOIN users u ON u.id = b.user_id
  WHERE u.line_user_id = p_line_user_id
    AND p_line_user_id IS NOT NULL
    AND length(p_line_user_id) >= 10
  UNION
  -- Case 2: booking has no user_id (fallback stored with user_id=null)
  --         but we can still find it via the users table if the user was upserted
  SELECT b.* FROM bookings b
  WHERE b.user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.line_user_id = p_line_user_id
        AND p_line_user_id IS NOT NULL
        AND length(p_line_user_id) >= 10
        AND u.display_name = b.user_name
    )
  ORDER BY booking_date DESC, start_time DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION get_my_bookings(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------
-- Ensure bookings SELECT is open for merchant dashboard reads
-- (in case 0014 policies were overridden or not applied)
-- ---------------------------------------------------------------
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_public_select" ON bookings;
CREATE POLICY "bookings_public_select" ON bookings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "bookings_public_insert" ON bookings;
CREATE POLICY "bookings_public_insert" ON bookings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_public_update" ON bookings;
CREATE POLICY "bookings_public_update" ON bookings
    FOR UPDATE USING (true) WITH CHECK (true);

-- Also ensure users table allows upsert
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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
-- Diagnostic query: run to verify bookings exist in DB
-- (comment out before applying to production)
-- ---------------------------------------------------------------
-- SELECT id, ref_no, user_id, user_name, booking_date, status, created_at
-- FROM bookings
-- ORDER BY created_at DESC
-- LIMIT 20;
