-- 0016_add_missing_booking_columns.sql
-- The bookings table in production is missing 4 critical columns that were defined in 0001
-- but apparently never applied. This migration adds them with safe defaults.

-- ---------------------------------------------------------------
-- Step 1: Create ENUM types if they don't exist yet
-- ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'unpaid', 'paid', 'refunded', 'partial_refund'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'promptpay', 'credit_card', 'cash', 'transfer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_source AS ENUM (
    'line_liff', 'web', 'admin', 'walk_in'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- Step 2: Add missing columns to bookings table
-- ---------------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS status booking_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_method payment_method,
  ADD COLUMN IF NOT EXISTS source booking_source DEFAULT 'line_liff';

-- ---------------------------------------------------------------
-- Step 3: Verify — should show all 4 new columns
-- ---------------------------------------------------------------
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name IN ('status', 'payment_status', 'payment_method', 'source')
ORDER BY column_name;
