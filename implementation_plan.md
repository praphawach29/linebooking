# Phase 1 Implementation Plan - Core Booking Backend API

เอกสารนี้เป็นแผนหลักสำหรับส่งต่องาน Phase 1 ให้ AI หรือผู้พัฒนาคนถัดไป ต้องอ่านร่วมกับ
`FEATURE_AND_UI_ANALYSIS.md`, `PROJECT_STATUS.md` และ `NEXT_IMPLEMENTATION_PLAN.md` ก่อนเริ่มงาน

## 1. เป้าหมาย

ย้ายกฎสำคัญของการจองจาก `src/context/SaaSContext.tsx` ไปยัง NestJS backend เพื่อให้ backend เป็นผู้ตัดสิน
availability, ราคา, ระยะเวลา, สิทธิ์ tenant และการป้องกัน double booking

Phase 1 ต้องทำให้ flow พื้นฐานต่อไปนี้ใช้งานได้จริง:

- ลูกค้า LIFF เลือก service, staff (ถ้ามี), วันที่และเวลา แล้วสร้าง booking ผ่าน backend
- Merchant/Admin สร้าง booking ให้ customer ที่มีอยู่แล้วผ่าน backend
- ผู้ใช้ดู available slots ที่คำนวณจากกฎชุดเดียวกับ create booking
- concurrent requests สำหรับ resource และเวลาเดียวกันสำเร็จได้ตาม capacity เท่านั้น
- browser ห้าม insert ลงตาราง `bookings` โดยตรงหลัง cutover

## 2. ขอบเขตที่ล็อกแล้ว

### 2.1 อยู่ใน Phase 1

- Supabase authentication สำหรับ Merchant/Admin
- LINE ID token verification ขั้นต่ำสำหรับ LIFF Customer
- resolve/upsert `users` จาก LINE subject ที่ backend ตรวจสอบแล้ว
- tenant, service, staff และ customer authorization
- business hours, staff service, staff schedule, duration, buffer และ tenant booking settings
- available slots API
- create booking API
- Serializable transaction, bounded retry และ concurrency tests
- frontend API client และการเปลี่ยน `SaaSContext.createBooking`
- unit, integration และ manual smoke tests ที่มี test จริง

### 2.2 ไม่อยู่ใน Phase 1

- LINE webhook, rich menu, push notification และ reminder worker
- LIFF profile/rewards แบบสมบูรณ์
- payment capture, PromptPay verification, refund และ billing automation
- production deployment
- court/resource booking และ add-on persistence หาก schema จริงยังไม่รองรับ

ห้าม silently ignore `courtId`, `addonSelections`, payment fields หรือราคาเสริม หาก UI ส่ง field ที่ Phase 1 ไม่รองรับ
frontend ต้องปิด/ซ่อน path นั้นชั่วคราว หรือทำ schema extension เป็นแผนย่อยที่ได้รับอนุมัติก่อน

## 3. ข้อห้ามด้านฐานข้อมูล

- Supabase SQL migrations เป็น database schema source of truth
- ห้ามใช้ `prisma db push`
- ห้ามใช้ `prisma migrate` และห้ามสร้าง Prisma migration
- ใช้ `npx prisma db pull` และ `npx prisma generate` เท่านั้น
- schema change ทุกชนิดต้องเป็นไฟล์ใหม่ใน `supabase/migrations/`
- ห้ามแก้ migration ที่รันไปแล้วเพื่อเปลี่ยน production history
- ห้ามเชื่อ `backend/prisma/schema.prisma` จนกว่าจะผ่าน schema introspection ใน environment เป้าหมาย

## 4. Pre-Implementation Gate

Gemini ต้องทำขั้นตอนนี้ก่อนแก้ source code และบันทึกผลไว้ใน `PROJECT_STATUS.md`

1. ตรวจ environment โดยไม่แสดง secret ใน log
2. ยืนยันว่า backend เชื่อม Supabase/PostgreSQL environment ที่ถูกต้อง
3. ตรวจ migration history และ RLS state แบบ read-only
4. ยืนยันว่ามี `users.auth_user_id`, `users.line_user_id` และ `tenants.owner_user_id` จริงหรือไม่
5. รัน `npx prisma db pull`
6. รัน `npx prisma generate`
7. ตรวจว่า model/column ที่ API ต้องใช้มีจริง
8. ตรวจว่า browser role ไม่สามารถ insert/update/delete `bookings` ข้าม backend ได้
9. บันทึก court, add-on และ payment columns/tables ที่พบจริง
10. รัน baseline: frontend lint/build, backend build และ backend tests

ถ้าข้อ 2-8 ตรวจสอบไม่ได้ ให้หยุดและรายงาน blocker ห้ามเดา schema หรือทำ migration จากสมมติฐาน

## 5. Authentication และ Actor Model

### 5.1 LIFF Customer

Endpoint: `POST /bookings`

- Frontend เริ่ม LIFF และส่ง LINE ID token ใน `Authorization: Bearer <LINE_ID_TOKEN>`
- ห้ามรับหรือเชื่อ `lineUserId`, `userId` หรือ customer identity จาก request body
- Backend verify ID token กับ LINE โดยใช้ LINE channel ID ของ tenant ที่ระบุใน `x-tenant-id`
- ตรวจ issuer, audience/client ID, expiry และ subject ตามผล verification
- ใช้ subject ที่ verify แล้วค้นหา `users.line_user_id`
- ถ้ายังไม่มี user ให้ upsert user ด้วยข้อมูลที่เชื่อถือได้จาก token/profile เท่านั้น
- ชื่อหรือเบอร์โทรที่ผู้ใช้กรอกเป็น contact data ไม่ใช่ authentication identity
- booking `user_id` ต้องเป็น database user ID ที่ backend resolve ได้
- ลูกค้าไม่ต้องเป็น owner/member ของ tenant จึงห้ามใช้ merchant `TenantAccessGuard`
- ต้องตรวจ tenant active, LIFF/channel configuration และ service ownership แทน

สร้าง guard/service แยก เช่น `LineIdTokenGuard` และ `LineIdentityService` ห้ามใส่ network verification ทั้งหมดไว้ใน controller

### 5.2 Merchant/Admin

Endpoint: `POST /bookings/merchant`

- ใช้ `SupabaseAuthGuard` ตามด้วย `TenantAccessGuard`
- actor ID คือ `req.appUser.dbUserId`
- request ต้องมี `customerId` ของ user ที่มีอยู่แล้ว
- Phase 1 ไม่สร้าง customer จาก phone อัตโนมัติ เพราะ schema ปัจจุบันไม่ได้ยืนยัน unique phone
- ตรวจว่า customer มีอยู่จริงก่อนสร้าง booking
- `source` ถูกกำหนดโดย backend เป็น `admin` หรือ `walk_in` ตาม endpoint/role ห้ามเชื่อค่าจาก frontend

### 5.3 Endpoint เดิมอื่นใน BookingsController

- นำ `JwtAuthGuard` และ `req.user.id` ออกจากทุก method ใน controller
- cancellation ที่ยังไม่ทำ customer LINE authorization ให้ใช้ Merchant Supabase auth ชั่วคราวและระบุข้อจำกัดใน status
- ห้ามเหลือ endpoint ที่ใช้ guard placeholder หรือ auth model เก่า

## 6. Tenant Contract

Merchant `TenantAccessGuard` ต้อง:

- อ่าน `x-tenant-id` จาก header เท่านั้น
- normalize ค่า header และปฏิเสธหลายค่าที่กำกวม
- validate UUID
- ตรวจ membership/ownership หลัง `SupabaseAuthGuard`
- platform admin bypass membership ได้ แต่ยังต้องส่ง tenant header
- แนบค่าที่ผ่านการตรวจเป็น `req.tenantId`

Customer tenant resolver ต้อง validate UUID และแนบ `req.tenantId` แต่ไม่ตรวจ merchant membership

Controller และ service ใช้ `req.tenantId` เท่านั้น ห้ามอ่าน tenant จาก body/query ซ้ำ

Error codes:

- `400 TENANT_ID_REQUIRED`
- `400 TENANT_ID_INVALID`
- `401 AUTH_REQUIRED`
- `401 AUTH_INVALID`
- `403 TENANT_ACCESS_DENIED`
- `404 TENANT_NOT_FOUND`
- `409 TENANT_INACTIVE`

## 7. API Contract

API ใช้ camelCase ส่วน Prisma mapping รับผิดชอบ snake_case ใน database

### 7.1 GET `/bookings/available-slots`

Endpoint นี้เปิดให้ LIFF เรียกก่อนสร้าง booking โดยไม่รับ user identity แต่ต้องมี rate limiting, strict validation
และต้องคืนเฉพาะข้อมูล slot ห้ามคืน customer/booking details

Headers:

```text
x-tenant-id: UUID
```

Query:

```text
serviceId: UUID
bookingDate: YYYY-MM-DD
staffId?: UUID
```

Response `200`:

```json
{
  "bookingDate": "2026-08-03",
  "timezone": "Asia/Bangkok",
  "slotIntervalMinutes": 30,
  "slots": [
    {
      "startTime": "10:00",
      "endTime": "11:00",
      "staffId": "UUID",
      "available": true
    }
  ]
}
```

ถ้าไม่เลือก staff และระบบสามารถ assign ได้ response อาจคืน staff ที่ backend เลือกให้ในแต่ละ slot
รูปแบบ response ต้องคงที่และมี DTO/TypeScript type ร่วมกันใน frontend

### 7.2 POST `/bookings` - LIFF Customer

Headers:

```text
Authorization: Bearer <LINE_ID_TOKEN>
x-tenant-id: UUID
Content-Type: application/json
```

Request:

```json
{
  "serviceId": "UUID",
  "staffId": "UUID or null",
  "bookingDate": "2026-08-03",
  "startTime": "10:00",
  "customerName": "Customer name",
  "customerPhone": "0812345678",
  "notes": "optional note"
}
```

### 7.3 POST `/bookings/merchant` - Merchant/Admin

ใช้ request เดียวกัน แต่เพิ่ม `customerId` และใช้ Supabase access token

```json
{
  "customerId": "UUID",
  "serviceId": "UUID",
  "staffId": "UUID or null",
  "bookingDate": "2026-08-03",
  "startTime": "10:00",
  "customerName": "optional display snapshot",
  "customerPhone": "optional contact snapshot",
  "notes": "optional note"
}
```

Backend ห้ามรับ `tenantId`, `userId`, `lineUserId`, `endTime`, `duration`, `price`, `finalPrice`, `status`,
`paymentStatus` หรือ `source` จาก client

### 7.4 Create Response

Response `201` ต้องมีข้อมูลเพียงพอสำหรับ frontend state โดยไม่สร้างค่าปลอม:

```json
{
  "id": "UUID",
  "tenantId": "UUID",
  "userId": "UUID",
  "serviceId": "UUID",
  "staffId": "UUID or null",
  "bookingDate": "2026-08-03",
  "startTime": "10:00",
  "endTime": "11:00",
  "status": "pending",
  "price": 500,
  "discountAmount": 0,
  "finalPrice": 500,
  "paymentStatus": "unpaid",
  "source": "line_liff",
  "notes": "optional note",
  "createdAt": "2026-08-02T18:00:00.000Z"
}
```

หาก frontend `Booking` type มี snapshot fields ที่ DB ไม่มี ให้ปรับ type/adapter ตาม response จริง ห้าม fabricate ข้อมูล

### 7.5 Error Shape

ทุก error ใช้รูปแบบเดียวกัน:

```json
{
  "statusCode": 409,
  "code": "BOOKING_SLOT_UNAVAILABLE",
  "message": "Selected booking slot is no longer available",
  "details": null
}
```

Domain codes ขั้นต่ำ:

- `VALIDATION_FAILED`
- `SERVICE_NOT_FOUND`, `SERVICE_INACTIVE`
- `STAFF_NOT_FOUND`, `STAFF_NOT_ELIGIBLE`, `STAFF_NOT_AVAILABLE`
- `BOOKING_IN_PAST`, `BOOKING_TOO_SOON`, `BOOKING_TOO_FAR_AHEAD`
- `BOOKING_OUTSIDE_BUSINESS_HOURS`
- `BOOKING_SLOT_UNAVAILABLE`
- auth และ tenant codes จากหัวข้อก่อนหน้า

## 8. Availability Domain Rules

สร้าง domain/service กลางให้ `available-slots` และ `create-booking` เรียกกฎชุดเดียวกัน ห้าม duplicate algorithm
ระหว่างสอง endpoint

ลำดับการคำนวณ:

1. โหลด tenant และอ่าน booking settings
2. ใช้ `tenant.settings.timezone`; default `Asia/Bangkok`
3. ใช้ `tenant.settings.slotIntervalMinutes`; default 30 นาที
4. validate `bookingDate` ใน tenant timezone
5. ตรวจ `maxAdvanceBookingDays` และ `minLeadTimeHours`
6. โหลด active service ของ tenant และใช้ `duration_minutes`, `buffer_minutes`, `price`, `max_capacity` จาก DB
7. โหลด `business_hours` ตาม local day-of-week
8. ถ้าเลือก staff ให้ตรวจ active staff, tenant ownership, `staff_services` และ `staff_schedules`
9. ถ้าไม่เลือก staff ให้หา eligible staff ที่ว่างแบบ deterministic และ assign ภายใน transaction
10. ถ้า service ไม่มี staff model ให้ใช้ resource scope `tenant + service` และใช้ `max_capacity`
11. โหลด bookings ที่อาจ overlap และมี status ที่ block เวลา
12. สร้าง candidate ทุก `slotIntervalMinutes` ไม่ใช่ทุก service duration
13. slot end ที่แสดง = start + service duration
14. conflict end = slot end + service buffer
15. ตรวจ interval แบบ half-open: `[start, conflictEnd)`

Status ที่ block เวลาใน Phase 1:

- `pending`
- `confirmed`
- `checked_in`

Status ที่ไม่ block:

- `cancelled`
- `completed`
- `no_show`

ถ้า database value จริงต่างจากรายการนี้ ให้แก้ทั้ง implementation และเอกสารก่อนทำต่อ

## 9. Create Booking Transaction และ Concurrency

ทุก create request ต้องตรวจซ้ำใน transaction ห้ามเชื่อผล available-slots ที่ client เคยได้รับ

Transaction sequence:

1. เริ่ม Prisma interactive transaction ด้วย `Serializable`
2. โหลด tenant/service/staff/customer ใหม่ภายใน transaction
3. คำนวณ local date/time, duration, buffer และ price ใหม่
4. assign staff/resource ภายใน transactionถ้ายังไม่ได้เลือก
5. query overlap ตาม resource scope, booking date และ blocking statuses
6. ตรวจจำนวน overlap เทียบ `max_capacity`
7. insert booking โดยใช้ค่าที่ backend คำนวณ
8. commit และคืน response

`Serializable` อาจ abort transaction ที่ขัดแย้งกัน ไม่ได้หมายความว่าทุก request ต่อคิวสำเร็จโดยอัตโนมัติ

- จัดการ Prisma `P2034` หรือ serialization/deadlock error ที่เทียบเท่า
- retry สูงสุด 3 ครั้ง
- ใช้ exponential backoff พร้อม jitter ระยะสั้น
- ทุก retry ต้องเริ่ม transaction และอ่านข้อมูลใหม่ทั้งหมด
- ถ้ายังขัดแย้งหรือ capacity เต็ม คืน `409 BOOKING_SLOT_UNAVAILABLE`
- error อื่นห้ามถูกแปลงเป็น slot unavailable โดยเหมารวม

Concurrency correctness ต้องทดสอบกับ PostgreSQL จริง ไม่ใช้ mock database

ถ้าผลทดสอบแสดงว่า Serializable strategy ยังไม่พอ ให้เสนอ Supabase SQL migration สำหรับ exclusion constraint
หรือ advisory-lock helper โดยระบุ resource key เช่น `tenantId + bookingDate + staffId/serviceId` ก่อนลงมือ

## 10. Frontend Integration

สร้าง API helper กลาง เช่น `src/lib/booking-api.ts` และให้ context เรียก helper นี้

- ใช้ `VITE_API_URL`
- LIFF flow initialize/login และรับ LINE ID token ก่อน submit
- Merchant flow ใช้ `session.access_token` จาก Supabase
- ส่ง `x-tenant-id` ทุก request
- ใช้ `bookingDate` และ camelCase ตาม API contract
- ป้องกัน double submit ระหว่าง request กำลังทำงาน
- ห้ามคำนวณ end time/price ฝั่ง clientเพื่อใช้เป็นค่าจริง
- หลัง `201` map response จริงเข้า state หรือ refetch
- เมื่อ `409` แสดงข้อความและ refetch available slots
- เมื่อ `401` ให้ refresh/re-auth ตาม actor; LIFF ห้าม redirect ไป Merchant login
- handle `400`, `401`, `403`, `404`, `409`, `422`, `500` อย่างแยกแยะ
- หลัง cutover ลบ direct Supabase insert ของ `bookings` ออกจาก `SaaSContext.createBooking`

Phase 1 core request ห้ามส่ง court/add-on/payment fields หากยังไม่ผ่าน schema gate และ UI ต้องบอกผู้ใช้ตามจริง

## 11. Tests

ห้ามนับ `jest --passWithNoTests` เป็น test pass และห้ามลบ tests เพื่อทำให้ command ผ่าน

### 11.1 Unit Tests

- DTO date/time/UUID validation
- timezone และ day-of-week
- slot interval ไม่เท่ากับ duration
- duration และ buffer boundary
- half-open overlap
- blocking statuses
- business hours
- lead time และ advance limit
- staff eligibility/schedule
- no-staff assignment และ capacity
- error mapping

### 11.2 Integration Tests

- LINE ID token valid/invalid/expired/wrong audience
- LINE user upsert และไม่สร้างซ้ำ
- Supabase merchant auth
- tenant header required/invalid/cross-tenant
- inactive tenant/service/staff
- service และ staff คนละ tenant
- merchant customer not found
- create booking สำเร็จทั้ง customer และ merchant
- จองย้อนหลัง, เร็วเกินไป, ไกลเกินไป, นอกเวลาทำการ
- overlap และ buffer conflict
- available-slots ไม่คืนเวลาที่ block
- no-staff assignment
- concurrent requests สำหรับ slot/capacity เดียวกันสำเร็จได้ไม่เกิน capacity
- บังคับ serialization conflict และยืนยัน bounded retry
- browser direct insert ถูก RLS ปฏิเสธหลัง cutover

### 11.3 Frontend Tests

- เลือก endpoint และ token ถูกตาม actor
- ส่ง header/body ตาม contract
- ไม่ส่ง server-owned fields
- double-submit protection
- mapping response
- handling `401/403/409`
- refetch slots หลัง conflict

### 11.4 Manual Smoke Tests

- LIFF customer เปิด flow, ดู slot และจองสำเร็จ
- Merchant สร้าง booking ให้ customer ที่มีอยู่
- เปิดสอง browser/request พร้อมกันและจอง slot เดียวกัน
- ตรวจ booking ใน Merchant UI หลังสร้าง
- ตรวจว่า network ไม่มี direct insert ไป Supabase bookings

## 12. Execution Order

1. ทำ Pre-Implementation Gate และอัปเดตสถานะ schema จริง
2. ล็อก Prisma model หลัง `db pull/generate`
3. เพิ่ม shared API/error contracts และ DTOs
4. ทำ tenant resolvers และแก้ guard เดิม
5. ทำ LINE identity bridge ขั้นต่ำ
6. ทำ availability domain service พร้อม unit tests
7. ทำ `GET /bookings/available-slots`
8. ทำ create transaction, retry และ integration tests
9. ทำ customer และ merchant endpoints
10. ทำ frontend booking API helper และ LIFF token integration
11. เปลี่ยน `SaaSContext.createBooking` และลบ direct insert
12. ตรวจ/ปรับ RLS ให้ browser เขียน booking โดยตรงไม่ได้ผ่าน Supabase SQL migration หากจำเป็น
13. รัน frontend lint/build, backend build/tests และ concurrency tests
14. ทำ manual smoke tests
15. อัปเดต `PROJECT_STATUS.md` พร้อมหลักฐานและงานที่ defer

## 13. Definition of Done

Phase 1 เสร็จเมื่อครบทุกข้อ:

- Pre-Implementation Gate มีผลตรวจจริง ไม่ใช่สมมติฐาน
- LIFF customer identity ถูก verify ที่ backend และ resolve เป็น database user
- Merchant และ customer ใช้ auth/tenant rules คนละชุดอย่างถูกต้อง
- available-slots และ create booking ใช้ domain rules ชุดเดียวกัน
- backend เป็นผู้คำนวณ duration, end time, resource และราคา
- concurrent booking ไม่เกิน capacity และ retry behavior ผ่าน integration test
- frontend core booking flow ใช้ backend API เท่านั้น
- browser direct write ไป `bookings` ถูกถอดออกและ RLS ป้องกันไว้
- ไม่มี `JwtAuthGuard`/`req.user.id` เก่าค้างใน BookingsController
- frontend lint/typecheck และ production build ผ่าน
- backend build ผ่าน
- unit/integration/frontend tests มี test จริงและผ่าน
- manual smoke tests ผ่านทั้ง LIFF Customer และ Merchant
- `PROJECT_STATUS.md` ตรงกับ database/code/test state จริง

## 14. Gemini Handoff Rules

- ทำงานตาม execution order และอัปเดต checklist ทีละขั้น
- ห้ามขยาย scope ไป webhook, notification, payment หรือ deployment
- ห้ามแก้ไฟล์ที่ไม่เกี่ยวข้องเพียงเพื่อ cleanup
- ห้าม revert user changes ใน dirty worktree
- ก่อนสร้าง migration ต้องรายงาน schema gap และเหตุผล
- เมื่อพบแผนขัดกับ database จริง ให้หยุดส่วนที่ขัด อัปเดตแผน/status และรายงานก่อน
- หลัง implementation ให้สรุปไฟล์ที่แก้, migration ที่เพิ่ม, commands ที่รัน, test results และ residual risks

