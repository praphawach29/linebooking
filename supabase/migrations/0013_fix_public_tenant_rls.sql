-- 0013_fix_public_tenant_rls.sql
-- Enable public anon select policy on tenants table so LIFF guest users can view active merchant profile and services

DROP POLICY IF EXISTS "tenants_public_read" ON tenants;
CREATE POLICY "tenants_public_read" ON tenants
    FOR SELECT USING (is_active IS NOT false);
