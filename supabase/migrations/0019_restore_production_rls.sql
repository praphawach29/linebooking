-- 0019_restore_production_rls.sql
-- Restore the production boundary after 0013-0015 reopened sensitive tables.
-- Public LIFF data remains available through public_tenants/public_busy_slots.

BEGIN;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- These policies expose tenant credentials, customer profiles, and bookings to
-- any caller holding the browser anon key.
DROP POLICY IF EXISTS tenants_public_read ON public.tenants;
DROP POLICY IF EXISTS public_read_tenants ON public.tenants;
DROP POLICY IF EXISTS users_public_select ON public.users;
DROP POLICY IF EXISTS users_public_insert ON public.users;
DROP POLICY IF EXISTS users_public_update ON public.users;
DROP POLICY IF EXISTS bookings_public_select ON public.bookings;
DROP POLICY IF EXISTS bookings_public_insert ON public.bookings;
DROP POLICY IF EXISTS bookings_public_update ON public.bookings;
DROP POLICY IF EXISTS public_read_bookings ON public.bookings;
DROP POLICY IF EXISTS public_insert_bookings ON public.bookings;

-- RLS is the primary boundary; explicit grants provide a second boundary.
REVOKE ALL PRIVILEGES ON TABLE public.tenants FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.users FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.bookings FROM anon;

-- This legacy SECURITY DEFINER function accepts an arbitrary LINE user ID.
-- Customer history must use the API, which verifies a LINE ID token. Some
-- production databases never installed the function, so guard the revoke.
DO $$
BEGIN
  IF to_regprocedure('public.get_my_bookings(text)') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON FUNCTION public.get_my_bookings(TEXT) FROM PUBLIC;
    REVOKE ALL PRIVILEGES ON FUNCTION public.get_my_bookings(TEXT) FROM anon;
    REVOKE ALL PRIVILEGES ON FUNCTION public.get_my_bookings(TEXT) FROM authenticated;
  END IF;
END
$$;

-- Recreate the filtered public surface in case an earlier environment skipped
-- migration 0007. to_jsonb keeps this compatible with older tenant schemas that
-- do not yet have optional columns such as plan or settings.
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

-- Keep the intentionally filtered public surface available to LIFF guests.
GRANT SELECT ON TABLE public.public_tenants TO anon, authenticated;
GRANT SELECT ON TABLE public.public_busy_slots TO anon, authenticated;

-- Abort if a sensitive table still has a PUBLIC or anon policy.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('tenants', 'users', 'bookings')
      AND ('public' = ANY (roles) OR 'anon' = ANY (roles))
  ) THEN
    RAISE EXCEPTION 'Unsafe PUBLIC/anon policy remains on a sensitive table';
  END IF;
END
$$;

COMMIT;
