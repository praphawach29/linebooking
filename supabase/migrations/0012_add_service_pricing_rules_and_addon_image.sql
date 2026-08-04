-- 0012_add_service_pricing_rules_and_addon_image.sql
-- Add time_pricing_rules JSONB to services table, image_url to service_addons, and staff schedule columns

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS time_pricing_rules JSONB DEFAULT '[]'::jsonb;

ALTER TABLE service_addons 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
ADD COLUMN IF NOT EXISTS work_start_time TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS work_end_time TEXT DEFAULT '18:00';
