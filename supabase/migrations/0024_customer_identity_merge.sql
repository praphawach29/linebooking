-- 0024_customer_identity_merge.sql
-- Supports merging a customer's LINE-authenticated account with a separate,
-- phone-linked account created before they ever logged into LINE (e.g. a
-- walk-in check-in scanned by staff). merged_into_user_id marks a user row
-- as superseded without deleting it, preserving history/FKs for audit.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS merged_into_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_merged_into_user_id
  ON public.users (merged_into_user_id);

CREATE INDEX IF NOT EXISTS idx_users_phone
  ON public.users (phone)
  WHERE phone IS NOT NULL AND merged_into_user_id IS NULL;

COMMIT;
