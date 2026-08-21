-- 0033_restore_sensitive_table_boundary.sql
-- Close the sensitive-table access reopened by migrations 0030-0032.

BEGIN;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_public_read ON public.tenants;
DROP POLICY IF EXISTS public_read_tenants ON public.tenants;
DROP POLICY IF EXISTS tenants_public_update ON public.tenants;
DROP POLICY IF EXISTS tenants_public_insert ON public.tenants;

DROP POLICY IF EXISTS users_public_select ON public.users;
DROP POLICY IF EXISTS users_public_insert ON public.users;
DROP POLICY IF EXISTS users_public_update ON public.users;

DROP POLICY IF EXISTS bookings_public_select ON public.bookings;
DROP POLICY IF EXISTS bookings_public_insert ON public.bookings;
DROP POLICY IF EXISTS bookings_public_update ON public.bookings;
DROP POLICY IF EXISTS public_read_bookings ON public.bookings;
DROP POLICY IF EXISTS public_insert_bookings ON public.bookings;
DROP POLICY IF EXISTS bookings_insert_policy ON public.bookings;
DROP POLICY IF EXISTS bookings_select_policy ON public.bookings;
DROP POLICY IF EXISTS bookings_update_policy ON public.bookings;
DROP POLICY IF EXISTS bookings_delete_policy ON public.bookings;

-- Explicit grants are a second boundary in addition to RLS.
REVOKE ALL PRIVILEGES ON TABLE public.tenants FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.users FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.bookings FROM anon, authenticated;

-- Merchants retain only the browser reads and tenant update needed by the
-- existing dashboard. RLS below limits these operations to their tenants.
GRANT SELECT, UPDATE ON TABLE public.tenants TO authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT SELECT ON TABLE public.bookings TO authenticated;

DROP POLICY IF EXISTS tenants_owner_read ON public.tenants;
CREATE POLICY tenants_owner_read ON public.tenants
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS tenants_owner_update ON public.tenants;
CREATE POLICY tenants_owner_update ON public.tenants
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR id IN (SELECT public.my_tenant_ids())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS users_self_read ON public.users;
CREATE POLICY users_self_read ON public.users
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR auth_user_id = auth.uid()
    OR tenant_id IN (SELECT public.my_tenant_ids())
  );

DROP POLICY IF EXISTS bookings_tenant_read ON public.bookings;
CREATE POLICY bookings_tenant_read ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR tenant_id IN (SELECT public.my_tenant_ids())
    OR user_id IN (
      SELECT u.id
      FROM public.users AS u
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Cleanup is owned by the authenticated backend route after this migration.
DO $$
BEGIN
  IF to_regprocedure('public.cleanup_stale_pending_bookings(uuid,integer)') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON FUNCTION public.cleanup_stale_pending_bookings(uuid, integer) FROM PUBLIC;
    REVOKE ALL PRIVILEGES ON FUNCTION public.cleanup_stale_pending_bookings(uuid, integer) FROM anon;
    REVOKE ALL PRIVILEGES ON FUNCTION public.cleanup_stale_pending_bookings(uuid, integer) FROM authenticated;
  END IF;
END
$$;

-- Rebuild the deliberately filtered public surface. These views contain no
-- LINE credentials, customer PII, prices, payment details, or booking owners.
DROP VIEW IF EXISTS public.public_busy_slots;
DROP VIEW IF EXISTS public.public_tenants;

CREATE VIEW public.public_tenants
WITH (security_invoker = false) AS
SELECT
  (to_jsonb(t)->>'id')::uuid AS id,
  to_jsonb(t)->>'name' AS name,
  to_jsonb(t)->>'slug' AS slug,
  to_jsonb(t)->>'description' AS description,
  to_jsonb(t)->>'logo_url' AS logo_url,
  to_jsonb(t)->>'cover_image_url' AS cover_image_url,
  to_jsonb(t)->>'phone' AS phone,
  to_jsonb(t)->>'address' AS address,
  to_jsonb(t)->>'business_type' AS business_type,
  COALESCE(to_jsonb(t)->>'plan', 'free') AS plan,
  COALESCE((to_jsonb(t)->>'is_active')::boolean, true) AS is_active,
  to_jsonb(t)->>'liff_id' AS liff_id,
  jsonb_build_object(
    'promptpayNumber', to_jsonb(t)->'settings'->'promptpayNumber',
    'promptpayName', to_jsonb(t)->'settings'->'promptpayName',
    'depositPercentage', to_jsonb(t)->'settings'->'depositPercentage',
    'currency', to_jsonb(t)->'settings'->'currency',
    'bookingFlowMode', to_jsonb(t)->'settings'->'bookingFlowMode',
    'enableStaffSelection', to_jsonb(t)->'settings'->'enableStaffSelection',
    'enableCourtSelection', to_jsonb(t)->'settings'->'enableCourtSelection',
    'resourceTerm', to_jsonb(t)->'settings'->'resourceTerm',
    'googleMapUrl', to_jsonb(t)->'settings'->'googleMapUrl',
    'maxAdvanceBookingDays', to_jsonb(t)->'settings'->'maxAdvanceBookingDays',
    'minLeadTimeHours', to_jsonb(t)->'settings'->'minLeadTimeHours',
    'autoConfirm', to_jsonb(t)->'settings'->'autoConfirm'
  ) AS settings,
  (to_jsonb(t)->>'created_at')::timestamptz AS created_at
FROM public.tenants AS t
WHERE COALESCE((to_jsonb(t)->>'is_active')::boolean, true) = true;

CREATE VIEW public.public_busy_slots
WITH (security_invoker = false) AS
SELECT
  (to_jsonb(b)->>'id')::uuid AS id,
  (to_jsonb(b)->>'tenant_id')::uuid AS tenant_id,
  (to_jsonb(b)->>'service_id')::uuid AS service_id,
  (to_jsonb(b)->>'staff_id')::uuid AS staff_id,
  (to_jsonb(b)->>'court_id')::uuid AS court_id,
  (to_jsonb(b)->>'booking_date')::date AS booking_date,
  (to_jsonb(b)->>'start_time')::time AS start_time,
  (to_jsonb(b)->>'end_time')::time AS end_time,
  to_jsonb(b)->>'status' AS status
FROM public.bookings AS b
WHERE COALESCE(to_jsonb(b)->>'status', 'pending') <> 'cancelled';

REVOKE ALL PRIVILEGES ON TABLE public.public_tenants FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.public_busy_slots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_tenants TO anon, authenticated;
GRANT SELECT ON TABLE public.public_busy_slots TO anon, authenticated;

-- Fail the migration if an unsafe policy or grant remains.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('tenants', 'users', 'bookings')
      AND (
        'public' = ANY (roles)
        OR 'anon' = ANY (roles)
        OR trim(COALESCE(qual, '')) IN ('true', '(true)')
        OR trim(COALESCE(with_check, '')) IN ('true', '(true)')
      )
  ) THEN
    RAISE EXCEPTION 'Unsafe policy remains on a sensitive table';
  END IF;

  IF has_table_privilege('anon', 'public.tenants', 'SELECT')
    OR has_table_privilege('anon', 'public.users', 'SELECT')
    OR has_table_privilege('anon', 'public.bookings', 'SELECT')
  THEN
    RAISE EXCEPTION 'anon retains direct access to a sensitive table';
  END IF;

  IF has_table_privilege('authenticated', 'public.users', 'INSERT')
    OR has_table_privilege('authenticated', 'public.users', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.users', 'DELETE')
    OR has_table_privilege('authenticated', 'public.bookings', 'INSERT')
    OR has_table_privilege('authenticated', 'public.bookings', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.bookings', 'DELETE')
    OR has_table_privilege('authenticated', 'public.tenants', 'INSERT')
    OR has_table_privilege('authenticated', 'public.tenants', 'DELETE')
  THEN
    RAISE EXCEPTION 'authenticated retains an unsafe mutation privilege';
  END IF;

  IF to_regprocedure('public.cleanup_stale_pending_bookings(uuid,integer)') IS NOT NULL
    AND (
      has_function_privilege('anon', 'public.cleanup_stale_pending_bookings(uuid,integer)', 'EXECUTE')
      OR has_function_privilege('authenticated', 'public.cleanup_stale_pending_bookings(uuid,integer)', 'EXECUTE')
    )
  THEN
    RAISE EXCEPTION 'browser role can still execute stale booking cleanup';
  END IF;
END
$$;

COMMIT;
