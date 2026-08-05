-- 0014_allow_public_booking_insert.sql
-- Allow anon/public users to insert and select bookings directly in Supabase (Fallback & Direct Client Access)

DROP POLICY IF EXISTS "bookings_public_insert" ON bookings;
CREATE POLICY "bookings_public_insert" ON bookings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_public_select" ON bookings;
CREATE POLICY "bookings_public_select" ON bookings
    FOR SELECT USING (true);
