-- 0020_close_browser_onboarding_writes.sql
-- Merchant onboarding is now owned by POST /auth/merchant/onboard.

BEGIN;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_insert_authenticated ON public.tenants;
DROP POLICY IF EXISTS users_insert_self ON public.users;
DROP POLICY IF EXISTS users_self_update ON public.users;

REVOKE INSERT ON TABLE public.tenants FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.users FROM authenticated;

-- Reads remain governed by tenants_owner_read and users_self_read. Backend
-- service-role and direct database connections are not affected by these grants.
GRANT SELECT ON TABLE public.tenants TO authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenants'
      AND cmd = 'INSERT'
      AND ('public' = ANY (roles) OR 'authenticated' = ANY (roles))
  ) THEN
    RAISE EXCEPTION 'Authenticated tenant INSERT policy remains';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND ('public' = ANY (roles) OR 'authenticated' = ANY (roles))
  ) THEN
    RAISE EXCEPTION 'Authenticated user mutation policy remains';
  END IF;
END
$$;

COMMIT;
