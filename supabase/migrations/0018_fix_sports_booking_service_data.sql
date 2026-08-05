-- 0018_fix_sports_booking_service_data.sql
-- Repair old JackSports bookings that were created against the sample spa service.
-- The UI and customer history should show the sports venue service/court data.

WITH sports_service AS (
  SELECT s.*
  FROM services s
  JOIN tenants t ON t.id = s.tenant_id
  WHERE t.name = 'JackSports'
    AND t.business_type = 'sports'
    AND s.is_active = true
  ORDER BY s.created_at NULLS LAST, s.name
  LIMIT 1
), active_courts AS (
  SELECT
    c.*,
    row_number() OVER (ORDER BY c.created_at NULLS LAST, c.name) AS rn,
    count(*) OVER () AS total
  FROM courts c
  JOIN sports_service s ON s.tenant_id = c.tenant_id
  WHERE c.is_active = true
), target_bookings AS (
  SELECT
    b.id,
    row_number() OVER (ORDER BY b.booking_date, b.start_time, b.created_at) AS rn
  FROM bookings b
  JOIN tenants t ON t.id = b.tenant_id
  WHERE t.name = 'JackSports'
    AND t.business_type = 'sports'
    AND b.service_id NOT IN (SELECT id FROM services WHERE tenant_id = b.tenant_id)
), mapped AS (
  SELECT
    tb.id,
    ss.id AS service_id,
    ss.name AS service_name,
    ss.duration_minutes,
    ss.price::numeric AS service_price,
    ac.id AS court_id,
    trim(ac.name) AS court_name,
    ss.price::numeric + coalesce(ac.extra_price_per_hour, 0)::numeric AS final_price
  FROM target_bookings tb
  CROSS JOIN sports_service ss
  LEFT JOIN active_courts ac ON ac.rn = ((tb.rn - 1) % nullif(ac.total, 0)) + 1
)
UPDATE bookings b
SET service_id = mapped.service_id,
    service_name = mapped.service_name,
    service_duration = mapped.duration_minutes,
    service_price = mapped.service_price,
    court_id = mapped.court_id,
    court_name = mapped.court_name,
    staff_id = NULL,
    staff_name = NULL,
    price = mapped.final_price,
    final_price = mapped.final_price,
    deposit_amount = mapped.final_price * 0.5
FROM mapped
WHERE b.id = mapped.id;

