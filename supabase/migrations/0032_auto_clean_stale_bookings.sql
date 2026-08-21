-- 0032_auto_clean_stale_bookings.sql
-- Add DELETE policy on bookings and RPC for cleaning stale pending bookings

BEGIN;

-- 1. Ensure DELETE policy is active on bookings
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bookings TO anon;
GRANT ALL PRIVILEGES ON TABLE public.bookings TO authenticated;

DROP POLICY IF EXISTS "bookings_delete_policy" ON public.bookings;
CREATE POLICY "bookings_delete_policy" ON public.bookings
    FOR DELETE TO anon, authenticated
    USING (true);

-- 2. Stored procedure to clean or expire stale pending bookings
CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_bookings(
  p_tenant_id uuid,
  p_days int DEFAULT 1
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count int;
  v_cutoff_date date;
BEGIN
  v_cutoff_date := CURRENT_DATE - (p_days || ' days')::interval;
  
  DELETE FROM public.bookings
  WHERE tenant_id = p_tenant_id
    AND status = 'pending'
    AND booking_date <= v_cutoff_date;
    
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_pending_bookings(uuid, int) TO anon, authenticated;

COMMIT;
