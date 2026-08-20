# แผนเผชิญเหตุและรับมือระบบขัดข้อง (Incident Response Runbook)

คู่มือฉบับนี้กำหนดกรอบการทำงาน การจำแนกระดับความรุนแรง (Severity Levels) และขั้นตอนการแก้ไขปัญหาสำหรับทีม On-call Engineer และ DevOps

---

## 1. การจำแนกระดับความรุนแรง (Severity Classification)

| ระดับ | คำอธิบาย | SLA การตอบสนอง | ตัวอย่างเหตุการณ์ |
|---|---|---|---|
| **P0 (Critical)** | ระบบหลักล่มทั้งหมด หรือเกิด Data Loss / Security Breach | **ภายใน 15 นาที** | PostgreSQL down, Redis down, ระบบจองหยุดทำงานทั้งหมด |
| **P1 (High)** | ฟังก์ชันหลักใช้งานไม่ได้ หรือกระทบร้านค้าจำนวนมาก | **ภายใน 30 นาที** | LINE Flex Message ส่งไม่ไปทั้งระบบ, Webhook ล้มเหลวทั้งหมด |
| **P2 (Medium)** | ฟังก์ชันย่อยมีปัญหา แต่ยังมีทางเลี่ยง (Workaround) | **ภายใน 2 ชั่วโมง** | Slip verification provider ช้า, กราฟ Analytics ไม่โหลด |
| **P3 (Low)** | ปัญหาการแสดงผลเล็กน้อย หรือคำถามเชิงเทคนิค | **ภายใน 24 ชั่วโมง** | ข้อความแปลผิด, สีปุ่มแสดงผลไม่ตรง |

---

## 2. ขั้นตอนการรับมือเมื่อเกิดเหตุการณ์ (Incident Response Flow)

```
[1. ตรวจพบ Alert] ➔ [2. ระบุระดับความรุนแรง] ➔ [3. เข้าห้อง War Room] ➔ [4. ดำเนินการแก้ไข/Rollback] ➔ [5. ตรวจสอบระบบ] ➔ [6. Post-Mortem]
```

### 2.1 ขั้นตอนที่ 1: ตรวจสอบ Health Endpoints ทันที
- **Liveness Check**: `GET https://api.linebooking.app/health`
- **Readiness Check**: `GET https://api.linebooking.app/ready`
  - ตรวจสอบสถานะการเชื่อมต่อ Database, Redis, และ BullMQ Queue Latency

### 2.2 ขั้นตอนที่ 2: ตรวจสอบ Error Tracking (Sentry & Uptime)
- เปิดดู Sentry Issues เพื่อดู Stack Trace และ Request ID / Tenant ID ที่เกิดข้อผิดพลาด
- ตรวจสอบ Uptime Robot / BetterStack dashboard

---

## 3. แผนแก้ไขเหตุการณ์เฉพาะกรณี (Specific Incident Recovery Procedures)

### 3.1 กรณี: LINE Messaging Queue ค้าง (Queue Backlog / Dead-Letter Overflow)
1. ตรวจสอบสถานะ Redis Connection ใน Health Check
2. เข้าสู่ Super Admin Dashboard > **LINE Queue & DLQ**
3. หาก Token หมดอายุ: แจ้งร้านค้าให้ออก Token ใหม่บน LINE Developers Console
4. กดปุ่ม **"Retry Failed Deliveries"** เพื่อนำข้อความใน DLQ กลับมารันใหม่
5. ตรวจสอบสถานะ Worker Process บน Railway

### 3.2 กรณี: PostgreSQL Database Connection Pool เต็ม (Exhausted Connections)
1. ตรวจสอบ Transaction ที่ค้างอยู่ (Long-running locks):
   ```sql
   SELECT pid, now() - query_start AS duration, query, state
   FROM pg_stat_activity
   WHERE state != 'idle' AND now() - query_start > interval '30 seconds';
   ```
2. ปิด Connection ที่ค้าง:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;
   ```
3. สลับการเชื่อมต่อ Backend มาใช้ Transaction Connection Pooler (Port 6543 / PgBouncer) บน Supabase

### 3.3 กรณี: Payment Webhook ล้มเหลวต่อเนื่อง (Omise / Slip Provider Down)
1. ตรวจสอบ Endpoint URL และ SSL Certificate
2. สลับโหมดการตรวจสลิปของร้านค้าเป็น **Manual Verification** ชั่วคราวผ่านหน้า Gateway Settings
3. แจ้งข้อความประกาศผ่าน **Global Super Admin Banner** เพื่อให้ร้านค้าทราบ

---

## 4. รายชื่อผู้ติดต่อฉุกเฉิน (Escalation Contacts)

- **Lead Backend Engineer**: `backend-lead@linebooking.app`
- **DevOps / Infra Engineer**: `devops@linebooking.app`
- **Customer Success Lead**: `support@linebooking.app`
