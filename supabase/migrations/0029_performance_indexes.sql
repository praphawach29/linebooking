-- 0029_performance_indexes.sql
-- High-throughput composite indexes for availability calculations, customer lookups, and dead-letter queue pagination.

BEGIN;

-- 1. Accelerate availability calculation slot filtering
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date_status
  ON public.bookings (tenant_id, booking_date, status);

-- 2. Accelerate staff-based slot collision checks
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_staff_date
  ON public.bookings (tenant_id, staff_id, booking_date);

-- 3. Accelerate court-based slot collision checks
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_court_date
  ON public.bookings (tenant_id, court_id, booking_date);

-- 4. Accelerate LINE Dead-Letter Queue (DLQ) tenant queries & ordering
CREATE INDEX IF NOT EXISTS idx_line_deliveries_tenant_status_updated
  ON public.line_message_deliveries (tenant_id, status, updated_at DESC);

-- 5. Accelerate Platform-wide DLQ queries & retry scans
CREATE INDEX IF NOT EXISTS idx_line_deliveries_status_updated
  ON public.line_message_deliveries (status, updated_at DESC);

COMMIT;
