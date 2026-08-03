-- 0004_platform_billing.sql
-- ระบบรับชำระค่าบริการ SaaS ระดับแพลตฟอร์ม (Platform Billing)
--  1. platform_settings      : ตั้งค่า Gateway (Omise / PromptPay ของเจ้าของแพลตฟอร์ม)
--  2. platform_billing_public: View เปิดเผยเฉพาะข้อมูลที่ปลอดภัย ให้ร้านค้าอ่านตอนจ่ายเงิน
--  3. subscription_invoices  : ใบแจ้งหนี้/ประวัติการต่ออายุแพ็กเกจของแต่ละร้าน

-- ---------------------------------------------------------------
-- 1. ตารางตั้งค่าแพลตฟอร์ม (singleton row เดียว id = 1)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
    id                     INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),

    -- ช่องทางหลักที่ใช้รับเงินค่าแพ็กเกจ: 'promptpay' (โอนเข้าเลขพร้อมเพย์ตัวเอง) หรือ 'omise'
    active_provider        TEXT NOT NULL DEFAULT 'promptpay'
                           CHECK (active_provider IN ('promptpay', 'omise')),

    -- PromptPay ของเจ้าของแพลตฟอร์ม
    promptpay_number       TEXT,
    promptpay_name         TEXT,

    -- Omise / Opn Payments
    omise_enabled          BOOLEAN NOT NULL DEFAULT false,
    omise_public_key       TEXT,
    omise_secret_key       TEXT,   -- อ่านได้เฉพาะ platform_admin (แนะนำให้ตั้งใน backend .env แทน)
    omise_test_mode        BOOLEAN NOT NULL DEFAULT true,

    -- ราคาแพ็กเกจ (บาท) แก้ได้จากหน้า Super Admin
    price_pro_monthly         NUMERIC(10,2) NOT NULL DEFAULT 990,
    price_pro_yearly          NUMERIC(10,2) NOT NULL DEFAULT 9900,
    price_enterprise_monthly  NUMERIC(10,2) NOT NULL DEFAULT 2990,
    price_enterprise_yearly   NUMERIC(10,2) NOT NULL DEFAULT 29900,
    currency               TEXT NOT NULL DEFAULT 'THB',

    -- ต่ออายุอัตโนมัติเมื่อชำระเงินสำเร็จ
    auto_renew_on_payment  BOOLEAN NOT NULL DEFAULT true,

    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_by             UUID REFERENCES users(id)
);

INSERT INTO platform_settings (id, promptpay_number, promptpay_name)
VALUES (1, '0812345678', 'บริษัท ไลน์ โอเอ บุกกิ้ง จำกัด')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 2. ใบแจ้งหนี้ / ประวัติการชำระค่าแพ็กเกจ
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_invoices (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no     TEXT UNIQUE NOT NULL,
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan           tenant_plan NOT NULL,
    billing_cycle  TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    amount         NUMERIC(10,2) NOT NULL,
    currency       TEXT NOT NULL DEFAULT 'THB',
    method         TEXT NOT NULL CHECK (method IN ('promptpay', 'credit_card')),
    provider       TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'promptpay', 'omise')),
    provider_ref   TEXT,               -- charge id จาก Omise เช่น chrg_test_xxx
    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded')),
    qr_payload     TEXT,               -- EMVCo payload ที่ออกให้ครั้งนี้ (ไว้ตรวจสอบย้อนหลัง)
    period_start   TIMESTAMPTZ,
    period_end     TIMESTAMPTZ,
    paid_at        TIMESTAMPTZ,
    failure_reason TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_invoices_tenant ON subscription_invoices(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_status ON subscription_invoices(status);

-- ---------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------
ALTER TABLE platform_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

-- helper: ผู้ใช้ปัจจุบันเป็น platform_admin หรือไม่
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
      AND role = 'platform_admin'
  );
$$;

-- platform_settings: เฉพาะ Super Admin เท่านั้นที่อ่าน/แก้ไขได้ทั้งแถว (มี secret key อยู่)
DROP POLICY IF EXISTS "platform_settings_admin_all" ON platform_settings;
CREATE POLICY "platform_settings_admin_all" ON platform_settings
    FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- subscription_invoices: ร้านค้าเห็นเฉพาะของตัวเอง, Super Admin เห็นทั้งหมด
DROP POLICY IF EXISTS "invoices_read" ON subscription_invoices;
CREATE POLICY "invoices_read" ON subscription_invoices
    FOR SELECT USING (
      is_platform_admin()
      OR tenant_id IN (
        SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
      )
      OR tenant_id IN (
        SELECT t.id FROM tenants t
        JOIN users u ON u.id = t.owner_user_id
        WHERE u.auth_user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "invoices_insert" ON subscription_invoices;
CREATE POLICY "invoices_insert" ON subscription_invoices
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "invoices_update" ON subscription_invoices;
CREATE POLICY "invoices_update" ON subscription_invoices
    FOR UPDATE USING (
      is_platform_admin()
      OR tenant_id IN (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid())
    );

-- ---------------------------------------------------------------
-- 4. View สาธารณะ — เปิดเฉพาะฟิลด์ที่ปลอดภัยให้ร้านค้าอ่านตอนจ่ายเงิน
--    (ไม่มี omise_secret_key เด็ดขาด)
-- ---------------------------------------------------------------
DROP VIEW IF EXISTS platform_billing_public CASCADE;
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
    auto_renew_on_payment
FROM platform_settings
WHERE id = 1;

GRANT SELECT ON platform_billing_public TO anon, authenticated;
