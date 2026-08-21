# Phase 0 Production Checklist

เอกสารนี้ใช้สำหรับนำ security hardening ของ Phase 0 ขึ้น Production และเก็บหลักฐานการดำเนินงาน ห้ามถือว่า Phase 0 ผ่านจนกว่างาน Manual ทุกข้อจะได้รับการยืนยัน

## 1. ก่อนเปลี่ยนแปลง

- [ ] หยุด deploy และการแก้ schema ชั่วคราว
- [ ] บันทึก commit ที่กำลังใช้งานใน Production
- [ ] สร้าง database backup หรือ restore point และบันทึกเวลา
- [ ] ตรวจว่ามีสิทธิ์เข้าถึง Supabase, Railway, Vercel และ LINE Developers
- [ ] แจ้งช่วง maintenance ให้ผู้เกี่ยวข้องทราบ

## 2. Apply Database Hardening

1. เปิด Supabase SQL Editor ด้วย role `postgres`
2. รัน `supabase/migrations/0033_restore_sensitive_table_boundary.sql`
3. รัน `supabase/security/phase0_privilege_audit.sql`
4. เก็บผลลัพธ์ policy, grants และข้อความ `PASS` เป็นหลักฐาน

ผลที่ต้องได้:

- [ ] `anon` ไม่มีสิทธิ์ตรงบน `tenants`, `users`, `bookings`
- [ ] `authenticated` ไม่มีสิทธิ์ insert/update/delete บน `users` และ `bookings`
- [ ] cleanup RPC เรียกจาก `anon` และ `authenticated` ไม่ได้
- [ ] `public_tenants` และ `public_busy_slots` ยังอ่านผ่าน anon ได้
- [ ] Merchant ร้าน A อ่านข้อมูลของร้าน B ไม่ได้
- [ ] Customer A อ่าน booking ของ Customer B ไม่ได้

## 3. Deploy Application

- [ ] Deploy backend ที่มี endpoint `POST /bookings/maintenance/cleanup-stale`
- [ ] ตรวจ Railway health และ readiness
- [ ] Deploy frontend หลัง backend พร้อมใช้งาน
- [ ] ตรวจว่า stale cleanup ส่ง Bearer token และ `x-tenant-id` ไป backend
- [ ] ทดสอบ booking, merchant dashboard, availability และ cleanup ใน Staging/Production

## 4. Rotate LINE Credentials

ดำเนินการแยกต่อแต่ละร้านที่เคยเปิดใช้งานจริง:

- [ ] ออก Channel Access Token ใหม่ใน LINE Developers
- [ ] หมุน Channel Secret หากช่องทางและกระบวนการรองรับ
- [ ] อัปเดต secret ในแหล่งจัดเก็บฝั่ง server เท่านั้น
- [ ] Redeploy/restart backend worker
- [ ] ส่งข้อความทดสอบและตรวจ delivery audit
- [ ] Revoke token เดิมหลังยืนยัน token ใหม่
- [ ] บันทึก tenant, ผู้ดำเนินการ, เวลา และวันหมุนครั้งถัดไป

ห้ามวาง token หรือ secret ลง screenshot, ticket, Git, browser variable หรือ application log

## 5. Historical Incident Review

ตรวจช่วงเวลาตั้งแต่ migration `0030` ถูก apply จนถึงเวลาที่ `0033` ผ่าน:

- [ ] Supabase API logs สำหรับการอ่าน/เขียน `tenants`, `users`, `bookings`
- [ ] Postgres logs และ audit logs สำหรับ mutation ที่ผิดปกติ
- [ ] Booking ที่ถูกลบ เปลี่ยน tenant/status หรือสร้างแบบผิดปกติ
- [ ] Tenant settings หรือ LINE credentials ที่ถูกอ่าน/แก้ไขผิดปกติ
- [ ] IP, user agent, timestamp และ affected tenant ของเหตุที่น่าสงสัย
- [ ] หากพบเหตุ ให้เปิด incident ตาม `docs/INCIDENT_RESPONSE_RUNBOOK.md`

## 6. Rollback

ใช้ `supabase/rollbacks/0033_restore_sensitive_table_boundary.rollback.sql` เฉพาะเมื่อ migration ทำให้ระบบเสียหายรุนแรง สคริปต์นี้เป็น fail-closed rollback จึงปิด browser access ต่อไปและไม่เปิด policy ที่ไม่ปลอดภัยกลับมา

- [ ] บันทึกเหตุผลและผู้อนุมัติ rollback
- [ ] รัน privilege audit ซ้ำหลัง rollback
- [ ] ให้ backend เป็นเส้นทาง mutation เดียวระหว่างแก้เหตุ

## 7. Sign-off Evidence

| รายการ | ค่า |
|---|---|
| Production commit | |
| Migration applied at | |
| Backup/restore point | |
| Privilege audit result | |
| LINE rotation completed at | |
| Historical review window | |
| Backend owner | |
| Security reviewer | |
| Final decision | `PASS` / `BLOCKED` |

Phase 0 ผ่านเมื่อ privilege audit, negative tenant tests, secret rotation และ historical review มีหลักฐานครบ และไม่มี P0 tenant-isolation finding คงค้าง
