# เอกสารอ้างอิง Environment Variables (Environment Variable Reference)

เอกสารฉบับนี้รวบรวมตัวแปรสภาพแวดล้อม (Environment Variables) ทั้งหมดที่ใช้งานในระบบ **LINE OA Booking SaaS** ทั้งฝั่ง Backend (NestJS) และ Frontend (Vite React SPA) พร้อมคำอธิบาย ชนิดข้อมูล ค่าเริ่มต้น และสถานะความจำเป็น

---

## 1. Backend Environment Variables (NestJS)

ไฟล์ `.env` ในไดเรกทอรี `backend/` หรือตั้งค่าบน **Railway Environment Variables**:

| Variable Name | Description | Type / Example | Required | Default Value | Security Level |
|---|---|---|---|---|---|
| `NODE_ENV` | สภาพแวดล้อมการทำงานของระบบ | `development` \| `production` \| `test` | Optional | `development` | Public |
| `PORT` | พอร์ตสำหรับ HTTP Server | `number` (เช่น `3000` หรือ `8080`) | Optional | `3000` | Public |
| `DATABASE_URL` | Connection string สำหรับเชื่อมต่อ PostgreSQL | `postgresql://user:pass@host:5432/db` | **Required** | - | **CRITICAL SECRET** |
| `SUPABASE_URL` | URL ของ Supabase Project | `https://xxxx.supabase.co` | **Required** | - | Public |
| `SUPABASE_ANON_KEY` | Public Anon API Key สำหรับตรวจสอบ JWT | `eyJhbGci...` | **Required** | - | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret Service Role Key สำหรับงานระบบและ Admin | `eyJhbGci...` | **Required** | - | **CRITICAL SECRET** |
| `CORS_ORIGINS` | รายการโดเมนที่อนุญาตให้เรียก API (คั่นด้วยจุลภาค) | `https://app.linebooking.app,http://localhost:3005` | Optional | `*` (dev) | Public |
| `JWT_SECRET` | Secret สำหรับเซ็นต์และตรวจสอบ Internal Token | `string` | Optional | Generated | **SECRET** |
| `REDIS_URL` | Connection string สำหรับเชื่อมต่อ Redis / BullMQ | `redis://default:pass@host:6379` | Optional | `redis://localhost:6379` | **SECRET** |
| `REDIS_HOST` | Hostname ของ Redis Server (หากไม่ใช้ REDIS_URL) | `redis.railway.internal` | Optional | `localhost` | Public |
| `REDIS_PORT` | พอร์ตของ Redis Server | `number` (เช่น `6379`) | Optional | `6379` | Public |
| `REDIS_PASSWORD` | รหัสผ่านสำหรับเชื่อมต่อ Redis | `string` | Optional | - | **SECRET** |
| `OMISE_SECRET_KEY` | Secret Key ของ Omise สำหรับ Charge & Refund API | `skey_live_...` หรือ `skey_test_...` | Optional | - | **CRITICAL SECRET** |
| `SENTRY_DSN` | DSN Endpoint สำหรับส่ง Error Tracking ไปยัง Sentry | `https://xxx@sentry.io/xxx` | Optional | - | Public |

---

## 2. Frontend Environment Variables (Vite React SPA)

ไฟล์ `.env` ใน root ไดเรกทอรี หรือตั้งค่าบน **Vercel Project Settings > Environment Variables**:

| Variable Name | Description | Type / Example | Required | Default Value |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | URL ของ Supabase Project | `https://xxxx.supabase.co` | **Required** | - |
| `VITE_SUPABASE_ANON_KEY` | Public Anon Key สำหรับ Client Supabase SDK | `eyJhbGci...` | **Required** | - |
| `VITE_API_URL` | Base URL ของ Backend API Service | `https://api.linebooking.app` | **Required** | `http://localhost:3000` |
| `VITE_LIFF_ID` | Global Fallback LIFF App ID | `2000000000-XXXXXXXX` | Optional | - |
| `VITE_OMISE_PUBLIC_KEY` | Public Key ของ Omise สำหรับ Tokenize บัตรเครดิต | `pkey_live_...` หรือ `pkey_test_...` | Optional | - |

---

## 3. Best Practices & Security Rules

1. **ห้าม Commit ไฟล์ `.env` เข้า Git เด็ดขาด**: มีการตั้งค่า `.gitignore` และ `.dockerignore` บล็อกไฟล์ `.env` ทุกระดับ
2. **Environment Validation เมื่อ Backend เริ่มทำงาน**: ระบบมี `validateEnv()` ที่จะสั่งให้ Node.js Process หยุดทำงานทันที (Fail-Fast) หากค่าตัวแปรจำเป็น (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) ขาดหายหรือมีรูปแบบผิดพลาด
3. **การแยก Key สำหรับ Testing**: ในการรัน Integration Tests จะใช้ `TEST_DATABASE_URL` และ `TEST_DATABASE_ACKNOWLEDGED=true` เพื่อป้องกันการเขียนทับฐานข้อมูล Production
