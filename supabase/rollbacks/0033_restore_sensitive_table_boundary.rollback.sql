-- Safe rollback for 0033_restore_sensitive_table_boundary.sql.
-- Security hardening is forward-only. This fail-closed rollback removes
-- browser access to sensitive base tables while preserving public views.

BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.tenants FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.users FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.bookings FROM anon, authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.cleanup_stale_pending_bookings(uuid,integer)') IS NOT NULL THEN
    REVOKE ALL PRIVILEGES ON FUNCTION public.cleanup_stale_pending_bookings(uuid, integer) FROM PUBLIC;
    REVOKE ALL PRIVILEGES ON FUNCTION public.cleanup_stale_pending_bookings(uuid, integer) FROM anon;
    REVOKE ALL PRIVILEGES ON FUNCTION public.cleanup_stale_pending_bookings(uuid, integer) FROM authenticated;
  END IF;
END
$$;

GRANT SELECT ON TABLE public.public_tenants TO anon, authenticated;
GRANT SELECT ON TABLE public.public_busy_slots TO anon, authenticated;

COMMIT;
