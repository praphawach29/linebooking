# คู่มือแก้ปัญหาการจองและการคืนเงิน (Booking Troubleshooting & Refunds SOP)

คู่มือฉบับนี้สำหรับทีม Support, เจ้าของร้านค้า และผู้ดูแลระบบในการจัดการปัญหาการจองที่พบบ่อย การจัดการข้อพิพาทสลิป และขั้นตอนการคืนเงินผ่านระบบ

---

## 1. การจัดการปัญหาการจอง (Booking Issues)

### 1.1 การป้องกันและแก้ไขปัญหาการจองชนกัน (Double Booking Prevention)
- **กลไกป้องกันของระบบ**: ระบบใช้ PostgreSQL Serializable Isolation Level พร้อม Advisory Locks และ Exclusion Constraints (`EXCLUDE USING gist`) บนช่วงเวลา `(booking_date, start_time, end_time, resource_id)`
- **หากเกิดกรณีฉุกเฉิน (Concurrency Conflict)**:
  1. เข้าสู่ **Merchant Dashboard > รายการจอง (Bookings)**
  2. เลือกลูกค้ารายที่ต้องการเปลี่ยนเวลา แล้วกด **เลื่อนเวลาจอง (Reschedule)**
  3. ระบบจะส่ง Flex Message แจ้งเวลาใหม่ไปยัง LINE ของลูกค้าทันที

### 1.2 ลูกค้าไม่ได้รับข้อความแจ้งเตือน LINE Flex Message
1. ตรวจสอบสถานะ **โควตาข้อความ (LINE Quota Snapshot)** ในหน้าตั้งค่า LINE OA
2. เข้าสู่ **Super Admin Dashboard > LINE Queue & Dead-Letter Queue (DLQ)**
3. ค้นหา `Booking ID` หรือ `Delivery ID` ของรายการดังกล่าว
4. หากพบ Error เช่น `Invalid Channel Access Token` หรือ `Rate Limit Exceeded`:
   - กดปุ่ม **"ยิงซ้ำ (Retry Delivery)"** เพื่อให้ระบบส่งข้อความใหม่ทันที

---

## 2. การจัดการสลิปที่มีข้อพิพาท (Slip Review & Disputes)

เมื่อสลิปติดสถานะ `pending` หรือ `flagged_suspicious`:
1. เข้าเมนู **Super Admin / Merchant > รออนุมัติสลิป (Slip Review)**
2. ตรวจสอบข้อมูล 4 ประเด็น:
   - ภาพสลิปมีร่องรอยตัดต่อหรือบิดเบือนตัวเลขหรือไม่
   - ชื่อบัญชีผู้รับตรงกับชื่อร้านค้าหรือไม่
   - เวลาโอนเงินตรงกับเวลาที่แจ้งจองหรือไม่
   - มียอดเงินเข้าบัญชีจริงในแอปพลิเคชันธนาคารหรือไม่
3. **การดำเนินการ**:
   - หากยอดเงินถูกต้อง: กด **"อนุมัติ (Approve)"** ระบบจะเปลี่ยนสถานะการจองเป็น `confirmed` ทันที
   - หากสลิปไม่ถูกต้อง: กด **"ปฏิเสธ (Reject)"** พร้อมระบุเหตุผล ระบบจะส่งแจ้งเตือนให้ลูกค้าแนบสลิปใหม่

---

## 3. ขั้นตอนการคืนเงิน (Refund Standard Operating Procedure)

### 3.1 การคืนเงินค่าบริการ SaaS ร้านค้า (Omise 1-Click Refund)
สำหรับ Super Admin เมื่อร้านค้าขอยกเลิกหรือคืนเงินค่าแพ็กเกจ:
1. ไปที่ **Super Admin > กระทบยอด (Reconciliation)** หรือ **ใบแจ้งหนี้ (Invoices)**
2. ค้นหา `Invoice No` หรือ `Charge ID` ของรายการ
3. กดปุ่ม **"ขอคืนเงิน (Refund via Omise)"**
4. ระบุเหตุผลการคืนเงิน (Reason)
5. ระบบจะยิงคำขอไปยัง Omise Refunds API และปรับสถานะ Invoice เป็น `refunded` พร้อมบันทึก Audit Log ทันที เงินจะคืนเข้าบัตรของร้านค้าภายใน 7-14 วันทำการ

### 3.2 การคืนเงินลูกค้าหน้าร้าน (Customer Booking Refund)
ตามเงื่อนไขนโยบายยกเลิก (Cancellation Policy) ของแต่ละร้านค้า:
- **กรณียกเลิกล่วงหน้าตามเกณฑ์ (เช่น ล่วงหน้า > 24 ชม.)**:
  - ร้านค้าสามารถโอนเงินมัดจำคืนลูกค้าผ่าน PromptPay ตามยอดที่ระบบคำนวณสัดส่วนการคืนเงิน (Refund Percentage)
  - ปรับสถานะการจองในระบบเป็น `cancelled`
- **กรณียกเลิกกระชั้นชิด (Late Cancellation)**:
  - ดำเนินการตามข้อกำหนดของร้านค้า (อาจยึดมัดจำหรือไม่คืนเงิน)
