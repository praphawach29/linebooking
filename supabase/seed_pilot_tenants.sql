-- ==============================================================================
-- PHASE 7: PILOT TENANTS SEED DATA
-- 5 Diverse Pilot Merchants for Release Validation & Production Readiness
-- ==============================================================================

-- 0. Ensure Extension, Enums & Required Columns Exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_plan') THEN
        CREATE TYPE tenant_plan AS ENUM ('free', 'pro', 'enterprise');
    END IF;
END$$;

-- Self-healing: ensure all columns exist on tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan tenant_plan DEFAULT 'free';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS line_channel_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS line_channel_secret TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS liff_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure courts table exists
CREATE TABLE IF NOT EXISTS courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    type TEXT DEFAULT 'indoor',
    extra_price_per_hour NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure staff table exists
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    rating NUMERIC DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure services table exists
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 60,
    price NUMERIC NOT NULL DEFAULT 0,
    max_capacity INT NOT NULL DEFAULT 1,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure rewards table exists
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    points_required INT NOT NULL DEFAULT 100,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 1. PILOT TENANT 1: Badminton Grand Arena (Court / Resource Focused)
INSERT INTO tenants (
  id, name, slug, description, business_type, plan, is_active,
  phone, email, address, logo_url, cover_image_url,
  settings, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Badminton Grand Arena',
  'badminton-arena',
  'สนามแบดมินตันมาตรฐานสากล 4 คอร์ท พื้นยางคุณภาพ พร้อมระบบไฟสว่างมาตรฐานแข่งขัน',
  'service_court_time',
  'pro',
  true,
  '081-111-0001',
  'contact@badminton-arena.demo',
  '88/1 ถนนศรีนครินทร์ แขวงสวนหลวง กรุงเทพมหานคร 10250',
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&auto=format&fit=crop&q=80',
  '{
    "currency": "THB",
    "slotIntervalMinutes": 60,
    "minAdvanceHours": 2,
    "maxAdvanceDays": 14,
    "autoConfirm": true,
    "depositPercentage": 100,
    "allowCancellation": true,
    "cancelAdvanceHours": 6,
    "businessHours": {
      "mon": {"open": "09:00", "close": "23:00", "isOpen": true},
      "tue": {"open": "09:00", "close": "23:00", "isOpen": true},
      "wed": {"open": "09:00", "close": "23:00", "isOpen": true},
      "thu": {"open": "09:00", "close": "23:00", "isOpen": true},
      "fri": {"open": "09:00", "close": "23:00", "isOpen": true},
      "sat": {"open": "08:00", "close": "23:00", "isOpen": true},
      "sun": {"open": "08:00", "close": "23:00", "isOpen": true}
    },
    "promptpayNumber": "0811110001",
    "promptpayName": "Badminton Grand Arena",
    "features": {"courtBooking": true, "multiSlot": true, "loyaltyPoints": true}
  }'::jsonb,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- Courts for Badminton Grand Arena
INSERT INTO courts (id, tenant_id, name, code, type, extra_price_per_hour, is_active) VALUES
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Court 1 (VIP Air Conditioned)', 'C1-VIP', 'indoor', 100, true),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Court 2 (Standard Rubber)', 'C2-STD', 'indoor', 0, true),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Court 3 (Standard Rubber)', 'C3-STD', 'indoor', 0, true),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Court 4 (Standard Rubber)', 'C4-STD', 'indoor', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Service for Badminton Grand Arena
INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, max_capacity, category, is_active) VALUES
  ('12000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'เช่าคอร์ทแบดมินตัน (1 ชั่วโมง)', 'เช่าสนามแบดมินตันพื้นยางมาตรฐาน 1 ชม.', 60, 250, 4, 'สนามแบดมินตัน', true)
ON CONFLICT (id) DO NOTHING;


-- 2. PILOT TENANT 2: Aura Wellness & Spa (Staff / Service Focused)
INSERT INTO tenants (
  id, name, slug, description, business_type, plan, is_active,
  phone, email, address, logo_url, cover_image_url,
  settings, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  'Aura Wellness & Spa',
  'aura-wellness',
  'ศูนย์บริการนวดบำบัด สปาอโรมา และดูแลสุขภาพแบบองค์รวมโดยผู้เชี่ยวชาญ',
  'service_staff_time',
  'enterprise',
  true,
  '081-111-0002',
  'aura@spawellness.demo',
  '123 สุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80',
  '{
    "currency": "THB",
    "slotIntervalMinutes": 30,
    "minAdvanceHours": 3,
    "maxAdvanceDays": 30,
    "autoConfirm": true,
    "depositPercentage": 30,
    "allowCancellation": true,
    "cancelAdvanceHours": 12,
    "promptpayNumber": "0811110002",
    "promptpayName": "Aura Wellness Co., Ltd.",
    "features": {"staffSelection": true, "addons": true, "loyaltyPoints": true}
  }'::jsonb,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- Staff for Aura Wellness
INSERT INTO staff (id, tenant_id, name, phone, bio, rating, reviews_count, is_active) VALUES
  ('21000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'คุณแก้วตา (Master Therapist)', '082-000-0001', 'ประสบการณ์นวดออฟฟิศซินโดรมและสปาอโรมา 8 ปี', 4.95, 128, true),
  ('21000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'คุณพิมพ์ใจ (Aroma Specialist)', '082-000-0002', 'ผู้เชี่ยวชาญการกดจุดสะท้อนเท้าและกลิ่นบำบัด 5 ปี', 4.88, 94, true),
  ('21000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'คุณอรุณ (Traditional Therapist)', '082-000-0003', 'เชี่ยวชาญนวดแผนไทยและประคบสมุนไพร 10 ปี', 4.92, 110, true)
ON CONFLICT (id) DO NOTHING;

-- Services for Aura Wellness
INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, max_capacity, category, is_active) VALUES
  ('22000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'นวดไทยราชสำนัก (Thai Royal Massage)', 'นวดคลายเส้นตำรับชาววัง ผ่อนคลายกล้ามเนื้อทั่วร่างกาย 90 นาที', 90, 850, 1, 'นวดแผนไทย', true),
  ('22000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'นวดอโรมาเธอราปี (Aromatherapy)', 'นวดน้ำมันหอมระเหยผ่อนคลายความเครียดและเพิ่มการไหลเวียนโลหิต 60 นาที', 60, 1200, 1, 'สปาและน้ำมันหอม', true),
  ('22000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'นวดศีรษะ คอ บ่า ไหล่ Office Syndrome', 'บำบัดอาการตึงเกร็งจากการทำงานหน้าจอคอมพิวเตอร์ 60 นาที', 60, 650, 1, 'ออฟฟิศซินโดรม', true)
ON CONFLICT (id) DO NOTHING;


-- 3. PILOT TENANT 3: FitFlex Yoga & Studio (Multi-Slot / Group Class Focused)
INSERT INTO tenants (
  id, name, slug, description, business_type, plan, is_active,
  phone, email, address, logo_url, cover_image_url,
  settings, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  'FitFlex Yoga & Fitness Studio',
  'fitflex-studio',
  'สตูดิโอโยคะ พิลาทิส และฟังก์ชันนอลเทรนนิ่ง คลาสกลุ่มขนาดเล็ก ใส่ใจรายบุคคล',
  'service_time_only',
  'pro',
  true,
  '081-111-0003',
  'hello@fitflex-studio.demo',
  '456 ถนนอารีย์สัมพันธ์ แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&auto=format&fit=crop&q=80',
  '{
    "currency": "THB",
    "slotIntervalMinutes": 60,
    "minAdvanceHours": 1,
    "maxAdvanceDays": 7,
    "autoConfirm": true,
    "depositPercentage": 100,
    "allowCancellation": true,
    "cancelAdvanceHours": 2,
    "promptpayNumber": "0811110003",
    "promptpayName": "FitFlex Studio",
    "features": {"groupClasses": true, "capacityControl": true, "loyaltyPoints": true}
  }'::jsonb,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- Services for FitFlex
INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, max_capacity, category, is_active) VALUES
  ('32000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Hatha Yoga Flow (คลาสกลุ่ม 12 ท่าน)', 'ฝึกความยืดหยุ่นและการหายใจเพื่อสร้างสมดุลร่างกายและจิตใจ', 60, 400, 12, 'Yoga', true),
  ('32000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Mat Pilates & Core Burn (คลาสกลุ่ม 10 ท่าน)', 'เสริมสร้างกล้ามเนื้อแกนกลางลำตัวและปรับบุคลิกภาพ', 60, 450, 10, 'Pilates', true),
  ('32000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Sound Healing & Meditation (คลาสกลุ่ม 8 ท่าน)', 'คลื่นเสียงบำบัดด้วยคริสตัลโบวล์ ผ่อนคลายระดับลึก', 60, 550, 8, 'Wellness', true)
ON CONFLICT (id) DO NOTHING;


-- 4. PILOT TENANT 4: Glow Aesthetic Clinic (PromptPay & Slip Verification Heavy)
INSERT INTO tenants (
  id, name, slug, description, business_type, plan, is_active,
  phone, email, address, logo_url, cover_image_url,
  settings, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000004',
  'Glow Aesthetic Clinic',
  'glow-clinic',
  'คลินิกเวชกรรมความงามและเลเซอร์ดูแลผิวพรรณ โดยทีมแพทย์ผู้เชี่ยวชาญเฉพาะทาง',
  'service_staff_time',
  'enterprise',
  true,
  '081-111-0004',
  'info@glowclinic.demo',
  '789 ถนนทองหล่อ แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&auto=format&fit=crop&q=80',
  '{
    "currency": "THB",
    "slotIntervalMinutes": 45,
    "minAdvanceHours": 4,
    "maxAdvanceDays": 30,
    "autoConfirm": false,
    "depositPercentage": 50,
    "allowCancellation": true,
    "cancelAdvanceHours": 24,
    "promptpayNumber": "0811110004",
    "promptpayName": "Glow Aesthetic Clinic",
    "slipVerifyProvider": "slipok",
    "slipAmountTolerance": 1.0,
    "slipTimeWindowHours": 24,
    "expectedReceiverName": "Glow Aesthetic Clinic",
    "features": {"slipVerification": true, "doctorConsult": true, "loyaltyPoints": true}
  }'::jsonb,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- Doctors for Glow Clinic
INSERT INTO staff (id, tenant_id, name, phone, bio, rating, reviews_count, is_active) VALUES
  ('41000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'พญ. พลอยไพลิน (Aesthetic Doctor)', '083-000-0001', 'แพทย์ผิวพรรณและความงาม เชี่ยวชาญการปรับรูปหน้าและเลเซอร์', 4.98, 215, true),
  ('41000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'นพ. กิตติศักดิ์ (Dermatologist)', '083-000-0002', 'แพทย์ผู้เชี่ยวชาญด้านผิวหนัง รักษาสิว หลุมสิว และฟื้นฟูผิว', 4.94, 180, true)
ON CONFLICT (id) DO NOTHING;

-- Treatments for Glow Clinic
INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, max_capacity, category, is_active) VALUES
  ('42000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Pico Laser Brightening & Rejuvenation', 'เลเซอร์ลดรอยดำ รอยสิว กระชับรูขุมขนและกระตุ้นคอลลาเจน', 45, 3500, 1, 'Laser & Skin', true),
  ('42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'Aqua Deep Clean & Vitamin Infusion', 'ทรีตเมนต์ทำความสะอาดผิว ผลัดเซลล์ผิวอย่างอ่อนโยน พร้อมผลักวิตามิน', 45, 1800, 1, 'Facial Treatment', true),
  ('42000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'ปรึกษาแพทย์ประเมินรูปหน้า (Doctor Consult)', 'ปรึกษาแพทย์ผู้เชี่ยวชาญเพื่อวางแผนการปรับรูปหน้าและดูแลผิว', 30, 500, 1, 'Consultation', true)
ON CONFLICT (id) DO NOTHING;


-- 5. PILOT TENANT 5: Smile Dental & Health Hub (High-Volume LINE Notification & Loyalty)
INSERT INTO tenants (
  id, name, slug, description, business_type, plan, is_active,
  phone, email, address, logo_url, cover_image_url,
  settings, created_at
) VALUES (
  '10000000-0000-0000-0000-000000000005',
  'Smile Dental & Health Hub',
  'smile-dental',
  'ศูนย์ทันตกรรมครบวงจร ทำฟัน จัดฟัน ฟอกสีฟัน และรักษารากฟันด้วยเครื่องมือดิจิทัล',
  'service_staff_time',
  'enterprise',
  true,
  '081-111-0005',
  'contact@smiledental.demo',
  '321 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400',
  'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&auto=format&fit=crop&q=80',
  '{
    "currency": "THB",
    "slotIntervalMinutes": 30,
    "minAdvanceHours": 2,
    "maxAdvanceDays": 60,
    "autoConfirm": true,
    "depositPercentage": 20,
    "allowCancellation": true,
    "cancelAdvanceHours": 24,
    "promptpayNumber": "0811110005",
    "promptpayName": "Smile Dental Hub",
    "lineChannelId": "2000000001",
    "features": {
      "lineReminders": true,
      "reminderHours": [24, 2],
      "loyaltyPoints": true,
      "pointsPerHundredBaht": 10
    }
  }'::jsonb,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- Dentists for Smile Dental
INSERT INTO staff (id, tenant_id, name, phone, bio, rating, reviews_count, is_active) VALUES
  ('51000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'ทพญ. รินรดา (Orthodontist)', '084-000-0001', 'ทันตแพทย์เฉพาะทางจัดฟันแบบใสและจัดฟันทั่วไป', 4.96, 312, true),
  ('51000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'ทพ. ธีรภัทร (General Dentist)', '084-000-0002', 'ทันตแพทย์ทั่วไป เชี่ยวชาญการขูดหินปูน อุดฟัน และฟอกสีฟัน', 4.91, 240, true)
ON CONFLICT (id) DO NOTHING;

-- Services for Smile Dental
INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, max_capacity, category, is_active) VALUES
  ('52000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'ตรวจสุขภาพฟันและขูดหินปูน (Scaling & Checkup)', 'ตรวจฟันด้วยกล้องดิจิทัล ขูดหินปูนและขัดฟันสะอาดสะอ้าน', 30, 900, 1, 'ทันตกรรมทั่วไป', true),
  ('52000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'ฟอกสีฟันระบบ Cool Light (Teeth Whitening)', 'ฟอกสีฟันด้วยแสงเย็น ฟันขาวสว่างขึ้นอย่างปลอดภัยใน 45 นาที', 45, 3900, 1, 'ทันตกรรมเพื่อความงาม', true),
  ('52000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 'ปรึกษาจัดฟันและสแกนฟัน 3D (iTero Scan)', 'สแกนฟันระบบ 3D ดิจิทัลความแม่นยำสูง วางแผนจัดฟันทันที', 30, 1000, 1, 'ทันตกรรมจัดฟัน', true)
ON CONFLICT (id) DO NOTHING;

-- Loyalty Rewards for Smile Dental
INSERT INTO rewards (id, tenant_id, name, description, points_required, image_url, is_active) VALUES
  ('53000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'ส่วนลดค่าบริการ 200 บาท', 'ใช้เป็นส่วนลดสำหรับค่าบริการทันตกรรมทุกรายการ', 200, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=300&auto=format&fit=crop&q=80', true),
  ('53000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'ชุดแปรงสีฟันไฟฟ้าพรีเมียม', 'ชุดแปรงสีฟัน Sonic Premium ดูแลเหงือกและฟัน', 500, 'https://images.unsplash.com/photo-1559591937-e1045989e246?w=300&auto=format&fit=crop&q=80', true)
ON CONFLICT (id) DO NOTHING;
