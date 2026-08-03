# LINE OA Booking SaaS - Next Implementation Plan

> Updated: 2026-08-02  
> Purpose: ใช้เป็นแผนทำงานต่อสำหรับ AI/ผู้พัฒนาคนถัดไป โดยอิงจาก `FEATURE_AND_UI_ANALYSIS.md`, `PROJECT_STATUS.md`, และสถานะโค้ดจริงล่าสุด  
> Important: แผนนี้ไม่ได้ให้ทำ UI/feature ที่มีอยู่แล้วซ้ำ แต่จัดลำดับงานถัดไปให้ปลอดภัยขึ้นก่อนใช้งานจริง

---

## 0. Current Baseline

### สิ่งที่ถือว่ามีแล้ว ไม่ควรทำซ้ำ

- Customer LIFF UI flow มีแล้ว: home, service detail, staff/court select, date/time, booking summary, payment QR, confirmation, my bookings, rewards, profile
- Merchant dashboard UI มีแล้ว: dashboard, calendar, walk-in, service/addon CRUD, staff, booking settings, payment settings, LINE OA settings, analytics, reviews, billing portal
- Super Admin UI มีแล้ว: tenant overview, plan/billing controls, platform gateway settings, invoice/slip review, system/admin layout
- Auth UI มีแล้ว: `MerchantLoginPage.tsx`, `MerchantRegisterPage.tsx`, `ProtectedRoute.tsx`, `AuthContext.tsx`
- Billing-related frontend/backend modules มีแล้ว: `src/lib/billing.ts`, `src/lib/subscriptions.ts`, `src/lib/slips.ts`, `backend/src/billing/`
- Supabase migration files มีแล้ว: `0001`, `0004`, `0005`, `0006`, `0007`
- Backend NestJS modules มีแล้ว: auth, bookings, merchant, memberships, notifications, webhooks, billing

### สถานะ validation ล่าสุด

- Frontend production build ผ่านเมื่อรันนอก sandbox: `npm run build`
- Backend build ผ่าน: `cd backend && npm run build`
- Root lint/typecheck ยังไม่ผ่าน เพราะ `tsconfig.json` ดึง `backend/dist`/backend files เข้ามา
- Backend tests ยังไม่ผ่าน เพราะ spec scaffold ยังไม่ได้ mock dependencies เช่น Prisma, AuthService, BullMQ queue
- Phase 0 ใน `PROJECT_STATUS.md` ถูก mark ว่าเสร็จ แต่จากโค้ดจริงยังมีจุดต้องปิดก่อนถือว่า production-ready

---

## Guiding Rules For Future AI Agents

1. อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง
2. อ่าน `PROJECT_STATUS.md` และ `FEATURE_AND_UI_ANALYSIS.md` เพื่อไม่สร้าง UI/feature ซ้ำ
3. ก่อนเพิ่ม component ใหม่ ให้ค้นก่อนว่ามีไฟล์เดิมหรือยังด้วย `rg`
4. หลีกเลี่ยงการสร้างระบบคู่ขนาน เช่น webhook controller ใหม่ ถ้ามี `backend/src/webhooks/` อยู่แล้ว
5. งานที่แตะ auth, RLS, payment, booking ต้องมี verification gate ก่อนถือว่าเสร็จ
6. อย่าเก็บ secret key ใน frontend; Omise secret, LINE channel access token, Supabase service role ต้องอยู่ backend/env เท่านั้น

---

## Recommended Phase Order

ลำดับใหม่ที่แนะนำ:

1. Phase 0.5 - Stabilize Auth, Tenant Ownership, RLS, Build Gates
2. Phase 1 - Core Booking Backend API
3. Phase 2 - LINE LIFF Identity Integration
4. Phase 3 - LINE Webhook And Notifications
5. Phase 4 - Payment And Billing Hardening
6. Phase 5 - Production Release Gate And Deployment

เหตุผล: Booking API และ tenant/auth foundation ต้องนิ่งก่อนรับ identity จาก LINE จริง ไม่เช่นนั้นจะคุม double booking, tenant isolation, payment status, และ notification ได้ยาก

---

## Phase 0.5 - Stabilize Foundation

### Goal

ปิดรูพื้นฐานของ Phase 0 ให้พร้อมก่อนต่อ LINE/Backend เต็มรูปแบบ

### Why This Comes First

`PROJECT_STATUS.md` ระบุว่า Phase 0 เสร็จแล้ว แต่ตรวจโค้ดพบว่ายังมีความเสี่ยง:

- `/merchant/*` ถูก guard แค่ login แต่ยังไม่ได้ require role ชัดเจน
- `AuthContext.signUp` update `tenants.owner_user_id` ผิดค่า
- root typecheck ยัง fail
- Supabase migration/RLS ในเอกสารมีข้อความขัดกัน ต้องยืนยันกับ DB จริง

### Tasks

1. แก้ merchant route guard
   - File: `src/App.tsx`
   - Current: `/merchant/*` ใช้ `<ProtectedRoute redirectTo="/merchant/login">`
   - Target: ให้ require `merchant_admin` หรือใช้ logic ที่อนุญาต `platform_admin` เฉพาะ support/impersonation

2. แก้ tenant ownership ใน merchant registration
   - File: `src/context/AuthContext.tsx`
   - Issue: `owner_user_id` ถูก set เป็น `tenantData.id`
   - Target: หลัง insert `users` ต้องนำ `users.id` ที่ insert ได้ไป update `tenants.owner_user_id`
   - Acceptance: tenant ใหม่ต้องมี owner เป็น DB user id จริง

3. ตรวจ Supabase schema และ RLS จริง
   - Confirm columns:
     - `users.auth_user_id`
     - `users.tenant_id`
     - `tenants.owner_user_id`
     - `reviews`
     - billing tables/views from migrations `0004-0007` if used
   - Confirm RLS:
     - merchant อ่าน/เขียนได้เฉพาะ tenant ตัวเอง
     - platform_admin อ่าน/จัดการได้ตาม policy
     - anonymous อ่านเฉพาะ public views ที่ออกแบบไว้

4. แก้ frontend typecheck
   - File: `tsconfig.json`
   - Target: จำกัด include/exclude ให้ frontend ไม่ดึง `backend/`, `backend/dist/`, `dist/`, `node_modules/`
   - Acceptance: `npm run lint` ต้องไม่ fail จาก backend/dist

5. จัดการ backend tests ขั้นต่ำ
   - Option A: mock providers ให้ scaffold tests ผ่าน
   - Option B: ปรับ test script ให้รันเฉพาะ tests ที่พร้อมจริง และสร้าง TODO ชัดเจนสำหรับ unit tests
   - Acceptance: มีคำสั่ง test ที่ใช้เป็น gate ได้ ไม่ปล่อยให้ 14/15 fail โดยไม่มีคำอธิบาย

6. อัปเดต `PROJECT_STATUS.md`
   - เปลี่ยน Phase 0 จาก "เสร็จสมบูรณ์" เป็น "เสร็จเชิงโครงสร้าง / รอ Phase 0.5 verification" จนกว่าจะผ่าน gate
   - แก้ส่วน migration ที่ขัดกัน เช่น บางบรรทัดบอก `0007` รันแล้ว แต่ส่วน SQL ยังบอกยังไม่ได้รัน

### Verification Gate

Phase 0.5 ผ่านเมื่อ:

- `npm run build` ผ่าน
- `npm run lint` ผ่าน หรือมี typecheck command ที่ชัดเจนและผ่าน
- `cd backend && npm run build` ผ่าน
- merchant login/register สร้าง tenant และ owner mapping ถูก
- merchant user เข้า `/merchant` ได้
- merchant user เข้า `/admin` ไม่ได้
- platform_admin เข้า `/admin` ได้
- RLS smoke test แสดงว่า merchant A อ่าน/เขียน tenant B ไม่ได้

---

## Phase 1 - Core Booking Backend API

### Goal

ย้าย booking-critical logic จาก frontend/Supabase direct access ไป backend เพื่อควบคุม slot, tenant, price, payment, notification ได้จากจุดเดียว

### Do Not Duplicate

- อย่าสร้าง booking UI ใหม่
- ใช้ LIFF UI เดิมและ `SaaSContext` เดิมเป็น caller
- ใช้ backend module เดิมใน `backend/src/bookings/`

### Tasks

1. ตั้ง backend env ให้พร้อม
   - File: `backend/.env`
   - Required:
     - `DATABASE_URL`
     - `REDIS_HOST`
     - `REDIS_PORT`
     - `JWT_SECRET`
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `CORS_ORIGINS`

2. ตัดสินใจ DB access source of truth
   - Current project มีทั้ง Prisma schema และ Supabase SQL migrations
   - ต้องเลือกแนวทาง:
     - Backend ใช้ Supabase REST/service role เป็นหลัก
     - หรือ Backend ใช้ Prisma เป็นหลัก
   - ห้ามปล่อยให้ schema สองชุด drift กันโดยไม่ตั้งใจ

3. ทำ `POST /bookings` ให้ production-safe
   - Validate:
     - authenticated user
     - tenant access
     - service belongs to tenant
     - staff/court belongs to tenant
     - booking date/time valid
   - Compute backend-side:
     - duration
     - addons
     - buffer
     - price
     - deposit
     - final price
   - Persist:
     - booking
     - payment pending if deposit required
     - notification pending

4. ทำ double booking protection
   - Check overlap by tenant + date + staff/court/resource
   - Use transaction or database-level constraint/lock where possible
   - Treat pending/confirmed/checked_in as blocking
   - Ignore cancelled/no_show/completed as appropriate

5. ทำ `GET /bookings/available-slots`
   - Replace mock slots in `backend/src/bookings/bookings.service.ts`
   - Use:
     - `business_hours`
     - staff schedule/working days
     - existing bookings
     - service duration
     - buffer minutes
     - max advance booking days

6. ปรับ frontend caller
   - File: `src/context/SaaSContext.tsx`
   - Target: `createBooking` เรียก backend API ผ่าน `VITE_API_URL`
   - Keep local optimistic update only after backend returns success

### Verification Gate

Phase 1 ผ่านเมื่อ:

- Backend build ผ่าน
- Create booking ผ่าน API แล้วข้อมูลเข้า DB
- สร้าง booking ซ้ำเวลาเดิมไม่ได้
- Frontend LIFF booking summary กดจองแล้วใช้ backend API จริง
- Merchant calendar/dashboard เห็น booking ใหม่
- Error states แสดงใน UI เมื่อ slot เต็มหรือ API fail

---

## Phase 2 - LINE LIFF Identity Integration

### Goal

ให้ลูกค้าจองผ่าน LINE ด้วย identity จริง โดยไม่ต้องสมัครบัญชีเอง

### Prerequisites

- มี LINE Channel และ LIFF App แล้ว
- มี `VITE_LIFF_ID`
- Booking API จาก Phase 1 พร้อมใช้งาน

### Do Not Duplicate

- ไม่ต้องสร้าง LIFF UI ใหม่
- ใช้ `src/components/liff/LiffLayout.tsx` และ flow เดิม
- อย่าเพิ่ม auth system ใหม่แยกจาก Supabase/AuthContext โดยไม่จำเป็น

### Tasks

1. Install SDK
   - Add dependency: `@line/liff`
   - Add env: `VITE_LIFF_ID`

2. Create LIFF helper
   - Recommended file: `src/lib/liff.ts`
   - Responsibilities:
     - lazy initialize LIFF
     - detect in-client/browser
     - login if required
     - get profile
     - return stable line user profile

3. Update `LiffLayout.tsx`
   - Init LIFF on customer route
   - Show loading/error state
   - Store line profile in context or dedicated customer auth state
   - Do not block local browser dev when `VITE_LIFF_ID` missing; provide graceful fallback only for development

4. Upsert customer user
   - Use backend endpoint or Supabase RPC depending on Phase 1 decision
   - Store:
     - `line_user_id`
     - display name
     - avatar URL
     - tenant/customer relation if needed

5. Replace temporary booking identity
   - Current temporary pattern uses LINE user id/RPC for my bookings
   - Long-term target: backend/session verified identity
   - If still using `get_my_bookings(line_user_id)`, document as temporary and do not treat as final auth

### Verification Gate

Phase 2 ผ่านเมื่อ:

- Opening LIFF URL initializes successfully
- LINE profile appears in booking/profile UI
- Customer user is upserted in DB
- Booking created from LIFF is linked to correct line user
- My bookings show only that LINE user's bookings
- Browser dev mode still usable without real LIFF where appropriate

---

## Phase 3 - LINE Webhook And Notifications

### Goal

รับ LINE webhook จริงและส่ง LINE messages/Flex messages อย่างปลอดภัย

### Do Not Duplicate

- ใช้ controller/service เดิม:
  - `backend/src/webhooks/webhooks.controller.ts`
  - `backend/src/webhooks/webhooks.service.ts`
  - `backend/src/notifications/notifications.service.ts`
- อย่าสร้าง `line.controller.ts` ใหม่ เว้นแต่ refactor แบบมีเหตุผลชัดเจน

### Tasks

1. Verify LINE webhook signature
   - Use `x-line-signature`
   - Use tenant/channel secret
   - Raw body may be required; adjust Nest body parser carefully

2. Map webhook event to tenant
   - Determine tenant from URL path/query or channel config
   - Validate tenant is active

3. Implement event handlers
   - message event
   - postback event
   - follow/unfollow if needed

4. Implement Flex Message templates
   - booking confirmation
   - payment pending
   - payment confirmed
   - reminder
   - cancellation

5. Queue notification sending
   - Use BullMQ queue already present
   - Persist notification status:
     - pending
     - sent
     - failed
   - Capture LINE API error response

### Verification Gate

Phase 3 ผ่านเมื่อ:

- Invalid LINE signature rejected
- Valid webhook returns 200
- Booking confirmation queues and sends LINE message
- Notification history records sent/failed
- Retry behavior is documented

---

## Phase 4 - Payment And Billing Hardening

### Goal

ทำ payment/subscription/billing ให้ใช้งานจริงได้โดยไม่พึ่ง local-only state และไม่เปิด secret

### Do Not Duplicate

- Billing UI และ modules มีแล้ว ให้ต่อยอด:
  - `MerchantBillingPortal.tsx`
  - `MerchantSubscriptionModal.tsx`
  - `AdminSlipReview.tsx`
  - `src/lib/billing.ts`
  - `backend/src/billing/`

### Tasks

1. Confirm migrations
   - `0004_platform_billing.sql`
   - `0005_subscriptions.sql`
   - `0006_payment_slips.sql`
   - `0007_rls_hardening.sql`
   - Resolve document contradiction about which ones already ran

2. Move all secret operations to backend
   - Omise secret key must be backend-only
   - Supabase service role must be backend-only

3. Verify payment flows
   - PromptPay QR generation
   - slip upload/private storage
   - admin slip approval/reject
   - credit card tokenization
   - Omise charge
   - Omise webhook

4. Add idempotency
   - For subscription invoices
   - For webhook processing
   - For retry jobs

5. Tie payment to booking/subscription state
   - Booking payment:
     - unpaid -> paid
     - pending -> confirmed
   - Subscription:
     - trialing/active/past_due/unpaid/canceled

### Verification Gate

Phase 4 ผ่านเมื่อ:

- PromptPay payment/manual slip flow updates invoice/subscription correctly
- Credit card test charge works through backend
- Webhook duplicate does not double-update or double-charge
- Secret values are absent from frontend bundle
- Platform admin can review slips; merchant cannot approve own slip

---

## Phase 5 - Production Release Gate And Deployment

### Goal

เตรียมระบบให้ deploy และตรวจซ้ำบน environment จริง

### Tasks

1. Clean project metadata
   - README root ยังเป็น AI Studio boilerplate ควรเขียนใหม่
   - `.env.example` ต้องมี env จริงของโปรเจกต์ ไม่ใช่ Gemini-only
   - Document setup for frontend/backend/Supabase/LINE/Omise

2. Build and test gates
   - Frontend build
   - Frontend typecheck/lint
   - Backend build
   - Backend meaningful tests
   - Smoke test scripts if possible

3. Deploy
   - Frontend: Vercel or chosen static hosting
   - Backend: Railway/Render/Fly/Cloud Run with Redis
   - Database: Supabase
   - Configure CORS and redirect URLs

4. Production smoke tests
   - Merchant registration
   - Merchant login
   - Admin login
   - Customer LIFF open
   - Customer booking
   - Payment pending/confirmed
   - LINE notification
   - RLS tenant isolation

5. Monitoring and recovery
   - Error logging
   - Webhook logs
   - Failed notification queue inspection
   - Basic DB backup awareness

### Verification Gate

Phase 5 ผ่านเมื่อ:

- Production URL works on desktop/mobile
- LIFF works inside LINE app
- Real Supabase project has all required migrations
- Admin, merchant, customer roles behave correctly
- No known high-risk production blockers remain open

---

## Known Issues To Fix Before Marking Production-Ready

1. `AuthContext.signUp` sets `owner_user_id` incorrectly
2. `/merchant/*` guard should enforce merchant role
3. Root `tsconfig.json` includes backend/generated output
4. Backend tests are scaffold-only and failing
5. `PROJECT_STATUS.md` has conflicting migration status notes
6. Some Thai text in older generated files appears mojibake in terminal output; verify source encoding in editor before editing those files
7. Backend available slots still need real business-hour/staff/booking conflict logic if not already updated
8. LINE webhook signature verification is not complete unless specifically implemented
9. Frontend bundle is large; consider code splitting before production

---

## Suggested Immediate Next Sprint

Work only on Phase 0.5 first:

1. Fix merchant role guard
2. Fix tenant owner mapping in registration
3. Fix root typecheck config
4. Verify/update migration status in docs
5. Run frontend build and backend build
6. Add a short manual QA checklist result to `PROJECT_STATUS.md`

After that, start Phase 1 Core Booking Backend API before full LIFF integration.

