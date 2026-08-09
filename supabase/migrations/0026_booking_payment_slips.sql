-- 0026_booking_payment_slips.sql
-- Lets a customer attach a PromptPay payment slip to their own booking, and
-- the merchant verify it, instead of the booking being silently marked as
-- paid the moment the QR code is shown (no verification ever happened).

BEGIN;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_slip_uploaded_at TIMESTAMPTZ;

COMMIT;
