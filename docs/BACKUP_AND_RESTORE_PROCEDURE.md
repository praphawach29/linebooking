# ขั้นตอนการสำรองและกู้คืนข้อมูล (Backup & Restore Procedure)

คู่มือฉบับนี้กำหนดมาตรการสำรองข้อมูล (Backup Strategy), นโยบายการเก็บรักษา (Retention Policy), และขั้นตอนการกู้คืนข้อมูลจากภัยพิบัติ (Disaster Recovery & Point-in-Time Recovery - PITR) สำหรับระบบ **LINE OA Booking SaaS**

---

## 1. ยุทธศาสตร์การสำรองข้อมูล (Backup Architecture)

| ส่วนประกอบ | วิธีการสำรอง | ความถี่ (Frequency) | ระยะเวลาจัดเก็บ (Retention) | เป้าหมาย RPO / RTO |
|---|---|---|---|---|
| **PostgreSQL Database** | Supabase Automated Daily Backups + WAL Archiving (PITR) | ทุกวัน + ต่อเนื่อง (Continuous WAL) | 30 วัน (Enterprise: 90 วัน) | RPO: < 5 นาที<br>RTO: < 30 นาที |
| **Redis State & Queue** | Redis AOF (Append-Only File) + RDB Snapshot | RDB ทุก 15 นาที + AOF ทุก 1 วินาที | ล่าสุด 7 วัน | RPO: < 1 วินาที<br>RTO: < 5 นาที |
| **Storage (Slips & Avatars)** | Supabase Storage S3 Multi-region Replication | Real-time Synchronous Replication | 180 วันสำหรับสลิป / ถาวรสำหรับรูปภาพ | RPO: 0<br>RTO: < 10 นาที |

---

## 2. ขั้นตอนการสำรองข้อมูลด้วยตนเอง (Manual Database Backup / Dump)

ก่อนการทำ Database Migration ครั้งใหญ่ หรือก่อนเริ่ม Maintenance ให้รันคำสั่ง Dump ฐานข้อมูล:

```bash
# ส่งออก schema และ data เป็นไฟล์ pg_dump (Compressed custom format)
pg_dump -h db.xxxx.supabase.co -p 5432 -U postgres -d postgres -F c -b -v -f "linebooking_backup_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 3. ขั้นตอนการกู้คืนข้อมูล (Restore Procedures)

### 3.1 การกู้คืนแบบ Point-in-Time Recovery (PITR) ผ่าน Supabase Dashboard
1. เข้าสู่ [Supabase Dashboard](https://app.supabase.com/) > เลือกโปรเจกต์ `linebooking`
2. ไปที่เมนู **Database > Backups > Point in Time**
3. เลือกวันและเวลาที่ต้องการกู้คืน (เช่น ย้อนกลับไปก่อนเกิด Incident 10 นาที)
4. เลือก **Restore to a new project** หรือ **Restore in-place**
5. ตรวจสอบข้อมูลในตาราง `tenants`, `bookings`, `payments`
6. อัปเดต `DATABASE_URL` บน Railway ให้ชี้ไปยังฐานข้อมูลที่กู้คืนเรียบร้อยแล้ว

### 3.2 การกู้คืนจากไฟล์ Dump ด้วย `pg_restore`
```bash
# กู้คืนข้อมูลลงในฐานข้อมูลปลายทาง
pg_restore -h db.xxxx.supabase.co -p 5432 -U postgres -d postgres -v --clean --if-exists "linebooking_backup_20260820.dump"
```

---

## 4. แผนการซ้อมกู้คืนข้อมูล (Disaster Recovery Drill)

- **ความถี่ในการซ้อม**: ทุกไตรมาส (Quarterly)
- **เกณฑ์ผ่าน**:
  1. กู้คืนไฟล์ Dump ลงใน Staging Database ได้สมบูรณ์ 100%
  2. รัน Automated Backend Tests (`npm test`) บนฐานข้อมูลที่กู้คืนผ่านทั้งหมด
  3. ไม่มีข้อมูลสูญหายเกินค่า RPO (< 5 นาที)
