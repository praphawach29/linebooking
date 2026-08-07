-- 0021_close_browser_booking_updates.sql
-- Booking status changes and reschedules are now owned by guarded Backend APIs.

BEGIN;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_tenant_update ON public.bookings;
DROP POLICY IF EXISTS bookings_public_update ON public.bookings;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.bookings FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.bookings FROM anon;

-- Merchant/customer reads continue through existing SELECT policies or Backend.
GRANT SELECT ON TABLE public.bookings TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND (
        'public' = ANY (roles)
        OR 'anon' = ANY (roles)
        OR 'authenticated' = ANY (roles)
      )
  ) THEN
    RAISE EXCEPTION 'Client booking mutation policy remains';
  END IF;
END
$$;

COMMIT;
