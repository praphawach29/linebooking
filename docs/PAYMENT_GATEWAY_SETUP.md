# คู่มือการตั้งค่าระบบรับชำระเงิน (Payment Gateway Setup Guide)

คู่มือฉบับนี้อธิบายการตั้งค่าช่องทางการรับชำระเงิน 3 รูปแบบหลักบนแพลตฟอร์ม: **PromptPay QR (EMVCo)**, **ระบบตรวจสลิปอัตโนมัติ (SlipOK / EasySlip)**, และ **Omise Payment Gateway**

---

## 1. การตั้งค่า PromptPay QR Code (EMVCo Standard)

ระบบรองรับการสร้าง Dynamic PromptPay QR Code ตามมาตรฐาน EMVCo Tag 63 CRC16 โดยยอดเงินจะถูกฝังลงใน QR Code โดยตรง

### ขั้นตอนการตั้งค่า:
1. เข้าเมนู **ตั้งค่าร้านค้า (Payment Settings) > PromptPay**
2. **หมายเลขพร้อมเพย์ (PromptPay Target)**:
   - เบอร์โทรศัพท์มือถือ 10 หลัก (เช่น `0812345678`) ระบบจะแปลงเป็น `0066812345678` ให้อัตโนมัติ
   - หรือ เลขประจำตัวผู้เสียภาษี 13 หลัก (Tax ID / นิติบุคคล)
3. **ชื่อบัญชีที่ถูกต้อง (Receiver Name)**: ระบุชื่อ-นามสกุล หรือชื่อบริษัทตามหน้าสมุดบัญชีจริง เพื่อใช้ตรวจสอบเทียบกับสลิปโอนเงิน

---

## 2. การตั้งค่าระบบตรวจสลิปโอนเงินอัตโนมัติ (Automated Slip Verification)

ระบบรองรับ Slip Provider 2 รายหลักเพื่อตรวจจับสลิปปลอม สลิปซ้ำ และสลิปโอนไม่ตรงยอด:

### 2.1 การเชื่อมต่อ SlipOK
1. สมัครบัญชีที่ [SlipOK.com](https://slipok.com/) และเติมแพ็กเกจโควตาสลิป
2. สร้าง Branch ในระบบ SlipOK และคัดลอก **Branch ID** และ **API Key**
3. ในระบบหลังบ้าน เลือก Provider เป็น `SlipOK` และกรอก:
   - `SlipOK API Key`
   - `Branch ID`

### 2.2 การเชื่อมต่อ EasySlip
1. สมัครบัญชีที่ [EasySlip.com](https://easyslip.com/)
2. คัดลอก **API Secret Key**
3. ในระบบหลังบ้าน เลือก Provider เป็น `EasySlip` และกรอก API Key

### 2.3 กฎการตรวจสอบ 4 ข้อของระบบ (Verification Rules):
- **ยอดเงินตรง (Amount Match)**: ยอดโอนจริงต้องเท่ากับยอดที่คำนวณไว้ โดยยอมรับส่วนต่างได้ตามที่ตั้งค่าไว้ (Slip Amount Tolerance เช่น 0.00 หรือ 1.00 บาท)
- **โอนเข้าบัญชีเราจริง (Receiver Match)**: ชื่อหรือเลขบัญชีปลายทางต้องตรงกับร้านค้า
- **เวลาโอนอยู่ในช่วงที่ถูกต้อง (Time Window)**: เวลาโอนบนสลิปต้องไม่เกินระยะเวลาที่กำหนด (เช่น ภายใน 24 ชม.)
- **เลขอ้างอิงไม่ซ้ำ (Unique Transaction Reference)**: ตรวจสอบ `trans_ref` บนสลิป หากเคยถูกใช้งานแล้วในระบบจะถูกปฏิเสธทันทีเพื่อป้องกันการนำสลิปเก่ามาใช้ซ้ำ

---

## 3. การตั้งค่า Omise Payment Gateway (บัตรเครดิต/เดบิต)

### 3.1 การเชื่อมต่อ Omise Keys
1. สมัครบัญชีที่ [Omise.co](https://www.omise.co/) และยืนยันตัวตนระดับองค์กร (Production Live Mode)
2. นำ Keys มาใส่ในระบบ:
   - `OMISE_PUBLIC_KEY` (เช่น `pkey_live_...` หรือ `pkey_test_...`)
   - `OMISE_SECRET_KEY` (เช่น `skey_live_...` หรือ `skey_test_...`)

### 3.2 การตั้งค่า Omise Webhook Endpoints
1. ใน Omise Dashboard > **Webhooks**
2. เพิ่ม Endpoint URL:
   ```
   https://api.linebooking.app/api/billing/webhook/omise
   ```
3. เลือก Event: `charge.complete`, `charge.create`, `refund.create`

### 3.3 การรองรับ Webhook Idempotency
ระบบมี Idempotency Guard ป้องกันการส่ง Webhook ซ้ำ โดยตรวจสอบสถานะ Invoice ก่อนบันทึก หากรายการได้รับการยืนยันแล้วจะตอบกลับ `200 OK (idempotent)` ทันที
