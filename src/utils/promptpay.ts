/**
 * PromptPay QR Payload Generator (EMVCo / มาตรฐาน Thai QR Payment ของ ธปท.)
 *
 * ใช้สร้าง QR ที่สแกนจ่ายได้จริงด้วยแอปธนาคาร โดยไม่ต้องพึ่ง Payment Gateway
 * — เหมาะกับกรณีเจ้าของแพลตฟอร์มรับเงินค่าแพ็กเกจเข้าเลขพร้อมเพย์ของตัวเอง
 *
 * โครงสร้าง TLV: [tag 2 หลัก][length 2 หลัก][value]
 */

type PromptPayTargetType = 'mobile' | 'national_id' | 'ewallet';

const ID_PAYLOAD_FORMAT = '00';
const ID_POI_METHOD = '01';
const ID_MERCHANT_INFO_BOT = '29';
const ID_COUNTRY = '58';
const ID_CURRENCY = '53';
const ID_AMOUNT = '54';
const ID_CRC = '63';

const PAYLOAD_FORMAT_VERSION = '01';
const POI_METHOD_STATIC = '11'; // QR ใช้ซ้ำได้ (ไม่ระบุจำนวนเงิน)
const POI_METHOD_DYNAMIC = '12'; // QR ครั้งเดียว (ระบุจำนวนเงิน)
const GUID_PROMPTPAY = 'A000000677010111';
const COUNTRY_TH = 'TH';
const CURRENCY_THB = '764';

/** ประกอบ TLV หนึ่งชุด: tag + ความยาว (เติม 0 ให้ครบ 2 หลัก) + ค่า */
const tlv = (id: string, value: string): string =>
  `${id}${value.length.toString().padStart(2, '0')}${value}`;

/**
 * แปลงเลขพร้อมเพย์ที่ผู้ใช้กรอกให้อยู่ในรูปแบบมาตรฐาน
 * - เบอร์มือถือ 10 หลัก (08xxxxxxxx) → 0066 + 9 หลักท้าย = 13 หลัก
 * - เลขบัตรประชาชน / เลขผู้เสียภาษี 13 หลัก → ใช้ตรง ๆ
 * - e-Wallet ID 15 หลัก → ใช้ตรง ๆ
 */
export const normalizePromptPayTarget = (
  raw: string
): { value: string; type: PromptPayTargetType } | null => {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 15) return { value: digits, type: 'ewallet' };
  if (digits.length === 13) return { value: digits, type: 'national_id' };

  // เบอร์โทรไทย: 0812345678 หรือ 66812345678 หรือ 812345678
  const local = digits.replace(/^66/, '').replace(/^0/, '');
  if (local.length === 9) return { value: `0066${local}`, type: 'mobile' };

  return null;
};

/** CRC-16/CCITT-FALSE — ท้าย payload ตามสเปก EMVCo */
export const crc16 = (input: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

/**
 * สร้าง PromptPay payload string
 * @param target เลขพร้อมเพย์ผู้รับเงิน (เบอร์โทร / เลขผู้เสียภาษี / e-Wallet)
 * @param amount จำนวนเงิน (บาท) — ไม่ใส่ = QR แบบกรอกยอดเอง
 */
export const generatePromptPayPayload = (target: string, amount?: number): string => {
  const normalized = normalizePromptPayTarget(target);
  if (!normalized) {
    throw new Error('รูปแบบหมายเลขพร้อมเพย์ไม่ถูกต้อง (ต้องเป็นเบอร์โทร 10 หลัก หรือเลขผู้เสียภาษี 13 หลัก)');
  }

  // sub-tag ภายใน tag 29: 01=เบอร์มือถือ, 02=เลขประจำตัว, 03=e-Wallet
  const subTag = normalized.type === 'mobile' ? '01' : normalized.type === 'national_id' ? '02' : '03';

  const hasAmount = typeof amount === 'number' && amount > 0;

  const merchantInfo = tlv(ID_MERCHANT_INFO_BOT, tlv('00', GUID_PROMPTPAY) + tlv(subTag, normalized.value));

  // เรียงตาม tag id จากน้อยไปมากตามสเปก: 00, 01, 29, 53, 54, 58, 63
  let payload =
    tlv(ID_PAYLOAD_FORMAT, PAYLOAD_FORMAT_VERSION) +
    tlv(ID_POI_METHOD, hasAmount ? POI_METHOD_DYNAMIC : POI_METHOD_STATIC) +
    merchantInfo +
    tlv(ID_CURRENCY, CURRENCY_THB);

  if (hasAmount) {
    payload += tlv(ID_AMOUNT, amount.toFixed(2));
  }

  payload += tlv(ID_COUNTRY, COUNTRY_TH);

  // CRC คำนวณจาก payload ที่ต่อ "6304" ไว้แล้ว
  payload += `${ID_CRC}04`;
  return payload + crc16(payload);
};

/** ตรวจว่าเลขพร้อมเพย์ที่กรอกใช้สร้าง QR ได้จริงหรือไม่ */
export const isValidPromptPayTarget = (raw: string): boolean =>
  normalizePromptPayTarget(raw) !== null;

/**
 * URL รูป QR สำหรับแสดงผล
 * หมายเหตุ: ใช้บริการ render ภายนอกเพื่อความง่ายในเฟสนี้ (payload คำนวณฝั่งเราเอง)
 * ถ้าต้องการ offline 100% ให้เปลี่ยนไปใช้ไลบรารี qrcode.react แล้วส่ง payload เข้าไปตรง ๆ
 */
export const promptPayQrImageUrl = (payload: string, size = 300): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&data=${encodeURIComponent(payload)}`;

/** จัดรูปแบบเลขพร้อมเพย์ให้อ่านง่าย เช่น 081-234-5678 */
export const formatPromptPayDisplay = (raw: string): string => {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 13)
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  return raw;
};
