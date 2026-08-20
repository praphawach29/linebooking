# คู่มือการตั้งค่า LINE OA และ LIFF (LINE Official Account & LIFF Setup Guide)

คู่มือฉบับนี้อธิบายขั้นตอนการเชื่อมต่อ **LINE Developers Console**, **Messaging API**, และ **LIFF (LINE Front-end Framework)** เข้ากับแพลตฟอร์ม เพื่อเปิดให้ลูกค้ากดจองบริการผ่านแอปพลิเคชัน LINE ได้อย่างราบรื่น

---

## 1. การสร้าง Provider และ Channel บน LINE Developers Console

1. เข้าสู่เว็บไซต์ [LINE Developers Console](https://developers.line.biz/) และล็อกอินด้วยบัญชี LINE Business
2. คลิก **Create a new Provider** (ตั้งชื่อ เช่น `ชื่อร้านค้า Booking`)
3. สร้าง Channel 2 ประเภท:
   - **Messaging API Channel**: สำหรับส่งข้อความ Flex Messages แจ้งเตือนลูกค้า
   - **LINE Login Channel**: สำหรับผูกระบบ LIFF Web App

---

## 2. การตั้งค่า Messaging API Channel

### 2.1 ดึงค่า Channel Access Token
1. เข้าไปที่แท็บ **Messaging API** ของ Channel ที่สร้าง
2. เลื่อนลงมาที่หัวข้อ **Channel access token (long-lived)** แล้วกด **Issue**
3. คัดลอก Token ที่ได้ไปวางในระบบหลังบ้าน:
   - เมนู **LINE OA Settings > Channel Access Token**

### 2.2 การตั้งค่า Webhook URL
1. ในหน้า Messaging API เลื่อนไปที่ **Webhook settings**
2. กรอก Webhook URL ของระบบ:
   ```
   https://api.linebooking.app/api/notifications/webhook/:tenantId
   ```
3. เปิดสวิตช์ **Use webhook** ให้เป็น `ON`
4. กดปุ่ม **Verify** เพื่อทดสอบการเชื่อมต่อ (ต้องขึ้นสถานะ `Success 200`)
5. ในหัวข้อ **Auto-reply messages** และ **Greeting messages** บน LINE Official Account Manager ให้กด **Disabled** เพื่อป้องกันข้อความตอบกลับชนกับระบบบอท

---

## 3. การสร้างและตั้งค่า LIFF App

1. ไปที่ **LINE Login Channel** ที่สร้างไว้
2. เข้าสู่แท็บ **LIFF** แล้วกดปุ่ม **Add LIFF app**
3. กรอกข้อมูลการตั้งค่า:
   - **LIFF app name**: `จองคิวออนไลน์`
   - **Size**: `Full` (แนะนำสำหรับประสบการณ์ใช้งานที่ดีที่สุด)
   - **Endpoint URL**: `https://app.linebooking.app/liff?tenant=:tenantId`
   - **Scopes**: ติ๊กเลือก `profile` และ `openid`
   - **Bot prompt**: เลือก `Aggressive` (เพื่อให้ลูกค้ากดติดตาม LINE OA อัตโนมัติเมื่อเปิด LIFF)
   - **Scan QR**: เปิด `Enabled` (หากต้องการใช้สแกน QR ผ่าน LIFF)
4. กด **Add** และคัดลอก **LIFF ID** (เช่น `2000000000-XXXXXXXX`) ไปบันทึกในระบบหลังบ้าน

---

## 4. การตั้งค่า Rich Menu สำหรับร้านค้า (Rich Menu Setup)

ออกแบบและสร้าง Rich Menu บน **LINE Official Account Manager** (manager.line.biz):

### แนะนำปุ่มใน Rich Menu:
| ตำแหน่งปุ่ม | การกระทำ (Action) | ลิงก์ / Action Value |
|---|---|---|
| **ปุ่มที่ 1 (เด่นที่สุด)** | Open URL (เปิด LIFF) | `https://liff.line.me/:liffId` |
| **ปุ่มที่ 2** | Open URL (ดูประวัติการจอง) | `https://liff.line.me/:liffId/my-bookings` |
| **ปุ่มที่ 3** | Open URL (แต้มสะสม / แลกรางวัล) | `https://liff.line.me/:liffId/rewards` |
| **ปุ่มที่ 4** | Message / Tel (ติดต่อร้านค้า) | `tel:0812345678` หรือข้อความสอบถาม |

---

## 5. การหมุนเปลี่ยน Channel Access Token (Token Rotation)

เมื่อ Token ใกล้หมดอายุหรือต้องการหมุนเปลี่ยนเพื่อความปลอดภัย:
1. เข้าไปที่ LINE Developers Console > Messaging API
2. กด **Reissue** เพื่อสร้าง Token ใหม่
3. นำ Token ใหม่ไปอัปเดตที่หน้า **LINE OA Settings** บนระบบทันที
4. ระบบจะทำการทดสอบส่ง Health Ping ไปยัง LINE API เพื่อยืนยันความถูกต้องก่อนบันทึก
