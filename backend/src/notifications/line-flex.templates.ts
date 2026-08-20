import { LineBookingEvent } from './notifications.types';

type BookingForFlex = {
  ref_no: string;
  service_name: string | null;
  court_name: string | null;
  bookingDate: Date;
  startTime: Date;
  endTime: Date;
  finalPrice: unknown;
  pointsEarned?: number;
  packageRemaining?: number;
};

const EVENT_COPY: Record<LineBookingEvent, { title: string; color: string }> = {
  booking_created: { title: 'รับคำขอจองแล้ว', color: '#D97706' },
  payment_confirmed: { title: 'ยืนยันการชำระเงินแล้ว', color: '#0284C7' },
  booking_confirmed: { title: 'ยืนยันการจองแล้ว', color: '#059669' },
  booking_checked_in: { title: 'เช็กอินเรียบร้อยแล้ว', color: '#0F766E' },
  booking_rescheduled: { title: 'เลื่อนเวลาจองแล้ว', color: '#2563EB' },
  booking_cancelled: { title: 'ยกเลิกการจองแล้ว', color: '#DC2626' },
  booking_reminder: { title: 'แจ้งเตือนนัดหมายใกล้ถึงเวลา', color: '#6366F1' },
};

// Prisma maps PostgreSQL `time` values to a Date anchored at 1970-01-01 UTC.
// The UTC fields are the intended wall-clock booking time, not an instant to
// convert into the tenant timezone.
const time = (value: Date) =>
  `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;

export function buildBookingFlexMessage(
  event: LineBookingEvent,
  booking: BookingForFlex,
  tenantName: string,
  liffId?: string | null,
): Record<string, unknown> {
  const copy = EVENT_COPY[event];
  const date = new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(booking.bookingDate);
  const details = [
    {
      type: 'text',
      text: booking.service_name || 'บริการ',
      weight: 'bold',
      size: 'md',
      wrap: true,
    },
    {
      type: 'text',
      text: `${date} เวลา ${time(booking.startTime)} - ${time(booking.endTime)} น.`,
      size: 'sm',
      color: '#475569',
      wrap: true,
    },
    ...(booking.court_name
      ? [
          {
            type: 'text',
            text: `สนาม: ${booking.court_name}`,
            size: 'sm',
            color: '#475569',
            wrap: true,
          },
        ]
      : []),
    {
      type: 'text',
      text: `รหัสจอง #${booking.ref_no}`,
      size: 'xs',
      color: '#64748B',
      margin: 'md',
    },
  ];

  if (booking.packageRemaining !== undefined) {
    details.push({
      type: 'text',
      text: `ใช้แพ็กเกจแล้ว คงเหลือ ${booking.packageRemaining} ครั้ง`,
      size: 'sm',
      color: '#0284C7',
      weight: 'bold',
      margin: 'md',
    } as any);
  }

  if (booking.pointsEarned) {
    details.push({
      type: 'text',
      text: `ได้รับคะแนนสะสมเพิ่ม ${booking.pointsEarned} แต้ม`,
      size: 'sm',
      color: '#059669',
      weight: 'bold',
      margin: booking.packageRemaining !== undefined ? 'sm' : 'md',
    } as any);
  }

  const bubble: Record<string, unknown> = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: copy.color,
      paddingAll: '18px',
      contents: [
        {
          type: 'text',
          text: tenantName,
          color: '#FFFFFF',
          size: 'sm',
          weight: 'bold',
        },
        {
          type: 'text',
          text: copy.title,
          color: '#FFFFFF',
          size: 'xl',
          weight: 'bold',
          margin: 'sm',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '18px',
      contents: details,
    },
  };

  if (liffId) {
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      paddingAll: '14px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#059669',
          action: {
            type: 'uri',
            label: 'ดูรายการจอง',
            uri: `https://liff.line.me/${liffId}`,
          },
        },
      ],
    };
  }

  return {
    type: 'flex',
    altText: `${copy.title}: ${booking.service_name || 'บริการ'}`,
    contents: bubble,
  };
}
