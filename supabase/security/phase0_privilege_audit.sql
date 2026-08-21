-- Phase 0 production privilege audit
-- Run in the Supabase SQL editor after migration 0033.
-- The script returns evidence rows and raises an exception on unsafe access.

SELECT
  p.schemaname,
  p.tablename,
  p.policyname,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
FROM pg_policies AS p
WHERE p.schemaname = 'public'
  AND p.tablename IN ('tenants', 'users', 'bookings')
ORDER BY p.tablename, p.policyname;

SELECT
  grantee,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'tenants',
    'users',
    'bookings',
    'public_tenants',
    'public_busy_slots'
  )
  AND grantee IN ('anon', 'authenticated')
GROUP BY grantee, table_name
ORDER BY grantee, table_name;

SELECT
  has_function_privilege(
    'anon',
    'public.cleanup_stale_pending_bookings(uuid,integer)',
    'EXECUTE'
  ) AS anon_can_cleanup,
  has_function_privilege(
    'authenticated',
    'public.cleanup_stale_pending_bookings(uuid,integer)',
    'EXECUTE'
  ) AS authenticated_can_cleanup
WHERE to_regprocedure(
  'public.cleanup_stale_pending_bookings(uuid,integer)'
) IS NOT NULL;

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
    RAISE EXCEPTION 'FAIL: unsafe policy remains on a sensitive table';
  END IF;

  IF has_table_privilege('anon', 'public.tenants', 'SELECT')
    OR has_table_privilege('anon', 'public.users', 'SELECT')
    OR has_table_privilege('anon', 'public.bookings', 'SELECT')
  THEN
    RAISE EXCEPTION 'FAIL: anon retains sensitive base-table access';
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
    RAISE EXCEPTION 'FAIL: authenticated retains unsafe mutation privileges';
  END IF;

  IF to_regprocedure(
    'public.cleanup_stale_pending_bookings(uuid,integer)'
  ) IS NOT NULL AND (
    has_function_privilege(
      'anon',
      'public.cleanup_stale_pending_bookings(uuid,integer)',
      'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated',
      'public.cleanup_stale_pending_bookings(uuid,integer)',
      'EXECUTE'
    )
  ) THEN
    RAISE EXCEPTION 'FAIL: browser role can execute stale cleanup';
  END IF;

  IF NOT has_table_privilege('anon', 'public.public_tenants', 'SELECT')
    OR NOT has_table_privilege('anon', 'public.public_busy_slots', 'SELECT')
  THEN
    RAISE EXCEPTION 'FAIL: required filtered public views are unavailable';
  END IF;

  RAISE NOTICE 'PASS: Phase 0 privilege audit completed successfully';
END
$$;
