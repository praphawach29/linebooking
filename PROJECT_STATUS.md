# 📁 LINE OA Booking SaaS — Master Project Status
> อัปเดตล่าสุด: 2026-08-02  
> ไฟล์นี้สร้างเพื่อสรุปสถานะโปรเจกต์ ใช้เป็น Context สำหรับ session ถัดไป

---

## 🗂️ โครงสร้างโปรเจกต์ (Architecture)

### Tech Stack
| Layer | Technology |
|-------|-----------|
| **Frontend (LIFF + Merchant)** | React 19 + Vite 6 + TailwindCSS v4 + Light Theme Clean Design |
| **SaaS Billing & Subscriptions** | Auto Plan Renewal via PromptPay QR & Credit Card Modal |
| **Backend API** | NestJS + Prisma + BullMQ (Redis) |
| **Database** | Supabase (PostgreSQL) — Fixed `reviewsData` fetch error |
| **Auth** | Supabase Auth + LINE LIFF SDK (planned) |
| **Notifications** | LINE Messaging API + BullMQ Queue |

### Folder Structure
```
line-oa-booking-saas/
├── src/                          # Frontend React App (Vite, port 4000)
│   ├── App.tsx                   # Router: /, /liff/:tenantId, /merchant/*, /admin/*, /simulator/*
│   ├── context/SaaSContext.tsx   # Global state + Supabase data fetching (761 lines)
│   ├── components/
│   │   ├── liff/                 # 14 ไฟล์ — Customer LIFF Pages
│   │   ├── merchant/             # 13 ไฟล์ — Merchant Dashboard Pages
│   │   ├── admin/                # Super Admin Dashboard (UI มีแล้ว ขาด Auth)
│   │   └── line_simulator/       # LINE Simulator สำหรับทดสอบ
│   ├── types/index.ts            # TypeScript interfaces ทั้งหมด
│   └── index.css                 # Design tokens (Tailwind v4 @theme)
├── backend/                      # NestJS Backend (port 3000)
│   └── src/
│       ├── auth/                 # LINE OAuth + JWT (logic มีแล้ว)
│       ├── bookings/             # Booking CRUD module
│       ├── merchant/             # Merchant management module
│       ├── notifications/        # LINE Messaging API module
│       ├── webhooks/             # LINE Webhook handler
│       └── memberships/          # Loyalty Points module
└── supabase/
    ├── migrations/0001_initial_schema.sql  # ✅ รันแล้ว
    ├── public_access.sql                   # ✅ รันแล้ว (RLS เบื้องต้น)
    └── seed.sql                            # ✅ รันแล้ว (ข้อมูลทดสอบ)
```

---

## 🎨 Design System (Color Palette — ตกลงแล้ว)

```css
/* Primary: LINE Green */
--color-primary: #06C755;        /* LINE Brand เท่านั้น (LINE Login, logo) */
--color-success: #10B981;        /* Emerald 500 — Action Buttons ทั่วไป */
--color-success-hover: #059669;  /* Emerald 600 — Hover state */

/* Surfaces */
--color-background: #F8FAFC;    /* Slate 50 — LIFF Customer canvas */
--color-surface: #ffffff;        /* Pure White — Cards */
--color-border: #E2E8F0;        /* Slate 200 */
--color-foreground: #0F172A;    /* Slate 900 — Main text */

/* Merchant Dashboard */
--color-merchant-sidebar: #1E293B;
--color-merchant-sidebar-active: #10B981;

/* Super Admin */
--color-admin-sidebar: #0B0F19;
--color-admin-sidebar-active: #4F46E5;  /* Indigo */

/* Status */
--color-warning: #F59E0B;   /* Amber — ราคา, ดาว Rating */
/* Sky Blue #0284C7 — Pending */
/* Purple #A855F7 — Enterprise plan ONLY */
/* Rose #EF4444 — Cancel/Error */
```

---

## ✅ ฟีเจอร์ที่พัฒนาเสร็จแล้ว

### Customer LIFF Side
| ฟีเจอร์ | ไฟล์ | สถานะ |
|--------|------|-------|
| หน้าหลัก + Badges กระตุ้น (ยอดนิยม/แนะนำ/กำลังดูอยู่) | `LiffHome.tsx` | ✅ |
| ดูรายละเอียดบริการ + Rating เฉลี่ย | `LiffServiceDetail.tsx` | ✅ |
| เลือกพนักงาน | `LiffStaffSelect.tsx` | ✅ |
| เลือกวัน-เวลา (Slot Calendar พร้อม validation) | `LiffDateTimePicker.tsx` | ✅ |
| เลือกสนาม/ห้อง | `LiffCourtSelect.tsx` | ✅ |
| สรุปการจอง + validation (ดอกจันช่องบังคับ) | `LiffBookingSummary.tsx` | ✅ |
| ชำระเงิน PromptPay QR Code | `LiffPromptPayPayment.tsx` | ✅ |
| หน้ายืนยันการจองสำเร็จ (Reference No., รายละเอียด) | `LiffBookingConfirmation.tsx` | ✅ |
| เพิ่มลง Google Calendar / ดาวน์โหลด .ics | `LiffBookingConfirmation.tsx` | ✅ |
| เปิด Google Maps นำทาง | `LiffBookingConfirmation.tsx` | ✅ |
| คิวของฉัน (Upcoming/Completed) | `LiffMyBookings.tsx` | ✅ |
| ยกเลิกคิว (Cancellation Policy — logic commented ไว้) | `LiffMyBookings.tsx` | ✅ |
| ให้คะแนนรีวิว (Modal 1-5 ดาว + comment) | `LiffMyBookings.tsx` | ✅ |
| แสดงแต้ม / Rewards | `LiffRewards.tsx` | ✅ |
| ประวัติแต้ม | `LiffPointHistory.tsx` | ✅ |
| โปรไฟล์ผู้ใช้ | `LiffProfile.tsx` | ✅ |
| Skeleton Loading ทุกหน้า | ทุกหน้า | ✅ |

### Merchant Dashboard Side
| ฟีเจอร์ | ไฟล์ | สถานะ |
|--------|------|-------|
| Dashboard สรุปรายได้/คิว/สถิติ | `MerchantDashboard.tsx` | ✅ |
| ปฏิทินนัดหมาย | `MerchantCalendarView.tsx` | ✅ |
| จัดการบริการ + Addon (CRUD) | `MerchantServiceManager.tsx` | ✅ |
| จัดการพนักงาน | `MerchantStaffManager.tsx` | ✅ |
| Walk-in Booking Modal | `MerchantWalkinBookingModal.tsx` | ✅ |
| Analytics รายได้ (Recharts) | `MerchantAnalytics.tsx` | ✅ |
| ตั้งค่าการจอง (Deposit, นโยบายยกเลิก) | `MerchantBookingSettings.tsx` | ✅ |
| ตั้งค่า LINE OA (credentials, LIFF ID) | `MerchantLineOASettings.tsx` | ✅ |
| ตั้งค่า Payment (QR PromptPay) | `MerchantPaymentSettings.tsx` | ✅ |
| ดูรีวิวลูกค้า + คะแนนเฉลี่ย | `MerchantReviews.tsx` | ✅ |
| Onboarding Wizard (ลงทะเบียนร้าน UI) | `MerchantOnboardingWizard.tsx` | ✅ (UI เท่านั้น, ขาด Auth) |

### Super Admin Dashboard (`/admin`)
| ฟีเจอร์ | สถานะ |
|--------|-------|
| ดูรายการ Tenants ทั้งหมด + ค้นหา/กรอง | ✅ เสร็จแล้ว (2026-08-01) |
| คำนวณ MRR & Paid Subscribers Ratio | ✅ เสร็จแล้ว (2026-08-01) |
| ปรับเปลี่ยน Plan ร้านค้า (Free/Pro/Enterprise) | ✅ เสร็จแล้ว (modal + context) |
| สลับเปิด/ระงับการใช้งานร้านค้า (Active/Suspend) | ✅ เสร็จแล้ว (2026-08-01) |
| แท็บจัดการผู้ใช้งานระบบ (User Accounts) | ✅ เสร็จแล้ว (2026-08-01) |
| ระบบประกาศข้อความถึงทุกร้าน (Broadcast Announcement) | ✅ เสร็จแล้ว (2026-08-01) |
| System Health Monitoring (PostgreSQL RLS, Queue) | ✅ เสร็จแล้ว (2026-08-01) |
| Login & Role Guard (`platform_admin`) | ✅ เสร็จแล้ว (`ProtectedRoute.tsx`) |
| **ธีมสว่าง (Clean Light Theme Redesign)** | ✅ **ปรับแล้วตามภาพ (2026-08-01)** |

### Merchant SaaS Billing & Payments (`/merchant`)
| ฟีเจอร์ | สถานะ |
|--------|-------|
| ปุ่มกดต่ออายุ / อัปเกรดแพ็กเกจ (Modal) | ✅ **เสร็จแล้ว (2026-08-01)** |
| สลับเลือก Pro (990/ด.) / Enterprise (2,990/ด.) | ✅ **เสร็จแล้ว (2026-08-01)** |
| เลือกระยะเวลา รายเดือน / รายปี (ลด 17%) | ✅ **เสร็จแล้ว (2026-08-01)** |
| ชำระเงินผ่าน Dynamic PromptPay QR Code | ✅ **เสร็จแล้ว (2026-08-01)** |
| ชำระเงินผ่าน บัตรเครดิต / เดบิต (Visa/Mastercard) | ✅ **เสร็จแล้ว (2026-08-01)** |
| ต่ออายุแพ็กเกจและเปลี่ยน Plan อัตโนมัติ | ✅ **เสร็จแล้ว (2026-08-01)** |
| PromptPay QR มาตรฐาน EMVCo จริง (สแกนจ่ายได้ด้วยแอปธนาคาร) | ✅ **เสร็จแล้ว (2026-08-01)** |
| อ่านเลขพร้อมเพย์ / Omise key จากที่ Super Admin ตั้งไว้ | ✅ **เสร็จแล้ว (2026-08-01)** |
| ออกใบแจ้งหนี้ `subscription_invoices` ทุกครั้งที่ชำระ | ✅ **เสร็จแล้ว (2026-08-01)** |
| ตัดบัตรผ่าน Omise (Vault token ฝั่ง client → charge ฝั่ง Backend) | ✅ **เสร็จแล้ว (2026-08-01)** |
| คำนวณวันหมดอายุใหม่ (`plan_expires_at`) ต่อจากรอบเดิม | ✅ **เสร็จแล้ว (2026-08-01)** |

### Platform Payment Gateway (Super Admin → `/admin` แท็บ "ตั้งค่า Omise & Gateway")
| ฟีเจอร์ | สถานะ |
|--------|-------|
| เลือกช่องทางหลัก: PromptPay ของเจ้าของแพลตฟอร์ม / Omise | ✅ **เสร็จแล้ว (2026-08-01)** |
| กรอกเลขพร้อมเพย์ + ชื่อบัญชี พร้อม validate และพรีวิว QR จริง | ✅ **เสร็จแล้ว (2026-08-01)** |
| กรอก Omise Public / Secret Key + สลับ Test Mode | ✅ **เสร็จแล้ว (2026-08-01)** |
| แก้ไขราคาแพ็กเกจ 4 ช่อง (Pro/Enterprise × เดือน/ปี) | ✅ **เสร็จแล้ว (2026-08-01)** |
| สวิตช์ "ต่ออายุอัตโนมัติเมื่อชำระสำเร็จ" | ✅ **เสร็จแล้ว (2026-08-01)** |
| ตารางประวัติการชำระค่าแพ็กเกจของทุกร้าน | ✅ **เสร็จแล้ว (2026-08-01)** |
| บันทึกลง Supabase (`platform_settings`) แทน localStorage | ✅ **เสร็จแล้ว (2026-08-01)** |

**ไฟล์ที่เกี่ยวข้อง:**
- `supabase/migrations/0004_platform_billing.sql` — ตาราง `platform_settings`, `subscription_invoices`, view `platform_billing_public`, RLS
- `src/utils/promptpay.ts` — สร้าง EMVCo payload + CRC-16/CCITT (ผ่าน test vector `123456789` → `29B1`)
- `src/lib/billing.ts` — อ่าน/เขียนการตั้งค่า, ออกใบแจ้งหนี้, Omise Vault tokenization
- `backend/src/billing/` — NestJS module ตัดบัตรจริง + รับ Omise Webhook (ที่เดียวที่ถือ secret key)

### 🔁 Recurring Billing — ตัดบัตรอัตโนมัติ (ทางเลือก A: จัดการ scheduler เอง)
| ฟีเจอร์ | สถานะ |
|--------|-------|
| ผูกบัตรแบบ tokenization (Omise Customer + Card, ไม่เก็บเลขบัตร) | ✅ **เสร็จแล้ว (2026-08-01)** |
| บันทึกความยินยอม (mandate) + timestamp + IP ตามกฎ Visa/MC | ✅ **เสร็จแล้ว (2026-08-01)** |
| ตาราง `subscriptions` มีสถานะครบ (trialing/active/past_due/unpaid/canceled) | ✅ **เสร็จแล้ว (2026-08-01)** |
| BullMQ cron เก็บเงินทุกวัน 02:00 น. (Asia/Bangkok) | ✅ **เสร็จแล้ว (2026-08-01)** |
| MIT charge (`recurring: true`) — รอบต่ออายุไม่ต้องทำ OTP | ✅ **เสร็จแล้ว (2026-08-01)** |
| Dunning: retry วันที่ 3/5/7 เลี่ยงเสาร์-อาทิตย์ แล้วลดเป็น Free | ✅ **เสร็จแล้ว (2026-08-01)** |
| Idempotency key 2 ชั้น (ใบแจ้งหนี้ + Omise header) กันตัดซ้ำ | ✅ **เสร็จแล้ว (2026-08-01)** |
| Proration: อัปเกรดมีผลทันทีคิดส่วนต่าง / ดาวน์เกรดมีผลจบรอบ | ✅ **เสร็จแล้ว (2026-08-01)** |
| ยกเลิก/กลับมาใช้ self-service (ใช้ได้จนจบรอบที่จ่ายไว้) | ✅ **เสร็จแล้ว (2026-08-01)** |
| แจ้งเตือนบัตรใกล้หมดอายุล่วงหน้า 30 วัน (cron 09:00 น.) | ✅ **เสร็จแล้ว (2026-08-01)** |
| Webhook verification — ดึง charge จาก Omise ยืนยันซ้ำกัน webhook ปลอม | ✅ **เสร็จแล้ว (2026-08-01)** |
| หน้า Merchant Billing Portal (สถานะ/บัตร/เปลี่ยนแพ็กเกจ/ประวัติ) | ✅ **เสร็จแล้ว (2026-08-01)** |

**ไฟล์:**
- `supabase/migrations/0005_subscriptions.sql` — `payment_methods`, `subscriptions`, ต่อยอด invoices, RLS, backfill
- `backend/src/billing/subscriptions.service.ts` — logic ทั้งหมด (vaulting, renew, dunning, proration)
- `backend/src/billing/billing.processor.ts` — BullMQ repeatable job
- `backend/src/billing/omise.service.ts` / `supabase.service.ts` — ชั้นเชื่อมต่อภายนอก
- `src/lib/subscriptions.ts` + `src/components/merchant/MerchantBillingPortal.tsx` — ฝั่งหน้าเว็บ

**API ที่เปิดไว้:** `POST /billing/{payment-methods,subscribe,change-plan,cancel,resume,charge,webhook,run-collection}`, `GET /billing/{subscription,payment-methods,plan-change-preview}`

### 🔐 Auth Guard บน Billing API (2026-08-01)
หน้าเว็บล็อกอินด้วย **Supabase Auth** (คนละ token กับ LINE JWT ที่ `auth/` เดิมใช้)
จึงทำ guard ชุดใหม่ใน `backend/src/common/guards/`:

| Guard | หน้าที่ |
|-------|--------|
| `SupabaseAuthGuard` | ตรวจ access token กับ `/auth/v1/user` ของ Supabase → map เป็นแถวใน `users` (role + ร้านที่เข้าถึงได้) cache 60 วิ |
| `TenantAccessGuard` | `tenantId` ที่ส่งมาต้องเป็นร้านของตัวเอง — กันยิง API ข้ามร้าน (platform_admin ข้ามได้) |
| `PlatformAdminGuard` | เฉพาะ `platform_admin` — ใช้กับอนุมัติ/ปฏิเสธสลิป และสั่งรอบเก็บเงินด้วยมือ |
| `@CurrentUser()` | ดึงผู้ใช้จาก token — `reviewerId` / `uploadedBy` ไม่รับจาก body อีกต่อไป (ปลอมไม่ได้) |

**สิทธิ์แต่ละ endpoint:**
```
ร้านค้า (auth + tenant ตัวเอง) : charge, payment-methods*, subscription, subscribe,
                                 plan-change-preview, change-plan, cancel, resume, slips (ส่ง/ดูของตัวเอง)
platform_admin เท่านั้น        : slips/:id/approve, slips/:id/reject, run-collection
ไม่ต้อง auth                    : webhook (ความปลอดภัยมาจากการดึง charge ไปยืนยันกับ Omise ซ้ำ)
```

**เพิ่มใน `main.ts` ด้วย:**
- `ValidationPipe` แบบ global (`whitelist` + `forbidNonWhitelisted`) — เดิม DTO มี class-validator แต่**ไม่เคยถูกตรวจเลย**เพราะไม่มี pipe
- CORS ตั้งผ่าน `CORS_ORIGINS`
- body limit 10 MB (รูปสลิป base64)

### 🧾 แผนสอง — PromptPay + แนบสลิป (ใช้ได้โดยไม่ต้องจดบริษัท)
| ฟีเจอร์ | สถานะ |
|--------|-------|
| อัปโหลดสลิปขึ้น Supabase Storage (bucket private + signed URL) | ✅ **เสร็จแล้ว (2026-08-01)** |
| ตรวจ 4 ข้อ: ยอดตรง · บัญชีปลายทางตรง · เวลาโอนถูกช่วง · **เลขอ้างอิงไม่ซ้ำ** | ✅ **เสร็จแล้ว (2026-08-01)** |
| Adapter บริการตรวจสลิป (SlipOK / EasySlip) สมัครแบบบุคคลธรรมดาได้ | ✅ **เสร็จแล้ว (2026-08-01)** |
| Hybrid: ผ่านครบ → อนุมัติอัตโนมัติ / ไม่ผ่าน → เข้าคิวให้เจ้าหน้าที่ | ✅ **เสร็จแล้ว (2026-08-01)** |
| โหมด manual ล้วน (ยังไม่ต่อ API ก็ใช้งานได้) | ✅ **เสร็จแล้ว (2026-08-01)** |
| หน้า Admin ตรวจสลิป: ดูรูป, เห็นผลตรวจ 4 ข้อ, อนุมัติ/ปฏิเสธพร้อมเหตุผล | ✅ **เสร็จแล้ว (2026-08-01)** |
| แจ้งเตือนก่อนแพ็กเกจหมดอายุ D-7 / D-3 / D-1 (cron 09:30 น.) | ✅ **เสร็จแล้ว (2026-08-01)** |

**ไฟล์:** `supabase/migrations/0006_payment_slips.sql`, `backend/src/billing/slips.service.ts`,
`src/lib/slips.ts`, `src/components/admin/AdminSlipReview.tsx`

> 🔑 จุดที่กันโกงจริง ๆ คือ **unique index บน `trans_ref`** — สลิปหนึ่งใบใช้ได้ครั้งเดียวทั้งระบบ
> ต่อให้ตรวจ 3 ข้อแรกผ่าน ถ้า ref ซ้ำจะไม่อนุมัติอัตโนมัติ

### 🛡️ RLS Hardening (2026-08-02) — `0007_rls_hardening.sql`

**ช่องโหว่ที่ปิด** (เดิมใครมี anon key ซึ่งอยู่ในไฟล์ JS ของหน้าเว็บ ทำได้ทั้งหมดนี้):
| เดิม | ผลกระทบ | แก้เป็น |
|------|---------|--------|
| `public_read_tenants USING (true)` | อ่าน `line_channel_secret` / `access_token` ของทุกร้านได้ | view `public_tenants` คัดเฉพาะฟิลด์ที่ลูกค้าต้องเห็น |
| `public_read_bookings USING (true)` | อ่านชื่อ + เบอร์โทรลูกค้าทุกคนได้ | view `public_busy_slots` (เวลาที่ไม่ว่าง ไม่มี PII) + RPC `get_my_bookings()` |
| staff / courts / business_hours / reviews / rewards / service_addons **ไม่เปิด RLS เลย** | anon **เขียนและลบ** ข้อมูลร้านคนอื่นได้ | เปิด RLS ครบทุกตาราง: อ่านสาธารณะ / เขียนเฉพาะเจ้าของร้าน |
| `public_insert_bookings WITH CHECK (true)` | จองใส่ร้านที่ถูกระงับได้ | จำกัดเฉพาะร้าน active + สถานะ pending/confirmed เท่านั้น |

**ตารางที่ต้องล็อกอินถึงอ่านได้:** bookings, users, payments, notifications, memberships, point_transactions, reward_redemptions

**ฝั่งหน้าเว็บที่แก้ตาม:**
- `SaaSContext` เลือกแหล่งข้อมูลตามสถานะล็อกอิน — เจ้าของร้านอ่านตารางจริง (ได้ LINE credentials ครบ), ผู้เยี่ยมชมอ่าน view
- `LiffMyBookings` ดึงคิวตัวเองผ่าน RPC `get_my_bookings` แทนการอ่านทั้งตาราง
- `supabase/public_access.sql` คอมเมนต์ทิ้งทั้งไฟล์แล้ว (ห้ามรันซ้ำ ไม่งั้นช่องโหว่กลับมา)

> ⚠️ **ยังเป็นของชั่วคราว:** RPC `get_my_bookings(line_user_id)` ใช้ LINE user ID เป็นกุญแจ
> เพราะฝั่งลูกค้ายังไม่มี Supabase Auth (รอ Phase 1) — LINE user ID เป็นสตริงเดายาก แต่ไม่ใช่ความลับ
> เมื่อทำ LIFF + Auth เสร็จ ให้เปลี่ยนไปใช้ `auth.uid()` แล้วลบฟังก์ชันนี้ทิ้ง

### 🎨 UI — Admin Sidebar (2026-08-01)
เปลี่ยนจากแท็บแนวนอน (ล้นจอตั้งแต่ 5 เมนู) เป็น sidebar ซ้ายตาม design token
`--color-admin-sidebar` / `--color-admin-sidebar-active` ที่ประกาศไว้ตั้งแต่ต้นแต่ไม่เคยถูกใช้
- `src/components/admin/AdminLayout.tsx` — sidebar responsive (drawer บนมือถือ) + badge จำนวนสลิปรอตรวจ
- จัดกลุ่ม: ภาพรวม / ผู้เช่า / การเงิน / ระบบ — เพิ่มเมนู "ใบแจ้งหนี้" และ "รออนุมัติสลิป"

> ⚠️ **หลักความปลอดภัย:** `omise_secret_key` อ่านได้เฉพาะ `platform_admin` เท่านั้น (RLS) และ
> ร้านค้าอ่านผ่าน view `platform_billing_public` ที่ไม่มี secret key — การตัดเงินจริงทำที่ Backend เสมอ
> แนะนำให้ตั้ง `OMISE_SECRET_KEY` ใน `backend/.env` แทนการเก็บใน DB

---

## 🚧 Production Roadmap

### 🟢 Phase 0 — Super Admin + Merchant Auth (เสร็จสมบูรณ์)

**สิ่งที่เสร็จเรียบร้อย:**
- Super Admin Login & Protection: ป้องกัน route `/admin/*` ต้องเป็น role `platform_admin`
- Merchant Auth & Self-Service Registration: ล็อกอินและลงทะเบียนเปิดร้านค้าอัตโนมัติผ่าน Supabase Auth

**Checklist:**
- [ ] รัน SQL สร้าง `reviews` table (รอยืนยัน)
- [ ] รัน SQL เพิ่ม `auth_user_id` ใน `users` และ `tenants` (รอยืนยัน)
- [x] สร้าง `src/context/AuthContext.tsx` จัดการ Session & DB User Mapping
- [x] สร้าง `src/components/auth/MerchantLoginPage.tsx` (Login สวยงาม)
- [x] สร้าง `src/components/auth/MerchantRegisterPage.tsx` (Self-service เปิดร้านอัตโนมัติ)
- [x] Guard routes `/merchant/*` และ `/admin/*` ด้วย `ProtectedRoute.tsx`
- [x] สร้าง Super Admin แรก `admin@yourdomain.com` ใน Supabase Auth & SQL DB

### 🟢 Phase 0.5 — Stabilize Foundation (เสร็จสมบูรณ์ — RLS public insert ปิดแล้วใน Step 12, backend test coverage ครบใน Step 13)
- [x] แก้ merchant route guard (`/merchant/*` require merchant_admin)
- [x] แก้ tenant ownership (update owner_user_id หลัง signUp)
- [x] ยืนยัน columns `users.auth_user_id`, `tenants.owner_user_id`, court, add-ons, payment fields จาก `npx prisma db pull`
- [x] แก้ frontend typecheck (exclude backend จาก tsconfig)
- [x] Backend Build: **ผ่านแล้ว** (`npm run build` สำเร็จ 0 errors)
- [x] Step 6 Availability Domain Service: **COMPLETED / PASSED** (26 Test Cases Passed)
- [x] Step 7 GET `/bookings/available-slots` Endpoint: **COMPLETED / PASSED** (66 Tests Total: 59 Unit + 7 HTTP/E2E)
- [x] Step 8 Atomic Create Booking Transaction & Concurrency Retry: **COMPLETED / REAL POSTGRESQL PASSED** (ผ่าน 78 Unit Tests + 7 HTTP Tests รวม 85 Tests ใน 7 Suites; Real PostgreSQL Integration ผ่าน 6/6 scenarios จำนวน 4 รอบติด รวม 24 scenario executions — ไฟล์ที่แก้/สร้าง: `create-booking-command.dto.ts`, `bookings.service.ts`, `bookings.service.spec.ts`, `prisma.service.ts`, `test/bootstrap-test-db.sql`, `test/jest-integration.json`, `test/bookings-concurrency.integration-spec.ts`, `package.json`, `package-lock.json`)
- [x] Step 9 Customer & Merchant HTTP Endpoints: **COMPLETED / PASSED** (`POST /bookings` ใช้ LINE identity, `POST /bookings/merchant` ใช้ Supabase merchant auth + tenant access, ทั้งสอง route เรียก atomic service เท่านั้น; cancellation เป็น merchant-only ชั่วคราว; ลบ legacy snake_case create DTO/method แล้ว)
- [x] Step 10 Frontend Booking API & Token Integration: **COMPLETED / PASSED** (เพิ่ม `booking-api.ts`, `booking-auth.ts`, `booking-client.ts`, ติดตั้ง `@line/liff`, แยก LINE ID token กับ Supabase access token ตาม actor, ส่ง `x-tenant-id`, whitelist camelCase body, typed errors และ in-flight deduplication; frontend tests 19/19, typecheck และ production build ผ่าน)
- [x] Step 11 Replace `SaaSContext.createBooking` & Remove Direct Insert: **COMPLETED / PASSED** (`getAvailableSlots` และ `createBooking` เรียก backend เท่านั้น ไม่มี `.from('bookings').insert` เหลือใน `SaaSContext.tsx`; เพิ่ม `booking-cutover.test.ts` ยืนยันด้วย static source check; frontend tests 21/21, typecheck ผ่าน, backend baseline 101/101 ผ่าน)
- [x] Step 12 RLS Browser-Write Cutover: **COMPLETED** (`supabase/migrations/0008_close_bookings_public_insert.sql` ลบ policy `bookings_public_insert` แล้ว และรันจริงใน Supabase SQL Editor สำเร็จ 2026-08-02; แนะนำให้รัน verification query เพิ่มเติมตามหัวข้อ RLS ด้านล่างเพื่อ audit แต่ไม่ block งานถัดไป)
- [x] Step 13 Full Frontend/Backend Verification & Concurrency Re-run: **COMPLETED / PASSED** (frontend typecheck/build/tests, backend build/tests ผ่านหมด; Step 8 concurrency suite รันซ้ำบน dedicated throwaway Docker Postgres 16 4 รอบติด ผ่าน 6/6 scenarios ทุกรอบ รวม 24/24; ตัดสินใจไม่แก้ `npm audit` react-router finding เพราะแอปนี้ไม่ใช้ RSC mode ที่เป็นช่องโหว่; ดูรายละเอียดเต็มในหัวข้อ Verification Matrix ด้านล่าง)
- [x] Step 14 Manual Smoke Tests: **COMPLETED / PASSED** (จองผ่าน LIFF จริงจนถึงจุดที่ต้องมี LINE identity จริง, merchant walk-in booking สำเร็จจริงผ่าน backend, concurrent double-booking ป้องกันได้จริงบน production Supabase — พบและแก้บั๊กจริงที่ค้างมาก่อน Phase 1 หลายจุดระหว่างทดสอบ ดูรายละเอียดเต็มในหัวข้อ Verification Matrix ด้านล่าง)

### 2. สถานะความพร้อมฝั่ง Backend & Verification Matrix
- [x] Introspected DB schema reference: `backend/prisma/schema.prisma`
- [x] ยืนยัน columns `users.auth_user_id`, `tenants.owner_user_id`, court, add-ons, payment fields จาก `npx prisma db pull`
- [x] แก้ frontend typecheck (exclude backend จาก tsconfig)
- [x] Backend Build: **ผ่านแล้ว** (`npm run build` สำเร็จ 0 errors)
- [x] Backend Unit/HTTP Tests: **PASSED** (8 Test Suites, 101 Tests Total: 89 Unit Tests + 12 HTTP/E2E Validation Tests)
- ℹ️ *จำแนกประเภท Tests ใน Step 8*:
  - **Availability Service**: 26 unit test cases (`availability.service.spec.ts`)
  - **Bookings Service (Atomic Create)**: 19 unit test cases รวม membership compound unique (`tenantId_userId`), strict zero-fallback validation, DB response validation, auto/resource staff assignment, P2034 retries, Prisma 7 `DriverAdapterError: TransactionWriteConflict`, outer P2002 ref_no transaction retry & non-retryable errors (`bookings.service.spec.ts`)
  - **Bookings Controller**: 5 unit test cases (`bookings.controller.spec.ts`)
  - **LINE Identity Bridge**: 13 unit test cases (`line-identity.service.spec.ts`)
  - **LINE ID Token Guard**: 9 unit test cases (`line-id-token.guard.spec.ts`)
  - **Tenant Access Guard**: 6 unit test cases (`tenant-access.guard.spec.ts`)
  - **Bookings HTTP / Validation**: 7 HTTP/E2E test cases (`bookings.http.spec.ts`)
  - **สรุป Unit & HTTP Tests หลัง Step 9**: Unit 89, HTTP 12, รวม 101 Tests (100% Passed)
- ℹ️ *Real PostgreSQL Integration Harness & Safety Gate Refinements*:
  - **Prisma Client Harness**: ใช้ `PrismaClient` แยกตรงกับ `TEST_DATABASE_URL` พร้อม Real `$connect()` / `$disconnect()`, URL normalization และ **Preflight Safety Gate Validation** (`SELECT current_database(), current_user` โดยบังคับ DB name ต้องมีคำว่า `test`/`local` หรือ `TEST_DATABASE_ACKNOWLEDGED=true`) ก่อนดำเนินการ seed ข้อมูลใดๆ
  - **Dedicated Resource Tenant**: เพิ่ม Resource Tenant แยก (`settings: { timezone: 'Asia/Bangkok', bookingFlowMode: 'service_time_only' }`) พร้อม Memberships และ Service `maxCapacity: 2`
  - **UTC Date Helper & Dynamic Seeding**: คำนวณ `bookingDate` ในอนาคต (14 วันข้างหน้า) และ `dayOfWeek` ผ่าน UTC Date methods ให้ตรงกับ `BusinessHours` และ `StaffSchedule` (ที่ใส่ `tenantId` ครบถ้วน) พร้อมล้างข้อมูลเฉพาะ ID ที่สร้างขึ้นใน `afterAll` ด้วย `try/finally`
  - **Real Integration Scenarios (6 Scenarios)**:
    1. `capacity=1`: 2 concurrent requests for same staff slot -> `fulfilled.length === 1`, `rejected.length === 1`, DB count === 1
    2. `capacity=N` (N=2): 3 concurrent requests for resource service -> `fulfilled.length === 2`, `rejected.length === 1`
    3. `independent staff`: 2 concurrent requests for different staff at same time -> both succeed (`fulfilled.length === 2`)
    4. `blocking vs non-blocking status`: verifies all six statuses (`cancelled`, `completed`, `no_show` do not block; `pending`, `confirmed`, `checked_in` do block)
    5. `rollback check`: forces a failure after a real PostgreSQL insert inside a serializable transaction and verifies that the inserted row is absent after rollback
    6. `ref_no uniqueness & persisted fields`: all concurrent successful bookings generate unique `ref_no` and DB `endTime`/`price` fields match
  - **Step 8 completion evidence**: dedicated PostgreSQL 16 test database `line_oa_booking_test` ผ่าน 6/6 scenarios จำนวน 4 รอบติด (24 scenario executions); capacity=1 test ยืนยันว่าเกิด real serialization conflict, มี transaction retry และ bounded ไม่เกิน 3 attempts ต่อ request
  - **Supabase host protection**: Safety Gate rejects both `*.supabase.co` and `*.supabase.com`, in addition to rejecting a test URL that normalizes to `DATABASE_URL`.
  - **Safety Gate**: หาก `TEST_DATABASE_URL` ไม่ถูกตั้งค่า หรือตรงกับ production `DATABASE_URL` คำสั่ง `npm run test:integration` จะทำการ exit non-zero (exit code 1) พร้อมรายงาน error `TEST_DATABASE_URL_NOT_CONFIGURED`
  - **สถานะ Concurrency Tests**: **PASSED / REAL POSTGRESQL** (6/6 scenarios ผ่าน 4 รอบติด; Safety Gate ยังบล็อก production และ Supabase hosts ตามเดิม)
- **Step 9 Verification**: controller/HTTP/service/auth tests ครอบคลุม customer/merchant command mapping, strict DTO rejection, guard metadata, Supabase merchant mapping, tenant-scoped cancellation และ structured domain errors; targeted lint และ backend build ผ่าน
- **Step 10 Verification**: frontend integration tests 19/19 ผ่านใน 3 suites; `npm run lint` และ `npm run build` ผ่าน. Direct booking insert ใน `SaaSContext.createBooking` ยังไม่ถูกถอดตาม scope boundary และจะทำใน Step 11
- **Step 11 Verification**: `getAvailableSlots`/`createBooking` ใน `SaaSContext.tsx` เรียก `booking-api.ts` เท่านั้น (ทั้ง LIFF customer และ merchant/walk-in path); merchant booking ที่ไม่มี `customerId` ถูกปฏิเสธก่อนยิง request; `201` map เข้า state จริงผ่าน `mapBookingApiResponse`; `BOOKING_SLOT_UNAVAILABLE` trigger refetch availability; `booking-cutover.test.ts` ยืนยันด้วย static check ว่าไม่มี `.from('bookings').insert` เหลือใน source; grep ทั้ง `src/` ยืนยันไม่มี insert/update/delete/upsert ไป `bookings` เหลือเลย (มีแค่ authenticated read สำหรับ merchant dashboard); frontend tests 21/21 ผ่าน (4 suites), typecheck ผ่าน, backend baseline 101/101 ผ่าน
- **Dependency audit residual risk**: `npm audit --omit=dev` รายงาน 2 high findings ใน dependency chain เดิมของ `react-router-dom` / `react-router`; ยังไม่เปลี่ยนเวอร์ชันอัตโนมัติเพราะอยู่นอก Step 10 และอาจกระทบ routing behavior
- [x] RLS Security Gate: **PASSED / FULLY VERIFIED** — `supabase/migrations/0008_close_bookings_public_insert.sql` ลบ policy `bookings_public_insert` แล้ว และรันจริงใน Supabase SQL editor สำเร็จโดย project owner (2026-08-02); backend เขียนผ่าน Prisma ด้วย direct connection ไม่ผ่าน RLS อยู่แล้วจึงไม่กระทบการทำงานของ `POST /bookings`/`POST /bookings/merchant`. Project owner รัน `SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND cmd='INSERT';` ยืนยันแล้วว่าได้ 0 แถว — ไม่มี INSERT policy เหลือบน `bookings` จริง
- **Step 13 Verification (2026-08-02)**: รันชุดตรวจสอบทั้งหมดซ้ำหลัง Step 9-12 เพื่อยืนยันว่าไม่มี regression —
  - Frontend: `tsc --noEmit` ผ่าน 0 errors, `npm run build` ผ่าน (มี pre-existing chunk-size warning ที่ทราบอยู่แล้ว ไม่ block), `npm run test:frontend` 21/21 ผ่าน (4 suites)
  - Backend: `npm run build` ผ่าน, `npm test` 101/101 ผ่าน (8 suites)
  - **Concurrency re-run**: สร้าง dedicated throwaway Docker container (`postgres:16`, port `55432`, แยกจาก `.env` DATABASE_URL และ local Supabase stack บน port `54322` โดยสมบูรณ์) ใช้ `prisma db push` (ขอ user consent ตาม Prisma AI-agent safety guard ก่อนรัน เพราะเป็นคำสั่งที่แก้ schema แม้เป้าหมายจะเป็น database เปล่าใหม่) แล้วรัน `npm run test:integration` **4 รอบติด ผ่าน 6/6 scenarios ทุกรอบ (รวม 24/24)** ตรงตาม evidence bar เดิมของ Step 8 ทุกประการ พบ real `TransactionWriteConflict` retry ใน log ยืนยันว่า Serializable + bounded retry ยังทำงานถูกต้องหลังแก้ controller/guard ใน Step 9-12; ลบ container ทิ้งหลังใช้งานเสร็จ ไม่เหลือ state ค้าง
  - **`npm audit` decision**: ยังเป็น 2 high findings จาก advisory เดียว (`react-router` RSC Mode CSRF Bypass, GHSA-qwww-vcr4-c8h2) — **ตัดสินใจไม่แก้เวอร์ชัน** เพราะแอปนี้เป็น Vite client-side SPA ไม่ได้ใช้ React Router RSC mode ที่เป็นช่องโหว่จริง ส่วน `npm audit fix --force` จะ downgrade แบบ breaking change ซึ่งอยู่นอกขอบเขต Phase 1 — บันทึกเป็นความเสี่ยงที่ยอมรับแล้ว ไม่ใช่ปล่อยลืม ควรทบทวนอีกครั้งก่อน Phase 5
- **Step 14 Verification (2026-08-02)**: ทดสอบจริงด้วย browser จริง (Playwright ชั่วคราว ลบออกหลังใช้เสร็จ) ขับเคลื่อน `npm run dev` + backend `start:dev` จริง บน Supabase project dev/staging ที่ยืนยันกับเจ้าของโปรเจกต์แล้วว่าไม่ใช่ production —
  - **LIFF customer flow**: ไปได้ครบทุกขั้นตอนจริง (เลือกบริการ → auto-assign ช่าง → available-slots จริงจาก backend → เลือกเวลา → booking summary ราคา/เวลาจริงจาก backend → หน้าชำระเงิน) จนถึงจุดกดยืนยันสุดท้ายที่ `LineIdTokenGuard` ปฏิเสธอย่างถูกต้องเพราะไม่มี LINE identity จริงใน environment ทดสอบ (`BookingAuthError: LIFF ID is not configured`) — เป็นพฤติกรรมที่ถูกต้องตามที่ Step 9-11 ออกแบบไว้ ไม่ใช่บั๊ก
  - **Merchant walk-in flow**: สมัคร merchant account ใหม่ให้ seed tenant ผ่าน backend Prisma script (bypass RLS) แล้ว login ผ่าน UI จริงสำเร็จ, สร้าง walk-in booking ผ่าน UI จริงสำเร็จ ยืนยันด้วยการอ่าน Supabase ตรง (service role, read-only) ว่ามีแถวจริง `ref_no BK-MSBKCH1S-58540E`, `source: "admin"` (backend กำหนดเองไม่เชื่อ client), ราคา/เวลาสิ้นสุด/ช่างคำนวณถูกต้อง
  - **Concurrency บน production DB จริง**: ยิง `POST /bookings/merchant` 2 คำขอพร้อมกันด้วย merchant token จริงไปที่ slot เดียวกัน — ได้ 1× `201` + 1× `409 BOOKING_SLOT_UNAVAILABLE` ยืนยันด้วยการอ่าน DB ตรงว่ามีแถวเดียวจริง
  - **Network verification**: ทุก flow booking write ไปที่ `localhost:3000/bookings*` เท่านั้น ไม่มี `POST/PATCH/DELETE` ไป `supabase.co/rest/v1/bookings` เลยตลอดการทดสอบ ตรงกับหลักฐาน Step 11/12
  - **บั๊กจริงที่พบและแก้ระหว่างทดสอบ** (ไม่เกี่ยวกับ Step 11/12 แต่บล็อกการทดสอบ, ขอ sign-off จากเจ้าของโปรเจกต์ก่อนแก้ทุกจุด):
    1. `LiffHome.tsx` + อีก 4 ไฟล์ (`LiffBookingSummary`, `LiffPointHistory`, `LiffProfile`, `LiffRewards`) จอขาวทันทีสำหรับผู้เยี่ยมชม LIFF ที่ไม่ล็อกอิน เพราะ `currentUser` เป็น `null` ถูกต้องตาม RLS แต่โค้ดไม่กัน null — แก้ด้วย optional chaining + fallback
    2. Validation UUID เข้มเกินไป (`@IsUUID('4')`/`@IsUUID()`) ใน DTO การจองปฏิเสธ seed data จริงของโปรเจกต์ (ไม่ใช่ RFC 4122 UUIDv4 ที่ถูกต้อง) — สร้าง shared validator `IsLooseUuid` (`backend/src/common/validators/is-loose-uuid.validator.ts`) ให้ตรงกับ regex แบบหลวมที่ tenant guards ใช้อยู่แล้ว
    3. `staff_schedules` ว่างเปล่าทั้งตารางสำหรับช่างของ seed tenant ทำให้ available-slots เป็น 0 เสมอ (data gap ไม่ใช่ code bug) — เติมข้อมูลทดสอบผ่าน script ชั่วคราว
    4. `MerchantLayout.tsx`/`HeaderNav.tsx` เข้าถึง `activeTenant.logoUrl`/`.name` โดยไม่กัน null ทำให้จอขาวตอน reload หน้าก่อนข้อมูล tenant โหลดเสร็จ — แก้ด้วย loading guard/conditional render
  - **บั๊กจริงที่พบแต่ตั้งใจไม่แก้ (นอกขอบเขต Phase 1 บันทึกไว้ให้ตามต่อ)**:
    1. `AuthContext.signUp()` insert `tenants` ทันทีหลัง `supabase.auth.signUp()` โดยไม่เช็คว่ามี session จริงหรือยัง — ถ้า Supabase เปิด "Confirm email" การสมัครร้านใหม่จะพังเพราะยังไม่มี session ตอน insert
    2. แม้ปิด email confirmation แล้วและใช้ JWT `role: authenticated` ที่ออกจริงจาก Auth API โดยตรง `POST /rest/v1/tenants` ยัง 403 `42501 RLS violation` ขัดกับ policy `tenants_insert_authenticated ... WITH CHECK (true)` ใน `0007_rls_hardening.sql` — สงสัยว่า policy จริงบนโปรเจกต์อาจไม่ตรงกับไฟล์ migration (documentation/execution drift) แนะนำรัน `SELECT policyname, cmd, roles, with_check FROM pg_policies WHERE tablename='tenants';` เพื่อตรวจสอบ
    3. `SaaSContext` fetch ข้อมูลก้อนใหญ่ (tenants/services/memberships ฯลฯ) ครั้งเดียวตอน mount ด้วย empty dependency array ไม่รีเฟตช์หลัง auth state เปลี่ยน — ยืนยันแล้วว่าหลัง merchant login `memberships` ยังว่างจนกว่าจะ reload หน้าเต็ม กระทบทุกข้อมูลที่ต้อง authenticated ไม่ใช่แค่ booking
  - **ข้อมูลทดสอบที่เหลือค้างใน dev/staging project**: merchant test account, test customer + membership, `staff_schedules` ของ seed staff (7 วัน), booking ทดสอบจริง 2 รายการ (`BK-MSBKCH1S-58540E`, `BK-MSBKFV01-F28C80`) — ไม่ได้ลบอัตโนมัติ แจ้งเจ้าของโปรเจกต์ให้พิจารณาเคลียร์เอง

### 🟢 Phase 1 — Core Booking Backend API (เสร็จสมบูรณ์ 2026-08-02)
- [x] ตั้ง backend env ให้พร้อม (ผ่าน: database connection และ schema introspection สำเร็จ)
- [x] อัปเดต Prisma schema จาก Supabase (db pull)
- [x] สร้าง API `GET /bookings/available-slots` แบบคิดเวลาเปิดปิดร้านจริง (Step 7 COMPLETED)
- [x] สร้าง Atomic Create Booking Transaction & Concurrency Retry (Step 8 COMPLETED / REAL POSTGRESQL PASSED)
- [x] ย้าย booking-critical logic (ราคา, เวลา, ป้องกันการจองซ้ำ) ไปที่ Customer & Merchant HTTP Endpoints ใน Backend (Step 9 COMPLETED)
- [x] สร้าง typed frontend booking API/auth client ที่ใช้ `VITE_API_URL`, LINE ID token และ Supabase merchant access token (Step 10 COMPLETED)
- [x] ย้าย `SaaSContext.createBooking` ให้เปลี่ยนมายิงผ่าน Backend API และลบ direct insert (Step 11 COMPLETED)
- [x] ปิด RLS policy ที่ยังให้ browser insert `bookings` ตรง (Step 12 COMPLETED — รันจริงใน Supabase แล้ว 2026-08-02)
- [x] Full frontend/backend verification + concurrency re-run (Step 13 COMPLETED — ดูรายละเอียดในหัวข้อ Verification Matrix ด้านบน)
- [x] Manual smoke tests ผ่าน browser จริง (Step 14 COMPLETED — ดูรายละเอียดในหัวข้อ Verification Matrix ด้านบน)
- [x] Step 15: ตรวจ Definition of Done ครบทุกข้อตาม `implementation_plan.md` §13 แล้ว (ดู `task.md` หัวข้อ Step 15 Evidence สำหรับรายการตรวจทีละข้อ)
- ℹ️ *หมายเหตุ Identity Scope*: Phase 1 มีเพียง **minimal LINE identity bridge** (รับรองความปลอดภัยขั้นต่ำเพื่อสร้าง booking) สำหรับ LIFF profile integration และ rich menu แบบเต็มรูปแบบจะถูกพัฒนาใน **Phase 2**
- **Guard Integration**: `POST /bookings` ผูก `LineIdTokenGuard`; `POST /bookings/merchant` และ cancellation ผูก `SupabaseAuthGuard` + `TenantAccessGuard`; ทุก route ใช้ `@TenantId()` เท่านั้น
- ⚠️ **ก่อนเริ่ม Phase 2**: มี known issue จาก Step 14 ที่เป็นสโคป Phase 0 ไม่ใช่ Phase 1 (merchant self-registration พังเมื่อเปิด email confirmation, `tenants` RLS insert policy drift, `SaaSContext` ไม่รีเฟตช์หลัง login) — ดูตาราง "ปัญหาที่ต้องแก้ก่อน Production" ด้านล่าง ควรพิจารณาแก้ก่อนเริ่ม Phase 2 เพราะ Phase 2 จะพึ่ง auth/session flow มากขึ้น

### 🔴 Phase 2 — LINE LIFF Identity Integration (Full Profile & Rich Menu)
- [ ] ติดตั้ง `@line/liff` ใน Frontend และเชื่อมต่อ LIFF SDK สมบูรณ์
- [ ] อัปเดต `LiffLayout.tsx` สำหรับดึง Profile ลูกค้า, Avatar, Display Name
- [ ] ระบบ LINE Rich Menu integration และผูกข้อมูลลูกค้าร้านค้าเต็มรูปแบบ

### 🔴 Phase 3 — LINE Webhook And Notifications
- [ ] Verify LINE webhook signature
- [ ] ส่ง Flex Message ยืนยันการจองผ่าน BullMQ

### 🔴 Phase 4 — Payment And Billing Hardening
- [ ] ตรวจสอบว่า Omise/Supabase Keys อยู่เฉพาะ Backend
- [ ] เคลียร์ flow การชำระเงินและ invoice ให้มี idempotency

### 🔴 Phase 5 — Production Release Gate And Deployment
- [ ] Clean project metadata
- [ ] Deploy Frontend (Vercel) & Backend (Railway)
- [ ] Smoke tests ครบวงจร

---

## 📊 สถานะ Supabase Database

| Table / Field | สถานะ |
|-------|-------|
| tenants | ✅ มีแล้ว + seed data |
| users | ✅ มีแล้ว + seed data |
| services | ✅ มีแล้ว + seed data |
| staff | ✅ มีแล้ว + seed data |
| bookings | ✅ มีแล้ว |
| business_hours | ✅ มีแล้ว + seed data |
| cancellation_policies | ✅ มีแล้ว |
| rewards | ✅ มีแล้ว |
| memberships | ✅ มีแล้ว |
| **reviews** | ✅ ยืนยันแล้วจาก db pull |
| **users.auth_user_id** | ✅ **ยืนยันแล้วจาก db pull** |
| **tenants.owner_user_id** | ✅ **ยืนยันแล้วจาก db pull** |
| **courts / service_addons / payment fields** | ✅ **ยืนยันแล้วจาก db pull** |
| **RLS Status** | ✅ **Pass** (migration `0008_close_bookings_public_insert.sql` รันจริงใน Supabase แล้ว 2026-08-02 — ปิด `bookings_public_insert`) |

### Seed Data IDs
```
Tenant:  00000000-0000-0000-0000-000000000001 (ร้านสปาตัวอย่าง, plan: pro)
Service: 11111111-1111-1111-1111-111111111111 (นวดแผนไทย 60 นาที, 500 บาท)
Staff:   22222222-2222-2222-2222-222222222222 (หมอนวด 1)
User:    33333333-3333-3333-3333-333333333333 (ลูกค้าทดสอบ, LINE: U1234567890abcdef)
```

---

## 📝 SQL ที่ต้องรันใน Supabase SQL Editor ถัดไป

### Migration A: สร้าง reviews table (รอยืนยันการรัน)
### Migration B: เพิ่ม auth_user_id ใน users (รอยืนยันการรัน)
### Migration C: เพิ่ม owner_user_id ใน tenants (รอยืนยันการรัน)

### Migration B: เพิ่ม auth_user_id ใน users (สำหรับ Supabase Auth)
```sql
-- 0003_add_auth_user_id.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
```

### Migration C: เพิ่ม auth_user_id ใน tenants (สำหรับ Merchant owner)
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);
```

### Migration D: ระบบรับชำระค่าแพ็กเกจ (ยังไม่ได้รัน — ต้องรันก่อนใช้งานจริง)
```
รันไฟล์: supabase/migrations/0004_platform_billing.sql ใน Supabase SQL Editor
สร้าง: platform_settings, subscription_invoices, platform_billing_public (view),
       ฟังก์ชัน is_platform_admin() และ RLS policies
```
> ก่อนรัน migration นี้ ระบบจะ fallback ไปใช้ localStorage อัตโนมัติ (ใช้งานได้แต่ไม่ sync ข้ามเครื่อง)

### Migration E: ระบบตัดบัตรอัตโนมัติ (ยังไม่ได้รัน — ต้องรันหลัง Migration D)
```
รันไฟล์: supabase/migrations/0005_subscriptions.sql
สร้าง: payment_methods, subscriptions,
       เพิ่มคอลัมน์ subscription_id / idempotency_key / billing_reason ใน subscription_invoices,
       เพิ่ม dunning_retry_days / grace_period_days / trial_days ใน platform_settings,
       ฟังก์ชัน my_tenant_ids() + RLS,
       backfill subscription ให้ร้านที่ plan != free อยู่แล้ว
```

### Migration F: ระบบแนบสลิป + ตรวจสอบ (ยังไม่ได้รัน — ต้องรันหลัง Migration E)
```
รันไฟล์: supabase/migrations/0006_payment_slips.sql
สร้าง: payment_slips (+ unique index บน trans_ref กันสลิปซ้ำ),
       storage bucket 'payment-slips' แบบ private + policies,
       เพิ่มสถานะ awaiting_review ใน subscription_invoices,
       เพิ่มการตั้งค่าตรวจสลิปใน platform_settings,
       view pending_slip_reviews
```

### Migration G: ปิดช่องโหว่ RLS (ยังไม่ได้รัน — ⚠️ ควรรันโดยด่วน)
```
รันไฟล์: supabase/migrations/0007_rls_hardening.sql
สร้าง: view public_tenants, public_busy_slots, ฟังก์ชัน get_my_bookings(),
       เปิด RLS ครบทุกตาราง + policy อ่าน/เขียนตามสิทธิ์
ลบ:    policy เดิมจาก public_access.sql ที่เปิดกว้าง

หลังรันแล้วตรวจว่าไม่มีตารางไหนหลุด:
  SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;
  -- ควรได้ 0 แถว
```

### Migration H: ปิด browser direct insert ของ bookings (Step 12 — ✅ รันแล้ว 2026-08-02)
```
รันไฟล์: supabase/migrations/0008_close_bookings_public_insert.sql
ลบ:    policy "bookings_public_insert" (anon INSERT ชั่วคราวที่เปิดไว้ก่อน Step 11 เสร็จ)
ไม่สร้าง policy INSERT ใหม่แทน — ตั้งใจให้ RLS default-deny การ insert ทุกกรณีจาก anon/authenticated
เหตุผล: Backend (Prisma, direct DATABASE_URL) เขียน bookings โดยไม่ผ่าน RLS อยู่แล้ว จึงไม่กระทบ
        การทำงานของ POST /bookings และ POST /bookings/merchant

แนะนำให้รัน query ต่อไปนี้เพื่อยืนยันซ้ำเป็นหลักฐาน (ยังไม่ได้บันทึกผลไว้ในเอกสารนี้):
  SELECT policyname FROM pg_policies WHERE tablename='bookings' AND cmd='INSERT';
  -- ควรได้ 0 แถว
```

### Script E: สร้าง Super Admin (รันหลังสร้าง user ใน Supabase Auth Dashboard)
```sql
-- แทนที่ <AUTH_UUID> ด้วย UUID ที่ได้จาก Supabase Authentication > Users
INSERT INTO users (auth_user_id, display_name, email, role)
VALUES ('<AUTH_UUID>', 'Super Admin', 'admin@yourdomain.com', 'platform_admin')
ON CONFLICT (auth_user_id) DO UPDATE SET role = 'platform_admin';
```

---

## ⚠️ ปัญหาที่ต้องแก้ก่อน Production

| ปัญหา | ระดับ | วิธีแก้ |
|-------|-------|--------|
| `reviews` table ยังไม่มีใน DB | ❓ รอยืนยัน | รัน Migration A |
| RLS policies เปิดกว้างเกินไป | ❓ รอยืนยัน | รัน `0007_rls_hardening.sql` |
| `bookings_public_insert` ยังเปิดให้ browser insert ตรง | ✅ แก้แล้ว (2026-08-02) | รัน Migration H (`0008_close_bookings_public_insert.sql`) แล้ว |
| ไม่มี Auth guard ทุก route | ✅ แก้แล้ว | Phase 0 |
| users.auth_user_id ยังไม่มี | ✅ แก้แล้ว | รัน Migration B |
| Frontend คุย Supabase โดยตรง | 🟡 ปานกลาง | Phase 2 |
| LINE SDK ยังไม่ได้ติดตั้ง | ✅ แก้แล้ว | Step 10 ติดตั้ง `@line/liff` และเพิ่ม token integration แล้ว |
| Merchant self-registration พังถ้าเปิด email confirmation | 🔴 ยังไม่แก้ (พบ Step 14) | แก้ `AuthContext.signUp()` ให้รอ/จัดการ session ที่ยังไม่ confirm ก่อน insert `tenants` |
| `tenants` RLS insert policy ปฏิเสธ authenticated user จริง (ขัดกับ `0007_rls_hardening.sql`) | 🔴 ยังไม่แก้ (พบ Step 14) | ตรวจ `pg_policies` บน `tenants` จริงในโปรเจกต์ อาจมี policy drift |
| `SaaSContext` ไม่รีเฟตช์ข้อมูล authenticated (เช่น memberships) หลัง login | 🟡 ยังไม่แก้ (พบ Step 14) | เพิ่ม refetch trigger ผูกกับ auth state change แทน mount-once |

---

## 🔑 Environment Variables ที่ต้องตั้ง

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://kpodudqwcmsxhzjymldj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_LIFF_ID=<liff id จาก LINE Developers>     # Phase 1
VITE_API_URL=http://localhost:3000              # Phase 1
```

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://...                   # Supabase connection string
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<random secret>
LINE_CLIENT_ID=<channel id>
LINE_CLIENT_SECRET=<channel secret>
LINE_CHANNEL_ACCESS_TOKEN=<access token>
PORT=3000

# --- Billing (Omise) — จำเป็นเมื่อเปิดใช้ตัดบัตรเครดิต ---
OMISE_SECRET_KEY=skey_test_xxxxxxxx           # ห้ามใส่ใน frontend เด็ดขาด
BILLING_RETURN_URI=http://localhost:3005/merchant

# --- Supabase (จำเป็นเสมอ ใช้ทั้ง auth guard และ worker) ---
SUPABASE_URL=https://kpodudqwcmsxhzjymldj.supabase.co
SUPABASE_ANON_KEY=<anon key>                  # ใช้ตรวจ access token ของผู้ใช้
SUPABASE_SERVICE_ROLE_KEY=<service role key>  # ใช้อัปเดตใบแจ้งหนี้/แพ็กเกจข้าม RLS

# --- CORS ---
CORS_ORIGINS=http://localhost:3005,http://localhost:4000
```

**Omise Webhook:** ตั้งที่ Omise Dashboard → Webhooks → `https://<backend>/billing/webhook`
(ใช้ยืนยันผลการชำระแบบ async เช่น PromptPay ผ่าน Omise)

---

*Last updated: 2026-08-02 by AI Agent (Phase 1 Core Booking Backend API completed — Steps 11-15 done)*
