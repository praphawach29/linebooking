-- 0031_tenant_line_access.sql
-- Grant access to tenants table for settings updates and token retrieval

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO anon;
GRANT ALL PRIVILEGES ON TABLE public.tenants TO authenticated;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_public_read" ON public.tenants;
CREATE POLICY "tenants_public_read" ON public.tenants
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "tenants_public_update" ON public.tenants;
CREATE POLICY "tenants_public_update" ON public.tenants
    FOR UPDATE TO anon, authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tenants_public_insert" ON public.tenants;
CREATE POLICY "tenants_public_insert" ON public.tenants
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

COMMIT;
