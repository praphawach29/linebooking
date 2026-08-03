-- 0009_modular_booking_flow.sql
-- LINE OA Booking SaaS - Modular Booking Flow & Presets Configuration

-- Helper function to get or initialize modular booking flow config for a tenant
CREATE OR REPLACE FUNCTION get_tenant_booking_flow_config(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings JSONB;
  v_flow JSONB;
BEGIN
  SELECT settings INTO v_settings FROM tenants WHERE id = p_tenant_id;
  
  IF v_settings IS NULL THEN
    v_settings := '{}'::jsonb;
  END IF;

  v_flow := v_settings->'booking_flow_config';

  IF v_flow IS NULL THEN
    -- Default fallback preset if none exists
    v_flow := jsonb_build_object(
      'preset_template', 'SERVICE_AND_STAFF',
      'payment_mode', 'DEPOSIT_ONLY',
      'deposit_amount', COALESCE((v_settings->>'depositPercentage')::numeric, 0),
      'steps', jsonb_build_object(
        'require_service', true,
        'require_staff', COALESCE((v_settings->>'enableStaffSelection')::boolean, true),
        'require_resource', COALESCE((v_settings->>'enableCourtSelection')::boolean, false),
        'require_notes', false
      ),
      'auto_assign_staff', true,
      'auto_assign_resource', true,
      'slot_interval_minutes', 30
    );
  END IF;

  RETURN v_flow;
END;
$$;

-- Migration to update existing tenants default settings with booking_flow_config if missing
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{booking_flow_config}',
  jsonb_build_object(
    'preset_template', CASE 
      WHEN (settings->>'bookingFlowMode') = 'sports_court_time' THEN 'RESOURCE_AND_SLOT'
      WHEN (settings->>'bookingFlowMode') = 'service_time_only' THEN 'EXPRESS_QUEUE'
      ELSE 'SERVICE_AND_STAFF'
    END,
    'payment_mode', CASE 
      WHEN (settings->>'depositPercentage')::numeric > 0 THEN 'DEPOSIT_ONLY'
      ELSE 'NO_PAYMENT'
    END,
    'deposit_amount', COALESCE((settings->>'depositPercentage')::numeric, 0),
    'steps', jsonb_build_object(
      'require_service', CASE WHEN (settings->>'bookingFlowMode') = 'sports_court_time' THEN false ELSE true END,
      'require_staff', COALESCE((settings->>'enableStaffSelection')::boolean, true),
      'require_resource', COALESCE((settings->>'enableCourtSelection')::boolean, false),
      'require_notes', false
    ),
    'auto_assign_staff', true,
    'auto_assign_resource', true,
    'slot_interval_minutes', 30
  ),
  true
)
WHERE settings->'booking_flow_config' IS NULL;
