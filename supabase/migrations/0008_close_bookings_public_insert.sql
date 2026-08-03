-- 0008_close_bookings_public_insert.sql
-- Step 12 (RLS browser-write cutover): บล็อก browser ไม่ให้ insert เข้า `bookings` โดยตรงอีกต่อไป
--
-- บริบท: Phase 1 Step 11 เปลี่ยน SaaSContext.createBooking ให้เรียก backend
-- (`POST /bookings`, `POST /bookings/merchant`) แทนการ insert ผ่าน Supabase client แล้ว
-- Backend เชื่อมฐานข้อมูลด้วย Prisma ผ่าน connection string ตรง (ไม่ใช่ PostgREST
-- ด้วย anon/authenticated JWT) จึงไม่ถูกจำกัดโดย RLS ของตารางนี้อยู่แล้ว
--
-- Policy `bookings_public_insert` ที่เพิ่มไว้ใน 0007_rls_hardening.sql เป็นทางผ่านชั่วคราว
-- สำหรับตอนที่ยังไม่มี backend endpoint (ก่อน Step 9-11 เสร็จ) ตอนนี้ไม่จำเป็นแล้วและเป็น
-- ช่องโหว่ที่เหลืออยู่ (ใครมี anon key ก็ยัง insert ตรงเข้า bookings ได้ ข้าม availability/pricing
-- rules ทั้งหมดของ backend) จึงต้องปิด
--
-- ⚠️ ต้องรัน 0001-0007 ก่อน

-- ---------------------------------------------------------------
-- 1. ลบ policy ที่อนุญาตให้ browser (anon) insert ตรงเข้า bookings
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_public_insert" ON bookings;

-- ---------------------------------------------------------------
-- 2. ไม่สร้าง policy อื่นแทนที่ — ตั้งใจให้ INSERT ไม่มี policy เหลือเลยสำหรับ anon/authenticated
--    (Postgres RLS default-deny: ไม่มี policy ที่ตรง = ปฏิเสธ)
--    การเขียน bookings ทุกกรณีต้องผ่าน backend (Prisma, bypass RLS ด้วย connection role ตรง)
--    เท่านั้น ทั้ง `POST /bookings` (LIFF customer) และ `POST /bookings/merchant` (merchant/admin)
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 3. ตรวจผลลัพธ์หลังรัน — ต้องไม่มีแถวไหนคืนมา (ไม่มี INSERT policy บน bookings อีกต่อไป)
-- ---------------------------------------------------------------
-- SELECT policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'bookings' AND cmd = 'INSERT';
--
-- ทดสอบว่า anon insert ถูกปฏิเสธจริง (รันด้วย anon key ผ่าน Supabase client/REST ไม่ใช่ SQL editor):
--   supabase.from('bookings').insert({...}) ต้องได้ error RLS (42501 / "new row violates row-level security policy")
