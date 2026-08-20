# Monitoring and Alerting Guide (P0)

คู่มือและเกณฑ์การตั้งค่าระบบตรวจวัดสถานะ (Monitoring), Uptime Probes, และระบบแจ้งเตือนฉุกเฉิน (Alerting) สำหรับ LINE OA Booking SaaS

---

## 1. Uptime Probes Configuration

### 1.1 Backend Liveness Probe (`/health`)
- **URL**: `https://api.yourdomain.com/health`
- **Method**: `GET`
- **Interval**: ทุก 60 วินาที
- **Timeout**: 5 วินาที
- **เกณฑ์ปกติ (Healthy)**: คืน HTTP `200 OK`
- **Payload Response**:
  ```json
  {
    "status": "ok",
    "uptimeSeconds": 1420,
    "timestamp": "2026-08-19T15:30:00.000Z",
    "env": "production",
    "memoryUsageMb": {
      "rss": 85.4,
      "heapTotal": 54.2,
      "heapUsed": 38.1
    }
  }
  ```
- **การทำงานเมื่อขัดข้อง**: หากไม่ตอบสนองหรือคืน 5xx ติดต่อกัน 2 ครั้ง ให้ Restart Container ทันที

---

### 1.2 Backend Readiness Probe (`/ready`)
- **URL**: `https://api.yourdomain.com/ready`
- **Method**: `GET`
- **Interval**: ทุก 60 วินาที
- **Timeout**: 5 วินาที
- **สิ่งที่ตรวจสอบ**:
  1. PostgreSQL Connection (`SELECT 1`)
  2. Redis Connection (`PING`)
  3. BullMQ Notification Queue Readiness
- **เกณฑ์ปกติ (Ready)**: คืน HTTP `200 OK`
  ```json
  {
    "status": "ok",
    "checks": {
      "database": "up",
      "redis": "up",
      "queue": "up"
    },
    "latencyMs": {
      "database": 4,
      "redis": 2
    },
    "queueCounts": {
      "waiting": 0,
      "active": 0,
      "failed": 0,
      "completed": 1250
    },
    "timestamp": "2026-08-19T15:30:00.000Z"
  }
  ```
- **เมื่อมี Service ขัดข้อง (Degraded)**: คืน HTTP `503 Service Unavailable`
  ```json
  {
    "status": "degraded",
    "checks": {
      "database": "up",
      "redis": "down",
      "queue": "down"
    },
    "latencyMs": {
      "database": 4,
      "redis": -1
    },
    "timestamp": "2026-08-19T15:30:00.000Z",
    "errors": ["Redis/Queue: Redis connection refused"]
  }
  ```

---

### 1.3 Frontend Uptime Monitor (Vercel)
- **URL**: `https://app.yourdomain.com/`
- **Method**: `GET`
- **Expected Status**: HTTP `200 OK`
- **Keyword Match**: `<div id="root">`

---

## 2. Critical Alert Rules & Thresholds

ตั้งค่าในระบบ Monitoring (เช่น BetterUptime, UptimeRobot, Sentry, หรือ Datadog):

| เหตุการณ์ (Event) | เงื่อนไขการทริกเกอร์ (Threshold) | ความรุนแรง | ช่องทางแจ้งเตือน | การดำเนินการทันที |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Outage** | `/health` ล้มเหลว > 2 นาที | **P0 (Critical)** | LINE Notify / Telegram / PagerDuty | ตรวจสอบ Container status บน Railway และ restart |
| **Database Disconnected** | `/ready` รายงาน `database: down` | **P0 (Critical)** | LINE Notify / Call | ตรวจสอบ Supabase Status และ Connection Pooler |
| **Redis / Queue Down** | `/ready` รายงาน `redis: down` | **P0 (Critical)** | LINE Notify / Telegram | ตรวจสอบ Upstash/Redis Cloud และ connection URL |
| **High Booking Error Rate** | Error 5xx บน `/bookings` > 2% ใน 5 นาที | **P1 (High)** | Slack / Discord | ตรวจสอบ Sentry Log ตาม `requestId` |
| **LINE DLQ Accumulation** | ข้อความ failed ใน DLQ > 20 ข้อความ | **P1 (High)** | Slack / LINE Admin Group | เปิดหน้า Admin Dashboard > LINE DLQ ตรวจสอบและกด Retry |
| **Payment Webhook Failures** | Webhook verification ล้มเหลว > 5 ครั้งติด | **P1 (High)** | Slack / Telegram | ตรวจสอบ Signature Secret และ Merchant Gateway config |

---

## 3. Correlation ID & Tracing Standard

ทุก Request ในระบบมี Header `x-request-id`:
- สามารถนำ `requestId` ที่ปรากฏใน Error Response ของลูกค้าไปค้นหาใน Server Log ได้ทันที
- Format Structured JSON Log ในระบบ:
  ```json
  {
    "reqId": "7b58c5a6-9812-4214-bf0b-6893e3d93ac7",
    "tenantId": "c4b92484-df9b-449e-ba23-1d01140026e6",
    "bookingId": "8f3769c0-613d-4c3e-953e-3245228ea112",
    "method": "POST",
    "url": "/bookings",
    "statusCode": 201,
    "durationMs": 48
  }
  ```
