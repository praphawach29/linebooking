import { BusinessHour, OperatingSchedule } from '../types';

/**
 * One-line Thai summary of the shop's default business hours, shown next
 * to the "custom schedule" toggle so merchants can see what they're
 * overriding before they turn it on — instead of guessing what "ใช้ตามร้านค้า"
 * (use the shop's default) actually means.
 */
export function summarizeBusinessHours(businessHours: BusinessHour[]): string {
  const openDays = businessHours.filter((h) => h.isOpen);
  if (openDays.length === 0) {
    return 'ร้านยังไม่ได้ตั้งเวลาทำการ — ตั้งค่าได้ที่หน้า "ข้อมูลร้านค้า & โลโก้"';
  }

  const timeKey = (h: BusinessHour) => `${h.openTime}-${h.closeTime}`;
  const uniqueTimes = new Set(openDays.map(timeKey));
  const sample = openDays[0];

  if (uniqueTimes.size === 1) {
    return openDays.length === 7
      ? `ตอนนี้ใช้เวลาร้าน: ทุกวัน ${sample.openTime}-${sample.closeTime} น.`
      : `ตอนนี้ใช้เวลาร้าน: ${openDays.length} วัน/สัปดาห์ เวลา ${sample.openTime}-${sample.closeTime} น.`;
  }

  return 'ตอนนี้ใช้เวลาร้าน: เวลาเปิด-ปิดต่างกันในแต่ละวัน (ดูรายละเอียดที่หน้าตั้งค่าร้านค้า)';
}

/** No days selected while "custom" is on means the item can never be booked, every day, silently. */
export function isOperatingScheduleMissingDays(schedule?: OperatingSchedule | null): boolean {
  return !!schedule?.isCustom && (!schedule.days || schedule.days.length === 0);
}
