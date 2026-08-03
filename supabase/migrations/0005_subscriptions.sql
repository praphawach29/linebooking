-- 0005_subscriptions.sql
-- ระบบสมาชิกรายเดือน/รายปี แบบตัดบัตรอัตโนมัติ (Recurring Billing — ทางเลือก A)
--   1. payment_methods : บัตรที่ผูกไว้ (เก็บแค่ token ของ Omise ไม่มีเลขบัตรจริง)
--   2. subscriptions   : สถานะสมาชิกของแต่ละร้าน + รอบบิลปัจจุบัน
--   3. ต่อยอด subscription_invoices จาก migration 0004
--
-- ⚠️ ต้องรัน 0004_platform_billing.sql ก่อนไฟล์นี้

-- ---------------------------------------------------------------
-- 1. บัตรที่ผูกไว้ (Vaulted Cards)
--    PCI-DSS: ห้ามเก็บเลขบัตรเต็ม / CVV เด็ดขาด เก็บได้แค่ token + ข้อมูลแสดงผล
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_methods (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    provider            TEXT NOT NULL DEFAULT 'omise' CHECK (provider IN ('omise')),
    omise_customer_id   TEXT NOT NULL,          -- cust_xxx
    omise_card_id       TEXT NOT NULL,          -- card_xxx

    brand               TEXT,                   -- Visa / MasterCard / JCB
    last4               TEXT,
    exp_month           INTEGER,
    exp_year            INTEGER,
    name_on_card        TEXT,

    is_default          BOOLEAN NOT NULL DEFAULT true,

    -- หลักฐานความยินยอมให้ตัดเงินอัตโนมัติ (บังคับตามกฎ Visa/Mastercard สำหรับ MIT)
    mandate_accepted_at TIMESTAMPTZ,
    mandate_ip          TEXT,
    mandate_text        TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, omise_card_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);

-- ---------------------------------------------------------------
-- 2. Subscription — หนึ่งร้านมีได้หนึ่ง subscription ที่ active
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                 UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

    plan                      tenant_plan NOT NULL DEFAULT 'pro',
    billing_cycle             TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),

    -- trialing : อยู่ในช่วงทดลองใช้
    -- active   : ปกติ จ่ายครบ
    -- past_due : ตัดบัตรไม่ผ่าน อยู่ระหว่าง retry (ยังใช้งานได้ = grace period)
    -- unpaid   : retry ครบแล้วยังไม่ได้เงิน → ถูกลดเป็น Free
    -- canceled : ยกเลิกแล้ว
    status                    TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('trialing', 'active', 'past_due', 'unpaid', 'canceled')),

    current_period_start      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end        TIMESTAMPTZ NOT NULL,

    -- ยกเลิกแล้วแต่ยังใช้ได้จนจบรอบที่จ่ายไว้
    cancel_at_period_end      BOOLEAN NOT NULL DEFAULT false,
    canceled_at               TIMESTAMPTZ,

    default_payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,

    -- Dunning (ทวงหนี้อัตโนมัติ)
    retry_count               INTEGER NOT NULL DEFAULT 0,
    next_retry_at             TIMESTAMPTZ,
    last_error                TEXT,

    -- ลดแพ็กเกจ (downgrade) จะมีผลเมื่อจบรอบที่จ่ายไว้แล้ว ไม่ตัดสิทธิ์กลางคัน
    pending_plan              tenant_plan,
    pending_billing_cycle     TEXT CHECK (pending_billing_cycle IN ('monthly', 'yearly')),

    trial_end                 TIMESTAMPTZ,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- index หลักที่ worker ใช้ไล่หา subscription ที่ถึงกำหนดเก็บเงิน
CREATE INDEX IF NOT EXISTS idx_subscriptions_due
    ON subscriptions(status, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_retry
    ON subscriptions(status, next_retry_at);

-- ---------------------------------------------------------------
-- 3. ต่อยอด subscription_invoices ให้ผูกกับ subscription + กันตัดซ้ำ
-- ---------------------------------------------------------------
ALTER TABLE subscription_invoices
    ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

ALTER TABLE subscription_invoices
    ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;

-- billing_reason: ทำไมถึงออกใบแจ้งหนี้ใบนี้
ALTER TABLE subscription_invoices
    ADD COLUMN IF NOT EXISTS billing_reason TEXT NOT NULL DEFAULT 'manual'
    CHECK (billing_reason IN ('manual', 'subscription_create', 'subscription_cycle', 'subscription_update'));

ALTER TABLE subscription_invoices
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

-- Idempotency: กัน worker รันซ้อน/retry แล้วตัดเงินซ้ำในรอบเดียวกัน
ALTER TABLE subscription_invoices
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sub_invoices_idempotency
    ON subscription_invoices(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;

-- helper: tenant ที่ผู้ใช้ปัจจุบันเป็นเจ้าของหรือสังกัดอยู่
CREATE OR REPLACE FUNCTION my_tenant_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id FROM users WHERE auth_user_id = auth.uid() AND tenant_id IS NOT NULL
  UNION
  SELECT t.id FROM tenants t
  JOIN users u ON u.id = t.owner_user_id
  WHERE u.auth_user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "payment_methods_owner" ON payment_methods;
CREATE POLICY "payment_methods_owner" ON payment_methods
    FOR ALL
    USING (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()))
    WITH CHECK (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()));

DROP POLICY IF EXISTS "subscriptions_owner" ON subscriptions;
CREATE POLICY "subscriptions_owner" ON subscriptions
    FOR ALL
    USING (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()))
    WITH CHECK (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()));

-- ---------------------------------------------------------------
-- 5. ตั้งค่า Dunning ระดับแพลตฟอร์ม (แก้จากหน้า Super Admin ได้)
-- ---------------------------------------------------------------
ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS dunning_retry_days INTEGER[] NOT NULL DEFAULT ARRAY[3, 5, 7];

ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS grace_period_days INTEGER NOT NULL DEFAULT 10;

ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 0;

-- อัปเดต view ให้ร้านค้าเห็นเงื่อนไขเหล่านี้ด้วย (ยังไม่มี secret key เหมือนเดิม)
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
    auto_renew_on_payment,
    dunning_retry_days,
    grace_period_days,
    trial_days
FROM platform_settings
WHERE id = 1;

GRANT SELECT ON platform_billing_public TO anon, authenticated;

-- ---------------------------------------------------------------
-- 6. Backfill: สร้าง subscription ให้ร้านที่จ่ายเงินไว้แล้ว (plan != free)
-- ---------------------------------------------------------------
INSERT INTO subscriptions (tenant_id, plan, billing_cycle, status, current_period_start, current_period_end)
SELECT
    t.id,
    t.plan,
    'monthly',
    'active',
    COALESCE(t.created_at, NOW()),
    COALESCE(t.plan_expires_at, NOW() + INTERVAL '30 days')
FROM tenants t
WHERE t.plan <> 'free'
ON CONFLICT (tenant_id) DO NOTHING;
