# คู่มือการ Deploy และ Rollback (Deploy & Rollback Guide)

คู่มือฉบับนี้กำหนดมาตรฐานการส่งมอบซอฟต์แวร์ (Continuous Delivery), การทำ Zero-Downtime Deployment บน Railway และ Vercel, และขั้นตอนการ Rollback อย่างปลอดภัยเมื่อพบข้อผิดพลาด

---

## 1. สถาปัตยกรรมการ Deploy (Deployment Architecture)

```
[Git Repository: main] ➔ [GitHub Actions CI (Lint & Test)]
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       [Backend: Railway (NestJS)]      [Frontend: Vercel (Vite SPA)]
                  │                               │
                  ▼                               ▼
       [Database: Supabase (PG)]         [CDN: Global Edge Network]
```

---

## 2. ขั้นตอนการ Deploy (Deployment Workflow)

### 2.1 ตรวจสอบความพร้อมก่อน Deploy (Pre-flight Checks)
ก่อน Merge PR เข้าสู่ branch `main`:
1. รันการทดสอบ Backend: `cd backend && npm test`
2. รันการทดสอบ Frontend: `npm run test:frontend`
3. ตรวจสอบ Type Safety: `npx tsc --noEmit` (ทั้ง root และ backend)
4. ตรวจสอบ Bundle Size: `npm run bundle:check` (ต้องไม่เกิน 500 KiB ต่อ chunk)

### 2.2 การรัน Database Migrations (Zero-Downtime Migration Rule)
- ทุก Migration ต้องรองรับ **Backward Compatibility (Expand and Contract Pattern)**:
  - **ห้าม** ลบคอลัมน์หรือเปลี่ยนชื่อคอลัมน์ใน Step เดียวกับการอัปเดตโค้ด
  - ให้เพิ่มคอลัมน์ใหม่ (Expand) ➔ Deploy โค้ดใหม่ ➔ ทยอยย้ายข้อมูล ➔ ลบคอลัมน์เก่าใน Migration ถัดไป (Contract)
- คำสั่ง Migration:
  ```bash
  cd backend && npx prisma migrate deploy
  ```

### 2.3 การ Deploy Backend (Railway)
1. เชื่อมต่อ Railway เข้ากับ GitHub Repository branch `main`
2. Railway จะสร้าง Docker Container ตาม `backend/Dockerfile`
3. Health check path: `/health` (ต้องตอบกลับ HTTP 200 ภายใน 30 วินาที)
4. Railway จะทำ **Rolling Update** (เปิดคอนเทนเนอร์ใหม่จน Health Check ผ่าน ก่อนปิดคอนเทนเนอร์เดิม)

### 2.4 การ Deploy Frontend (Vercel)
1. Vercel รันคำสั่ง `npm run build`
2. Static assets ถูกกระจายไปยัง Global CDN พร้อม Cache Headers
3. การอัปเดตมีผลในระดับทันที (Atomic Deployments)

---

## 3. ขั้นตอนการ Rollback ทันทีเมื่อเกิดปัญหา (Instant Rollback Procedure)

### 3.1 การ Rollback Frontend บน Vercel (< 1 นาที)
1. เข้าสู่ Vercel Dashboard > เลือกโปรเจกต์ `line-oa-booking-saas`
2. ไปที่แท็บ **Deployments**
3. เลือก Deployment ก่อนหน้าที่ทำงานปกติ
4. คลิกไอคอน `...` แล้วเลือก **Instant Rollback (Promote to Production)**
5. ทราฟฟิกจะถูกสลับกลับทันทีโดยไม่ต้องรอ Build ใหม่

### 3.2 การ Rollback Backend บน Railway (< 2 นาที)
1. เข้าสู่ Railway Dashboard > เลือก Service `line-booking-api`
2. ไปที่แท็บ **Deployments**
3. เลือก Deployment ก่อนหน้าที่เสถียร
4. คลิก **Redeploy** หรือคลิก **Rollback to this deployment**
5. ตรวจสอบ Logs ที่ `/health` และ Sentry Dashboard

### 3.3 การ Rollback Database Migration (หากจำเป็น)
หาก Migration ที่เพิ่งรันทำให้เกิด Error:
1. ห้ามลบข้อมูลดิบ
2. รัน SQL Rollback Script ที่เตรียมไว้ล่วงหน้า
3. ตัวอย่างการยกเลิก Policy หรือ Index:
   ```sql
   DROP INDEX IF EXISTS idx_faulty_index;
   ```
