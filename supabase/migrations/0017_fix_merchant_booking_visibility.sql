-- 0017_fix_merchant_booking_visibility.sql
-- แก้ปัญหา 2 อย่าง:
-- 1. ร้านค้าไม่เห็นรายการจอง — เพราะ users row ที่สร้างผ่าน AuthContext ไม่มี auth_user_id
--    ทำให้ my_tenant_ids() คืนค่าว่าง → RLS bookings_tenant_read ปฏิเสธการอ่าน
-- 2. ลูกค้าบน LINE เห็นรายการจองน้อยกว่าบนเว็บ — เพราะ get_my_bookings ค้นหาจาก
--    JOIN users ที่ต้องการ user_id ไม่ใช่ null

-- ---------------------------------------------------------------
-- Step 1: ซ่อม users rows ที่มี auth_user_id เป็น NULL หรือไม่ตรง
--         (merchant ที่สมัครหลัง migration 0011 อาจสร้าง row โดยไม่ set auth_user_id)
-- ---------------------------------------------------------------

-- สำหรับ rows ที่ id ดูเหมือน Supabase Auth UUID (merchant, platform_admin)
-- ให้ set auth_user_id = id ถ้ายังไม่มี
UPDATE public.users
SET auth_user_id = id
WHERE auth_user_id IS NULL
  AND line_user_id IS NULL  -- ไม่แตะ LINE users
  AND id IS NOT NULL;

-- ---------------------------------------------------------------
-- Step 2: เพิ่ม trigger ให้ auto-set auth_user_id เมื่อ INSERT users ใหม่
--         โดยไม่ set auth_user_id แต่ line_user_id ก็เป็น NULL (= merchant/admin)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_set_auth_user_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- ถ้า insert row ที่ไม่ใช่ LINE user (line_user_id = null) และยังไม่มี auth_user_id
  -- ให้ตั้ง auth_user_id = id (ซึ่งควรเป็น Supabase Auth UUID ของ merchant)
  IF NEW.auth_user_id IS NULL AND NEW.line_user_id IS NULL THEN
    NEW.auth_user_id := NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_auth_user_id ON public.users;
CREATE TRIGGER trg_auto_set_auth_user_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_set_auth_user_id();

-- ---------------------------------------------------------------
-- Step 3: อัปเดต get_my_bookings ให้รองรับกรณีที่ booking ถูก insert ด้วย user_id=null
--         (เกิดเมื่อ upsert users table ล้มเหลวแต่ booking ถูก insert สำเร็จ)
--         ใช้ tenant context เพิ่มเติมเพื่อ match booking ที่มี user_name ตรงกัน
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_bookings(p_line_user_id TEXT)
RETURNS SETOF bookings
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Case 1: booking linked via user_id → users.line_user_id (normal backend flow)
  SELECT b.* FROM bookings b
  JOIN users u ON u.id = b.user_id
  WHERE u.line_user_id = p_line_user_id
    AND p_line_user_id IS NOT NULL
    AND length(p_line_user_id) >= 10

  UNION

  -- Case 2: booking has NULL user_id but was created by this LINE user
  --         (fallback frontend insert when backend was unavailable)
  --         Match via the users record that has this line_user_id
  SELECT b.* FROM bookings b
  WHERE b.user_id IS NULL
    AND p_line_user_id IS NOT NULL
    AND length(p_line_user_id) >= 10
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.line_user_id = p_line_user_id
        AND (
          -- ตรวจ display_name ตรงกับ user_name ใน booking
          u.display_name = b.user_name
        )
    )

  ORDER BY booking_date DESC, start_time DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION get_my_bookings(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------
-- Step 4: ทำให้ร้านค้า (authenticated) อ่าน bookings ของ tenant ตัวเองได้แน่นอน
--         แม้ว่า my_tenant_ids() จะคืนค่าว่าง เพิ่ม policy ที่ตรงกว่า
-- ---------------------------------------------------------------

-- เพิ่ม policy สำหรับ merchant ที่ tenant_id ของ users ตรงกับ booking.tenant_id
DROP POLICY IF EXISTS "bookings_merchant_tenant_read" ON bookings;
CREATE POLICY "bookings_merchant_tenant_read" ON bookings
  FOR SELECT TO authenticated
  USING (
    is_platform_admin()
    OR tenant_id IN (SELECT my_tenant_ids())
    OR tenant_id IN (
      -- ดึง tenant_id จาก users row ที่ auth_user_id = auth.uid()
      SELECT tenant_id FROM users
      WHERE (auth_user_id = auth.uid() OR id = auth.uid())
        AND tenant_id IS NOT NULL
    )
    OR user_id IN (
      SELECT id FROM users
      WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- Step 5: ตรวจสอบว่า users ที่เป็น LINE customer ยัง insert/select ได้
--         (policies 0015 ไม่ต้องแก้ เพราะ USING(true) ยังอยู่)
-- ---------------------------------------------------------------

-- ตรวจ policies ที่มีอยู่ (comment เพื่อ debug ถ้าจำเป็น)
-- SELECT policyname, cmd, roles, qual FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('bookings', 'users')
-- ORDER BY tablename, cmd;
