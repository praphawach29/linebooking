# Disaster Recovery Runbook (P0)

คู่มือขั้นตอนการกู้คืนระบบฉุกเฉิน (Disaster Recovery & Incident Response) สำหรับ LINE OA Booking SaaS
**เป้าหมาย SLA**: ตรวจพบและเริ่มแก้ไขภายใน 5 นาที, กู้คืนระบบกลับมาใช้งานได้ (RTO) < 30 นาที, ข้อมูลสูญหาย (RPO) < 5 นาที

---

## 1. การวินิจฉัยปัญหาฉุกเฉิน (Triage & Diagnosis < 5 นาที)

เมื่อได้รับแจ้งเตือนจาก Uptime Monitor หรือผู้ใช้งาน:
1. **ตรวจสอบความพร้อมของระบบ**:
   ```bash
   curl -i https://api.yourdomain.com/ready
   ```
2. **จำแนกสาเหตุ**:
   - ถ้าตอบ `503` และ `database: down` $\rightarrow$ ข้ามไป **ข้อ 2 (Database Recovery)**
   - ถ้าตอบ `503` และ `redis: down` $\rightarrow$ ข้ามไป **ข้อ 3 (Redis & Queue Recovery)**
   - ถ้า Request Timeout หรือ `502 Bad Gateway` $\rightarrow$ ข้ามไป **ข้อ 4 (Backend Container Recovery)**

---

## 2. ขั้นตอนการกู้คืนฐานข้อมูล Supabase (Database Recovery)

### สถานการณ์ A: Connection Pool อิ่มตัว (Exhausted Pool)
1. เข้าไปที่ **Supabase Dashboard** $\rightarrow$ **Project Settings** $\rightarrow$ **Database**
2. ตรวจสอบ **Active Connections**
3. หาก Connection เต็ม:
   - สลับไปใช้ Supabase **Transaction Mode Pooler** (พอร์ต 6543)
   - รีสตาร์ท PostgREST: ไปที่ **Settings** $\rightarrow$ **General** $\rightarrow$ **Restart project**

### สถานการณ์ B: ข้อมูลเสียหายหรือถูกลบผิดพลาด (Point-in-Time Recovery - PITR)
1. ไปที่ Supabase Dashboard $\rightarrow$ **Database** $\rightarrow$ **Backups**
2. เลือก **Point-in-Time Recovery (PITR)**
3. เลือกระบุเวลาย้อนหลัง (เช่น 10 นาทีก่อนเกิดเหตุ)
4. ยืนยันการ Restore เพื่อกู้คืน Database Snapshot
5. หลังจาก Restore เสร็จสิ้น:
   - ตรวจสอบตาราง `audit_logs` เพื่อดูการเปลี่ยนแปลงล่าสุด
   - รัน migration ตรวจสอบความสมบูรณ์ของ schema: `npx prisma db push` หรือตรวจสอบ migration status

---

## 3. ขั้นตอนการกู้คืน Redis และ BullMQ Queue (Queue Recovery)

### สถานการณ์ A: Redis ขัดข้องหรือ Crash
1. เข้าไปที่ Upstash / Redis Cloud Console
2. ตรวจสอบ Memory Usage และ Connection Limit
3. หาก Redis Instance พัง ให้เปลี่ยน Connection String ใน `.env` บน Railway/Render:
   ```env
   REDIS_URL=redis://default:new_password@new-host:6379
   ```
4. Redeploy Backend Service

### สถานการณ์ B: การกู้คืนข้อความ LINE ที่ค้างหลัง Redis กลับมา (Self-Healing Recovery)
ระบบมี **Durable Storage & Self-Healing** ใน `NotificationsService`:
- เมื่อ Backend สตาร์ทขึ้นมาใหม่ ฟังก์ชัน `onApplicationBootstrap()` จะสแกนตาราง `line_message_deliveries` ใน PostgreSQL และ re-enqueue งานที่มีสถานะ `queued` เข้า BullMQ อัตโนมัติทันที
- สำหรับข้อความที่สถานะเป็น `failed` ให้เข้าไปที่ **Admin Dashboard** $\rightarrow$ เมนู **LINE Queue & DLQ** $\rightarrow$ กดปุ่ม **"ยิงซ้ำทั้งหมด (Retry All)"**

---

## 4. ขั้นตอนการกู้คืน Backend Process (Application Recovery)

1. เข้าไปที่ **Railway Dashboard** $\rightarrow$ **Backend Service** $\rightarrow$ **Deployments**
2. ตรวจสอบ Build & Runtime Logs
3. หากเกิด Memory Leak หรือ Process ค้าง:
   - กดปุ่ม **Restart**
4. หากเกิดจาก Code Bug ล่าสุด:
   - กดปุ่ม **Rollback** กลับไปยัง Deployment ก่อนหน้าทันที

---

## 5. การสืบสวนด้วย Audit Logs & Request Correlation ID

- **การค้นหาประวัติการทำงานของพนักงาน / ร้านค้า**:
  ```sql
  SELECT * FROM audit_logs 
  WHERE tenant_id = 'tenant-uuid' 
  ORDER BY created_at DESC 
  LIMIT 50;
  ```
- **การติดตาม Request จาก Error Response**:
  นำค่า `requestId` ที่ผู้ใช้งานแจ้ง ไปค้นหาใน Log Stream ของ Railway / Sentry เพื่อดู Exception Stack Trace แบบเจาะจง
