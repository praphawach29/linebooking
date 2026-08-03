-- 0006_payment_slips.sql
-- แผนสอง: ชำระผ่าน PromptPay + แนบสลิป + ตรวจสอบ (อัตโนมัติ/ด้วยคน)
--   1. payment_slips        : สลิปที่ร้านค้าอัปโหลด + ผลการตรวจ
--   2. storage bucket       : payment-slips (private)
--   3. ต่อยอด platform_settings : ตั้งค่าบริการตรวจสลิป + บัญชีปลายทางที่ถูกต้อง
--
-- ⚠️ ต้องรัน 0004 และ 0005 ก่อนไฟล์นี้

-- ---------------------------------------------------------------
-- 1. เพิ่มสถานะ awaiting_review ให้ใบแจ้งหนี้ (รอตรวจสลิป)
-- ---------------------------------------------------------------
ALTER TABLE subscription_invoices DROP CONSTRAINT IF EXISTS subscription_invoices_status_check;
ALTER TABLE subscription_invoices
    ADD CONSTRAINT subscription_invoices_status_check
    CHECK (status IN ('pending', 'awaiting_review', 'paid', 'failed', 'expired', 'refunded'));

-- ---------------------------------------------------------------
-- 2. ตารางสลิป
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_slips (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id          UUID NOT NULL REFERENCES subscription_invoices(id) ON DELETE CASCADE,
    uploaded_by         UUID REFERENCES users(id) ON DELETE SET NULL,

    -- ไฟล์รูปสลิปใน Supabase Storage (bucket: payment-slips) — private ต้องใช้ signed URL
    storage_path        TEXT NOT NULL,

    amount_claimed      NUMERIC(10,2) NOT NULL,   -- ยอดที่ควรจ่ายตามใบแจ้งหนี้

    -- pending          : เพิ่งอัปโหลด ยังไม่ได้ตรวจ
    -- auto_verified    : API ตรวจผ่านครบทุกข้อ → อนุมัติอัตโนมัติ
    -- auto_rejected    : API ตรวจแล้วไม่ผ่าน (เช่น สลิปปลอม/ซ้ำ) → ยังให้คนตรวจซ้ำได้
    -- manual_approved  : เจ้าหน้าที่กดอนุมัติ
    -- manual_rejected  : เจ้าหน้าที่ปฏิเสธ
    verification_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN
                              ('pending', 'auto_verified', 'auto_rejected', 'manual_approved', 'manual_rejected')),

    verify_provider     TEXT NOT NULL DEFAULT 'manual'
                        CHECK (verify_provider IN ('manual', 'slipok', 'easyslip')),

    -- ข้อมูลที่อ่านได้จากสลิป (จาก API หรือกรอกเอง)
    trans_ref           TEXT,          -- เลขอ้างอิงรายการโอน — ใช้กันสลิปซ้ำ
    sender_name         TEXT,
    sender_bank         TEXT,
    receiver_name       TEXT,
    receiver_account    TEXT,
    amount_verified     NUMERIC(10,2),
    transferred_at      TIMESTAMPTZ,

    -- ผลการตรวจ 4 ข้อ {amountMatch, receiverMatch, timeValid, refUnique}
    checks              JSONB DEFAULT '{}'::jsonb,
    raw_response        JSONB,

    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    reject_reason       TEXT,
    note                TEXT,          -- หมายเหตุจากร้านค้า

    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slips_tenant  ON payment_slips(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slips_invoice ON payment_slips(invoice_id);
CREATE INDEX IF NOT EXISTS idx_slips_status  ON payment_slips(verification_status, created_at DESC);

-- 🔒 กันสลิปซ้ำ: เลขอ้างอิงรายการโอนหนึ่งเลข ใช้ได้ครั้งเดียวเท่านั้นทั้งระบบ
--    (ข้อนี้สำคัญที่สุด — กันเอาสลิปใบเดิมมาใช้ต่ออายุหลายรอบ)
CREATE UNIQUE INDEX IF NOT EXISTS idx_slips_trans_ref_unique
    ON payment_slips(trans_ref)
    WHERE trans_ref IS NOT NULL;

-- ---------------------------------------------------------------
-- 3. RLS — ร้านค้าเห็น/อัปโหลดเฉพาะของตัวเอง, Super Admin เห็นและอนุมัติได้ทั้งหมด
-- ---------------------------------------------------------------
ALTER TABLE payment_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slips_read" ON payment_slips;
CREATE POLICY "slips_read" ON payment_slips
    FOR SELECT USING (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()));

DROP POLICY IF EXISTS "slips_insert" ON payment_slips;
CREATE POLICY "slips_insert" ON payment_slips
    FOR INSERT WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

-- ร้านค้าแก้ไขสลิปตัวเองไม่ได้ — อนุมัติ/ปฏิเสธเป็นสิทธิ์ของ platform_admin เท่านั้น
DROP POLICY IF EXISTS "slips_update_admin" ON payment_slips;
CREATE POLICY "slips_update_admin" ON payment_slips
    FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ---------------------------------------------------------------
-- 4. Storage bucket สำหรับรูปสลิป (private)
-- ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-slips',
    'payment-slips',
    false,                                    -- private: ต้องขอ signed URL ก่อนดู
    5242880,                                  -- จำกัด 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- โครงสร้าง path: {tenant_id}/{invoice_id}/{timestamp}.jpg
-- โฟลเดอร์ชั้นแรกคือ tenant_id → ใช้เป็นตัวคุมสิทธิ์
DROP POLICY IF EXISTS "slips_storage_upload" ON storage.objects;
CREATE POLICY "slips_storage_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'payment-slips'
        AND (storage.foldername(name))[1] IN (SELECT my_tenant_ids()::text)
    );

DROP POLICY IF EXISTS "slips_storage_read" ON storage.objects;
CREATE POLICY "slips_storage_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'payment-slips'
        AND (
            is_platform_admin()
            OR (storage.foldername(name))[1] IN (SELECT my_tenant_ids()::text)
        )
    );

-- ---------------------------------------------------------------
-- 5. ตั้งค่าการตรวจสลิป (แก้จากหน้า Super Admin)
-- ---------------------------------------------------------------
ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS slip_verify_provider TEXT NOT NULL DEFAULT 'manual'
    CHECK (slip_verify_provider IN ('manual', 'slipok', 'easyslip'));

ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS slip_verify_api_key TEXT;          -- อ่านได้เฉพาะ platform_admin

ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS slip_verify_branch_id TEXT;        -- SlipOK ใช้ branch id ใน endpoint

-- อนุมัติอัตโนมัติเมื่อตรวจผ่านครบทุกข้อหรือไม่ (ปิดไว้ = ให้คนกดยืนยันทุกใบ)
ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS slip_auto_approve BOOLEAN NOT NULL DEFAULT true;

-- บัญชีปลายทางที่ถูกต้อง — ใช้เทียบว่าโอนเข้าบัญชีเราจริงไหม
ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS expected_receiver_name TEXT;

ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS expected_receiver_account TEXT;    -- เลขบัญชี/พร้อมเพย์ (เทียบ 4 ตัวท้าย)

-- สลิปต้องมีเวลาโอนไม่เกินกี่ชั่วโมงหลังออกใบแจ้งหนี้
ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS slip_time_window_hours INTEGER NOT NULL DEFAULT 72;

-- ยอมรับส่วนต่างของยอดเงินได้กี่บาท (เผื่อค่าธรรมเนียมโอนข้ามธนาคาร)
ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS slip_amount_tolerance NUMERIC(10,2) NOT NULL DEFAULT 0;

-- แจ้งเตือนก่อนแพ็กเกจหมดอายุ (วัน) — จำเป็นเพราะ PromptPay ต่ออายุอัตโนมัติไม่ได้
ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS renewal_reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[7, 3, 1];

-- อัปเดต view สาธารณะ (ยังไม่มี secret key / api key เหมือนเดิม)
CREATE OR REPLACE VIEW platform_billing_public
WITH (security_invoker = false) AS
SELECT
    active_provider,
    promptpay_number,
    promptpay_name,
    omise_enabled,
    omise_public_key,
    omise_test_mode,
    price_pro_monthly,
    price_pro_yearly,
    price_enterprise_monthly,
    price_enterprise_yearly,
    currency,
    auto_renew_on_payment,
    dunning_retry_days,
    grace_period_days,
    trial_days,
    slip_verify_provider,
    slip_auto_approve,
    expected_receiver_name,
    renewal_reminder_days
FROM platform_settings
WHERE id = 1;

GRANT SELECT ON platform_billing_public TO anon, authenticated;

-- ---------------------------------------------------------------
-- 6. View สรุปคิวรออนุมัติ สำหรับหน้า Super Admin
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW pending_slip_reviews
WITH (security_invoker = true) AS
SELECT
    s.id,
    s.tenant_id,
    t.name          AS tenant_name,
    t.logo_url      AS tenant_logo,
    s.invoice_id,
    i.invoice_no,
    i.plan,
    i.billing_cycle,
    s.amount_claimed,
    s.amount_verified,
    s.storage_path,
    s.verification_status,
    s.verify_provider,
    s.trans_ref,
    s.sender_name,
    s.sender_bank,
    s.receiver_name,
    s.transferred_at,
    s.checks,
    s.reject_reason,
    s.note,
    s.created_at
FROM payment_slips s
JOIN tenants t ON t.id = s.tenant_id
JOIN subscription_invoices i ON i.id = s.invoice_id
ORDER BY s.created_at DESC;

GRANT SELECT ON pending_slip_reviews TO authenticated;
