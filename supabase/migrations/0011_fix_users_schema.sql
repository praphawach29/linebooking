-- 0011_fix_users_schema.sql
-- Ensure users table has all expected columns and roles

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'merchant_admin';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Update existing rows where auth_user_id is null to match id
UPDATE public.users
SET auth_user_id = id
WHERE auth_user_id IS NULL;
