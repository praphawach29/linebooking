-- 0028_audit_logs.sql
-- Phase 3 Security Hardening: Comprehensive Audit Logging for Critical Actions
-- Records who changed what, when, and previous vs new states.

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'system', -- 'merchant_admin', 'staff', 'customer', 'system', 'webhook', 'platform_admin'
    action VARCHAR(100) NOT NULL,                      -- 'booking_confirmed', 'booking_cancelled', 'booking_rescheduled', 'booking_checked_in', 'points_adjusted', etc.
    entity_type VARCHAR(50) NOT NULL,                 -- 'booking', 'membership', 'payment', 'tenant', 'user'
    entity_id VARCHAR(255) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Efficient indexing for querying tenant audit trails
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created 
    ON public.audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity 
    ON public.audit_logs (tenant_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action 
    ON public.audit_logs (tenant_id, action);

-- Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenants can only read their own audit logs
CREATE POLICY audit_logs_tenant_select ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
        )
    );

-- Prevent direct client modifications: audit logs are strictly written by backend server
DROP POLICY IF EXISTS audit_logs_client_insert ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_client_update ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_client_delete ON public.audit_logs;

COMMIT;
