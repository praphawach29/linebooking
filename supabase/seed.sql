-- Seed data for Line OA Booking SaaS
-- Run this in your Supabase SQL Editor AFTER running 0001_initial_schema.sql

INSERT INTO tenants (id, name, slug, description, business_type, plan, is_active, settings)
VALUES ('00000000-0000-0000-0000-000000000001', 'ร้านสปาตัวอย่าง', 'spa-demo', 'ร้านสปาตัวอย่างสำหรับทดสอบระบบ', 'spa', 'pro', true, '{"currency": "THB", "autoConfirm": true, "depositPercentage": 50}'::jsonb);

INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, max_capacity, category, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'นวดแผนไทย', 'นวดแผนไทย 60 นาที', 60, 500, 1, 'นวด', true);

INSERT INTO staff (id, tenant_id, name, phone, bio, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'หมอนวด 1', '080-000-0000', 'หมอนวดมืออาชีพ', true);

INSERT INTO business_hours (tenant_id, day_of_week, open_time, close_time, is_open)
VALUES 
('00000000-0000-0000-0000-000000000001', 0, '09:00', '20:00', true),
('00000000-0000-0000-0000-000000000001', 1, '09:00', '20:00', true),
('00000000-0000-0000-0000-000000000001', 2, '09:00', '20:00', true),
('00000000-0000-0000-0000-000000000001', 3, '09:00', '20:00', true),
('00000000-0000-0000-0000-000000000001', 4, '09:00', '20:00', true),
('00000000-0000-0000-0000-000000000001', 5, '09:00', '20:00', true),
('00000000-0000-0000-0000-000000000001', 6, '09:00', '20:00', true);

-- Add a mock user
INSERT INTO users (id, line_user_id, display_name, phone, role)
VALUES ('33333333-3333-3333-3333-333333333333', 'U1234567890abcdef', 'ลูกค้าทดสอบ', '0812345678', 'customer');
