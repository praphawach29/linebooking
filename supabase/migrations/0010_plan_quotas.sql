-- 0010_plan_quotas.sql
-- ระบบโควตาแพ็กเกจ + การป้องกันการใช้งานซ้ำฟรีแพลน
-- Strategy: 14-day Free Trial of Pro → After expiry → Strict Free Quota
--   Free plan quotas:
--     - Max  3 services
--     - Max  1 active staff
--     - Max  1 active court / resource
--     - Max 30 bookings per calendar month
--
-- Abuse prevention: Trial starts from the *shop creation date* (server-side),
-- so registering with a different e-mail only resets the 14-day clock once per
-- new shop. The strict post-trial quotas make it economically unattractive to
-- keep cycling free accounts for professional usage.

-- ---------------------------------------------------------------
-- 1. Add trial_started_at to tenants (authoritative server-side date)
-- ---------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();

-- Back-fill existing rows: use created_at so their trial still counts from
-- when they actually signed up (not today).
UPDATE tenants
SET trial_started_at = created_at
WHERE trial_started_at IS NULL;

-- ---------------------------------------------------------------
-- 2. Convenience view – expose trial status without exposing secrets
-- ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.tenant_plan_status AS
SELECT
  id,
  name,
  plan,
  trial_started_at,
  trial_started_at + INTERVAL '14 days'                    AS trial_ends_at,
  GREATEST(0,
    EXTRACT(EPOCH FROM (trial_started_at + INTERVAL '14 days' - NOW()))::INT
    / 86400
  )                                                        AS trial_days_remaining,
  NOW() <= (trial_started_at + INTERVAL '14 days')        AS is_in_trial,
  plan IN ('pro', 'enterprise')                           AS is_paid_plan
FROM tenants;

-- Only tenant owners / platform admins can read their own row
-- (RLS on the base tenants table already enforces this)

-- ---------------------------------------------------------------
-- 3. RLS: tenant_plan_status is a VIEW so it inherits tenants' RLS
--    (no separate policy needed)
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 4. Helper RPC: get_my_trial_status
--    Returns the trial info for the caller's active tenant.
--    Front-end can call: supabase.rpc('get_my_trial_status')
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_trial_status()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_result    JSON;
BEGIN
  -- Find tenant linked to the calling user
  SELECT t.id INTO v_tenant_id
  FROM public.tenants t
  JOIN public.users u ON u.tenant_id = t.id
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN '{"error": "no_tenant"}'::JSON;
  END IF;

  SELECT row_to_json(s) INTO v_result
  FROM public.tenant_plan_status s
  WHERE s.id = v_tenant_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_trial_status() TO authenticated;
