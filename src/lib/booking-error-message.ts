import { BookingApiError } from './booking-api';
import { BookingAuthError } from './booking-auth';

const bookingErrorMessages: Record<string, string> = {
  BOOKING_SLOT_UNAVAILABLE: 'ช่วงเวลาที่เลือกไม่ว่างแล้ว กรุณากลับไปเลือกเวลาใหม่',
  BOOKING_OUTSIDE_BUSINESS_HOURS: 'ช่วงเวลาที่เลือกอยู่นอกเวลาทำการของร้าน',
  BOOKING_IN_PAST: 'วันหรือเวลาที่เลือกผ่านไปแล้ว กรุณาเลือกเวลาใหม่',
  BOOKING_TOO_SOON: 'เวลาที่เลือกกระชั้นเกินกว่าระยะเวลาจองล่วงหน้าที่ร้านกำหนด',
  BOOKING_TOO_FAR_AHEAD: 'วันที่เลือกไกลเกินกว่าระยะเวลาจองล่วงหน้าที่ร้านกำหนด',
  AUTH_REQUIRED: 'กรุณาเข้าสู่ระบบ LINE ใหม่ก่อนยืนยันการจอง',
  AUTH_INVALID: 'เซสชัน LINE ไม่ถูกต้องหรือหมดอายุ กรุณาเปิด LIFF จาก LINE ใหม่',
  AUTH_PROVIDER_UNAVAILABLE: 'ไม่สามารถตรวจสอบบัญชี LINE ได้ชั่วคราว กรุณาลองอีกครั้ง',
  LINE_ID_TOKEN_UNAVAILABLE: 'ไม่พบสิทธิ์ยืนยันตัวตน LINE กรุณาเปิด LIFF จาก LINE ใหม่',
  LIFF_LOGIN_REDIRECT_STARTED: 'กำลังนำไปเข้าสู่ระบบ LINE กรุณาลองยืนยันอีกครั้งหลังเข้าสู่ระบบ',
  LIFF_ID_NOT_CONFIGURED: 'ร้านค้ายังตั้งค่า LIFF ID ไม่ครบ กรุณาติดต่อร้านค้า',
  CUSTOMER_NOT_FOUND: 'ไม่พบข้อมูลลูกค้าสำหรับร้านนี้ กรุณาเปิด LIFF จาก LINE ใหม่',
  SERVICE_NOT_FOUND: 'ไม่พบบริการที่เลือก กรุณากลับไปเลือกบริการใหม่',
  RESOURCE_NOT_FOUND: 'ไม่พบสนามหรือพนักงานที่เลือก กรุณากลับไปเลือกใหม่',
  VALIDATION_FAILED: 'ข้อมูลการจองไม่ครบหรือไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่',
  REQUEST_TIMEOUT: 'การเชื่อมต่อใช้เวลานานกว่าปกติ กรุณาลองใหม่อีกครั้ง',
  NETWORK_ERROR: 'ไม่สามารถเชื่อมต่อระบบจองได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
  PAYLOAD_TOO_LARGE: 'ไฟล์รูปสลิปมีขนาดใหญ่เกินไป กรุณาลดขนาดแล้วลองใหม่',
};

export function getBookingSubmitErrorMessage(error: unknown): string {
  if (error instanceof BookingApiError || error instanceof BookingAuthError) {
    const message = bookingErrorMessages[error.code] || 'ระบบไม่สามารถยืนยันการจองได้ กรุณาลองอีกครั้ง';
    return `${message} (รหัส: ${error.code})`;
  }

  if (error instanceof TypeError) {
    return 'ไม่สามารถเชื่อมต่อระบบจองได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง (รหัส: NETWORK_ERROR)';
  }

  return 'ระบบไม่สามารถยืนยันการจองได้ กรุณาลองอีกครั้ง (รหัส: UNKNOWN_ERROR)';
}
