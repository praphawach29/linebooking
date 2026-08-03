-- 0007_rls_hardening.sql
-- ปิดช่องโหว่ RLS ที่เปิดกว้างเกินไปจาก public_access.sql
--
-- ปัญหาเดิม (ทุกคนที่มี anon key ซึ่งอยู่ในไฟล์ JS ของหน้าเว็บ ทำได้):
--   1. อ่านตาราง tenants ได้ทั้งตาราง → line_channel_secret / access_token ของทุกร้านหลุด
--   2. อ่านตาราง bookings ได้ทั้งตาราง → ชื่อ + เบอร์โทรลูกค้าทุกคนหลุด
--   3. ตาราง staff / courts / business_hours / reviews / rewards / service_addons ฯลฯ
--      ไม่ได้เปิด RLS เลย → anon "เขียนและลบ" ได้ด้วย
--
-- หลักการหลังแก้:
--   - ข้อมูลที่ลูกค้าต้องเห็นตอนจอง (ชื่อร้าน บริการ ช่าง เวลาทำการ) → อ่านผ่าน view ที่คัดฟิลด์แล้ว
--   - ข้อมูลส่วนบุคคล (bookings, users) → ต้องล็อกอิน และเห็นเฉพาะของตัวเอง/ร้านตัวเอง
--   - การเขียนทุกตาราง → เจ้าของร้านหรือ platform_admin เท่านั้น
--
-- ⚠️ ต้องรัน 0004-0006 ก่อน (ใช้ฟังก์ชัน is_platform_admin() และ my_tenant_ids())

-- ---------------------------------------------------------------
-- 0. ลบ policy เดิมที่เปิดกว้าง
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "public_read_tenants"   ON tenants;
DROP POLICY IF EXISTS "public_read_services"  ON services;
DROP POLICY IF EXISTS "public_read_bookings"  ON bookings;
DROP POLICY IF EXISTS "public_insert_bookings" ON bookings;

-- ---------------------------------------------------------------
-- 1. เปิด RLS ให้ครบทุกตาราง (เดิมหลายตารางไม่ได้เปิด = เขียนทับได้)
-- ---------------------------------------------------------------
ALTER TABLE tenants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addon_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours         ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships            ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 2. View สาธารณะสำหรับหน้าจอง LIFF — คัดเฉพาะฟิลด์ที่ลูกค้าต้องเห็น
--    ไม่มี line_channel_secret / line_channel_access_token / owner_user_id
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public_tenants
WITH (security_invoker = false) AS
SELECT
    id,
    name,
    slug,
    description,
    logo_url,
    cover_image_url,
    phone,
    address,
    business_type,
    plan,
    is_active,
    liff_id,          -- ไม่ใช่ความลับ ใช้ init LIFF ฝั่ง client อยู่แล้ว
    -- settings เก็บเฉพาะคีย์ที่หน้าลูกค้าต้องใช้ (พร้อมเพย์ร้านค้าลูกค้าเห็นตอนจ่ายมัดจำอยู่แล้ว)
    jsonb_build_object(
        'promptpayNumber',      settings->'promptpayNumber',
        'promptpayName',        settings->'promptpayName',
        'depositPercentage',    settings->'depositPercentage',
        'currency',             settings->'currency',
        'bookingFlowMode',      settings->'bookingFlowMode',
        'enableStaffSelection', settings->'enableStaffSelection',
        'enableCourtSelection', settings->'enableCourtSelection',
        'resourceTerm',         settings->'resourceTerm',
        'googleMapUrl',         settings->'googleMapUrl',
        'maxAdvanceBookingDays',settings->'maxAdvanceBookingDays',
        'minLeadTimeHours',     settings->'minLeadTimeHours',
        'autoConfirm',          settings->'autoConfirm'
    ) AS settings,
    created_at
FROM tenants
WHERE is_active IS NOT false;

GRANT SELECT ON public_tenants TO anon, authenticated;

-- ---------------------------------------------------------------
-- 3. ช่วงเวลาที่ถูกจองแล้ว — ใช้คำนวณ slot ว่าง โดยไม่เปิดเผยตัวตนลูกค้า
--    (เดิมหน้าเว็บอ่านทั้งตาราง bookings เพื่อทำเรื่องนี้)
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public_busy_slots
WITH (security_invoker = false) AS
SELECT
    id,
    tenant_id,
    service_id,
    staff_id,
    court_id,
    booking_date,
    start_time,
    end_time,
    status
FROM bookings
WHERE status <> 'cancelled';

GRANT SELECT ON public_busy_slots TO anon, authenticated;

-- ---------------------------------------------------------------
-- 4. tenants — เจ้าของร้าน/แอดมินเท่านั้นที่เห็นข้อมูลเต็ม (รวม LINE credentials)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "tenants_owner_read" ON tenants;
CREATE POLICY "tenants_owner_read" ON tenants
    FOR SELECT TO authenticated
    USING (is_platform_admin() OR id IN (SELECT my_tenant_ids()));

DROP POLICY IF EXISTS "tenants_owner_update" ON tenants;
CREATE POLICY "tenants_owner_update" ON tenants
    FOR UPDATE TO authenticated
    USING (is_platform_admin() OR id IN (SELECT my_tenant_ids()))
    WITH CHECK (is_platform_admin() OR id IN (SELECT my_tenant_ids()));

-- สมัครเปิดร้านใหม่ (self-service registration)
DROP POLICY IF EXISTS "tenants_insert_authenticated" ON tenants;
CREATE POLICY "tenants_insert_authenticated" ON tenants
    FOR INSERT TO authenticated WITH CHECK (true);

-- ---------------------------------------------------------------
-- 5. users — เห็นตัวเอง / คนในร้านเดียวกัน / แอดมินเห็นหมด
--    (เดิมเปิด RLS แต่ไม่มี policy → อ่านไม่ได้เลย ทำให้ currentUser เป็น null อยู่แล้ว)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "users_self_read" ON users;
CREATE POLICY "users_self_read" ON users
    FOR SELECT TO authenticated
    USING (
        auth_user_id = auth.uid()
        OR is_platform_admin()
        OR tenant_id IN (SELECT my_tenant_ids())
    );

DROP POLICY IF EXISTS "users_self_update" ON users;
CREATE POLICY "users_self_update" ON users
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid() OR is_platform_admin())
    WITH CHECK (auth_user_id = auth.uid() OR is_platform_admin());

-- ตอนสมัครสมาชิกใหม่ต้องเขียนแถว users ของตัวเองได้
DROP POLICY IF EXISTS "users_insert_self" ON users;
CREATE POLICY "users_insert_self" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid() OR is_platform_admin());

-- ---------------------------------------------------------------
-- 6. ตารางแคตตาล็อก — ลูกค้าอ่านได้ (ไม่มีข้อมูลส่วนบุคคล) แต่เขียนได้เฉพาะเจ้าของร้าน
-- ---------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'services', 'service_addons', 'staff', 'courts',
        'business_hours', 'staff_schedules', 'cancellation_policies', 'rewards'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_public_read', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR SELECT USING (true)',
            t || '_public_read', t
        );

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_write', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL TO authenticated
             USING (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()))
             WITH CHECK (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()))',
            t || '_owner_write', t
        );
    END LOOP;
END $$;

-- ตารางเชื่อม (ไม่มี tenant_id ของตัวเอง) — อ่านได้ เขียนต้องผ่านเจ้าของร้านของ staff/service นั้น
DROP POLICY IF EXISTS "staff_services_public_read" ON staff_services;
CREATE POLICY "staff_services_public_read" ON staff_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "staff_services_owner_write" ON staff_services;
CREATE POLICY "staff_services_owner_write" ON staff_services
    FOR ALL TO authenticated
    USING (is_platform_admin() OR staff_id IN (SELECT id FROM staff WHERE tenant_id IN (SELECT my_tenant_ids())))
    WITH CHECK (is_platform_admin() OR staff_id IN (SELECT id FROM staff WHERE tenant_id IN (SELECT my_tenant_ids())));

DROP POLICY IF EXISTS "addon_mappings_public_read" ON service_addon_mappings;
CREATE POLICY "addon_mappings_public_read" ON service_addon_mappings FOR SELECT USING (true);

DROP POLICY IF EXISTS "addon_mappings_owner_write" ON service_addon_mappings;
CREATE POLICY "addon_mappings_owner_write" ON service_addon_mappings
    FOR ALL TO authenticated
    USING (is_platform_admin() OR service_id IN (SELECT id FROM services WHERE tenant_id IN (SELECT my_tenant_ids())))
    WITH CHECK (is_platform_admin() OR service_id IN (SELECT id FROM services WHERE tenant_id IN (SELECT my_tenant_ids())));

-- รีวิว: อ่านได้สาธารณะ (แสดงหน้าร้าน) แต่แก้ไข/ลบได้เฉพาะเจ้าของร้าน
DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews
    FOR INSERT WITH CHECK (
        -- รีวิวได้เฉพาะการจองที่มีอยู่จริงและเสร็จสิ้นแล้ว
        booking_id IN (SELECT id FROM bookings WHERE status = 'completed')
    );

DROP POLICY IF EXISTS "reviews_owner_manage" ON reviews;
CREATE POLICY "reviews_owner_manage" ON reviews
    FOR UPDATE TO authenticated
    USING (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()))
    WITH CHECK (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()));

-- ---------------------------------------------------------------
-- 7. bookings — ห้ามอ่านสาธารณะเด็ดขาด (มีชื่อ + เบอร์โทรลูกค้า)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_tenant_read" ON bookings;
CREATE POLICY "bookings_tenant_read" ON bookings
    FOR SELECT TO authenticated
    USING (
        is_platform_admin()
        OR tenant_id IN (SELECT my_tenant_ids())
        OR user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- ลูกค้าจองผ่าน LIFF ได้โดยยังไม่ต้องล็อกอิน Supabase (ก่อน Phase 1 เสร็จ)
-- แต่จำกัดว่าร้านต้องเปิดใช้งานอยู่ และห้ามตั้งสถานะจ่ายเงินเองจากฝั่ง client
DROP POLICY IF EXISTS "bookings_public_insert" ON bookings;
CREATE POLICY "bookings_public_insert" ON bookings
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT id FROM tenants WHERE is_active IS NOT false)
        AND status IN ('pending', 'confirmed')
    );

DROP POLICY IF EXISTS "bookings_tenant_update" ON bookings;
CREATE POLICY "bookings_tenant_update" ON bookings
    FOR UPDATE TO authenticated
    USING (
        is_platform_admin()
        OR tenant_id IN (SELECT my_tenant_ids())
        OR user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    );

-- ---------------------------------------------------------------
-- 8. RPC สำหรับ "คิวของฉัน" ในหน้า LIFF
--    ยังไม่มี Supabase Auth ฝั่งลูกค้า (Phase 1) จึงใช้ LINE user ID เป็นกุญแจไปก่อน
--    ปลอดภัยกว่าเดิมมาก (เดิมอ่านการจองของทุกคนได้) แต่ยังไม่ใช่ของถาวร
--    👉 เมื่อทำ LIFF + Supabase Auth เสร็จ ให้เปลี่ยนไปใช้ auth.uid() แล้วลบฟังก์ชันนี้
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_bookings(p_line_user_id TEXT)
RETURNS SETOF bookings
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.* FROM bookings b
  JOIN users u ON u.id = b.user_id
  WHERE u.line_user_id = p_line_user_id
    AND p_line_user_id IS NOT NULL
    AND length(p_line_user_id) >= 10   -- กันการเดาสุ่มด้วยค่าสั้น ๆ
  ORDER BY b.booking_date DESC, b.start_time DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION get_my_bookings(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------
-- 9. ตารางที่เหลือ — ข้อมูลส่วนบุคคล ต้องล็อกอินเท่านั้น
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "payments_tenant_only" ON payments;
CREATE POLICY "payments_tenant_only" ON payments
    FOR ALL TO authenticated
    USING (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()))
    WITH CHECK (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()));

DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
    FOR ALL TO authenticated
    USING (
        is_platform_admin()
        OR tenant_id IN (SELECT my_tenant_ids())
        OR user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
    WITH CHECK (
        is_platform_admin()
        OR tenant_id IN (SELECT my_tenant_ids())
    );

DROP POLICY IF EXISTS "memberships_own" ON memberships;
CREATE POLICY "memberships_own" ON memberships
    FOR ALL TO authenticated
    USING (
        is_platform_admin()
        OR tenant_id IN (SELECT my_tenant_ids())
        OR user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
    WITH CHECK (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()));

DROP POLICY IF EXISTS "point_tx_own" ON point_transactions;
CREATE POLICY "point_tx_own" ON point_transactions
    FOR ALL TO authenticated
    USING (
        is_platform_admin()
        OR membership_id IN (
            SELECT m.id FROM memberships m
            WHERE m.tenant_id IN (SELECT my_tenant_ids())
               OR m.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    )
    WITH CHECK (is_platform_admin() OR membership_id IN (
        SELECT m.id FROM memberships m WHERE m.tenant_id IN (SELECT my_tenant_ids())
    ));

DROP POLICY IF EXISTS "redemptions_own" ON reward_redemptions;
CREATE POLICY "redemptions_own" ON reward_redemptions
    FOR ALL TO authenticated
    USING (
        is_platform_admin()
        OR membership_id IN (
            SELECT m.id FROM memberships m
            WHERE m.tenant_id IN (SELECT my_tenant_ids())
               OR m.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        )
    )
    WITH CHECK (true);

-- ---------------------------------------------------------------
-- 10. ตรวจผลลัพธ์ — ควรได้ 0 แถว (ไม่มีตารางไหนที่เปิด RLS แต่ไม่มี policy
--     และไม่มีตารางไหนที่ปิด RLS)
-- ---------------------------------------------------------------
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false;
