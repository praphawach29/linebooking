-- 0027_customer_profile_lookup_indexes.sql
-- Speed up customer profile booking and completed-visit counters.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_user_status
  ON public.bookings (tenant_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_phone_status
  ON public.bookings (tenant_id, user_phone, status);

COMMIT;
