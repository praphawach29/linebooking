-- 0025_service_schedules_and_blackout_dates.sql
-- 1) Persist the per-service / per-court custom operating-schedule toggle
--    that already existed in the merchant UI but was never actually saved
--    or read by the availability engine.
-- 2) Add advance blackout dates (holidays / maintenance closures) at
--    tenant, service, or court scope.

BEGIN;

ALTER TABLE services ADD COLUMN IF NOT EXISTS operating_schedule JSONB;
ALTER TABLE courts   ADD COLUMN IF NOT EXISTS operating_schedule JSONB;

CREATE TABLE IF NOT EXISTS blackout_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('tenant', 'service', 'court')),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT blackout_dates_scope_fk_check CHECK (
        (scope = 'tenant'  AND service_id IS NULL AND court_id IS NULL) OR
        (scope = 'service' AND service_id IS NOT NULL AND court_id IS NULL) OR
        (scope = 'court'   AND court_id IS NOT NULL)
    ),
    CONSTRAINT blackout_dates_date_range_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_blackout_dates_tenant_range
    ON blackout_dates (tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_blackout_dates_service
    ON blackout_dates (service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blackout_dates_court
    ON blackout_dates (court_id) WHERE court_id IS NOT NULL;

ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blackout_dates_public_read" ON blackout_dates;
CREATE POLICY "blackout_dates_public_read" ON blackout_dates FOR SELECT USING (true);

DROP POLICY IF EXISTS "blackout_dates_owner_write" ON blackout_dates;
CREATE POLICY "blackout_dates_owner_write" ON blackout_dates
    FOR ALL TO authenticated
    USING (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()))
    WITH CHECK (is_platform_admin() OR tenant_id IN (SELECT my_tenant_ids()));

COMMIT;
