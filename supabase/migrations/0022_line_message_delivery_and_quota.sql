-- 0022_line_message_delivery_and_quota.sql
-- Durable LINE delivery audit and monthly quota snapshots. Backend service-role only.

BEGIN;

CREATE TABLE IF NOT EXISTS public.line_message_deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'skipped_disabled', 'skipped_recipient')),
  idempotency_key text NOT NULL UNIQUE,
  line_message_count integer NOT NULL DEFAULT 1 CHECK (line_message_count > 0),
  line_request_id text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  error_code text,
  error_message text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_deliveries_tenant_created
  ON public.line_message_deliveries (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_line_deliveries_booking
  ON public.line_message_deliveries (booking_id);
CREATE INDEX IF NOT EXISTS idx_line_deliveries_status
  ON public.line_message_deliveries (status, scheduled_at);

CREATE TABLE IF NOT EXISTS public.line_quota_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period ~ '^[0-9]{4}-[0-9]{2}$'),
  quota_type text NOT NULL CHECK (quota_type IN ('limited', 'none')),
  quota_value integer CHECK (quota_value IS NULL OR quota_value >= 0),
  total_usage integer NOT NULL DEFAULT 0 CHECK (total_usage >= 0),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period)
);

ALTER TABLE public.line_message_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_quota_snapshots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.line_message_deliveries FROM anon, authenticated;
REVOKE ALL ON TABLE public.line_quota_snapshots FROM anon, authenticated;

COMMIT;
