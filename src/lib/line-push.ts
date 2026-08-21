import { Booking } from '../types';

export type LineBookingEvent =
  | 'booking_created'
  | 'payment_confirmed'
  | 'booking_confirmed'
  | 'booking_checked_in'
  | 'booking_rescheduled'
  | 'booking_cancelled'
  | 'booking_reminder';

const EVENT_COPY: Record<LineBookingEvent, { title: string; color: string; badge: string }> = {
  booking_created: { title: 'รับคำขอจองแล้ว', color: '#D97706', badge: '⏳ รอยืนยันคิว' },
  payment_confirmed: { title: 'ยืนยันการชำระเงินแล้ว', color: '#0284C7', badge: '💳 ชำระมัดจำแล้ว' },
  booking_confirmed: { title: 'ยืนยันการจองเรียบร้อย', color: '#059669', badge: '🎟️ คิวพร้อมรับบริการ' },
  booking_checked_in: { title: 'เช็กอินเรียบร้อยแล้ว', color: '#0F766E', badge: '✅ เข้ารับบริการแล้ว' },
  booking_rescheduled: { title: 'เลื่อนเวลานัดหมายแล้ว', color: '#2563EB', badge: '📅 เปลี่ยนเวลานัด' },
  booking_cancelled: { title: 'ยกเลิกการจองแล้ว', color: '#DC2626', badge: '❌ ยกเลิกแล้ว' },
  booking_reminder: { title: 'เตือนความจำนัดหมาย', color: '#6366F1', badge: '⏰ นัดหมายใกล้ถึงเวลา' },
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_DAYS = ['วันอาทิตย์ที่', 'วันจันทร์ที่', 'วันอังคารที่', 'วันพุธที่', 'วันพฤหัสบดีที่', 'วันศุกร์ที่', 'วันเสาร์ที่'];

export function formatThaiBookingDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10) + 543;
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(dateStr);
      const dayName = !isNaN(d.getDay()) ? THAI_DAYS[d.getDay()] : 'วันที่';
      const monthName = THAI_MONTHS[monthIdx] || parts[1];
      return `${dayName} ${day} ${monthName} ${year}`;
    }
  } catch (e) {
    // ignore
  }
  return dateStr;
}

export function buildBookingFlexMessage(
  event: LineBookingEvent,
  booking: Booking & { serviceImageUrl?: string },
  tenantName: string,
  liffId?: string | null,
): Record<string, unknown> {
  const copy = EVENT_COPY[event];
  const thaiDate = formatThaiBookingDate(booking.bookingDate);

  // Determine hero banner image (service image, or curated sports/service photo)
  const heroImageUrl =
    booking.serviceImageUrl ||
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80';

  const details: any[] = [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: booking.serviceName || 'บริการ',
          weight: 'bold',
          size: 'lg',
          color: '#1E293B',
          wrap: true,
          flex: 1,
        },
      ],
    },
    {
      type: 'box',
      layout: 'vertical',
      spacing: 'xs',
      margin: 'md',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '📅 วันที่:',
              size: 'sm',
              color: '#64748B',
              flex: 0,
            },
            {
              type: 'text',
              text: thaiDate,
              size: 'sm',
              color: '#0F172A',
              weight: 'bold',
              flex: 1,
              wrap: true,
            },
          ],
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: '⏰ เวลา:',
              size: 'sm',
              color: '#64748B',
              flex: 0,
            },
            {
              type: 'text',
              text: `${booking.startTime} - ${booking.endTime} น.`,
              size: 'sm',
              color: '#0F172A',
              weight: 'bold',
              flex: 1,
            },
          ],
        },
        ...(booking.courtName
          ? [
              {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '🏟️ สถานที่:',
                    size: 'sm',
                    color: '#64748B',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: booking.courtName,
                    size: 'sm',
                    color: '#0F172A',
                    weight: 'bold',
                    flex: 1,
                  },
                ],
              },
            ]
          : []),
        ...(booking.staffName
          ? [
              {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '👤 ผู้ดูแล:',
                    size: 'sm',
                    color: '#64748B',
                    flex: 0,
                  },
                  {
                    type: 'text',
                    text: booking.staffName,
                    size: 'sm',
                    color: '#0F172A',
                    weight: 'bold',
                    flex: 1,
                  },
                ],
              },
            ]
          : []),
      ],
    },
    {
      type: 'separator',
      margin: 'lg',
      color: '#E2E8F0',
    },
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: 'ยอดชำระทั้งหมด',
          size: 'xs',
          color: '#64748B',
        },
        {
          type: 'text',
          text: `฿${(booking.finalPrice || booking.price || 0).toLocaleString()}`,
          size: 'sm',
          color: '#059669',
          weight: 'bold',
          align: 'end',
        },
      ],
    },
    ...(booking.depositAmount && booking.depositAmount > 0
      ? [
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              {
                type: 'text',
                text: 'มัดจำที่ชำระ',
                size: 'xs',
                color: '#64748B',
              },
              {
                type: 'text',
                text: `฿${booking.depositAmount.toLocaleString()}`,
                size: 'xs',
                color: '#0284C7',
                weight: 'bold',
                align: 'end',
              },
            ],
          },
        ]
      : []),
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: `รหัสการจอง: #${booking.refNo}`,
          size: 'xxs',
          color: '#94A3B8',
          flex: 1,
        },
        {
          type: 'text',
          text: copy.badge,
          size: 'xxs',
          color: copy.color,
          weight: 'bold',
          align: 'end',
          flex: 0,
        },
      ],
    },
  ];

  const bubble: Record<string, unknown> = {
    type: 'bubble',
    hero: {
      type: 'image',
      url: heroImageUrl,
      size: 'full',
      aspectRatio: '20:11',
      aspectMode: 'cover',
    },
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: copy.color,
      paddingAll: '16px',
      contents: [
        {
          type: 'text',
          text: tenantName,
          color: '#FFFFFF',
          size: 'xs',
          weight: 'bold',
          opacity: '90%',
        },
        {
          type: 'text',
          text: copy.title,
          color: '#FFFFFF',
          size: 'xl',
          weight: 'bold',
          margin: 'xs',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'none',
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
          height: 'sm',
          action: {
            type: 'uri',
            label: event === 'booking_confirmed' ? '🎟️ ดูบัตรคิวและ QR เช็กอิน' : 'ดูรายการจองของฉัน',
            uri: `https://liff.line.me/${liffId}/my-bookings`,
          },
        },
      ],
    };
  }

  return {
    type: 'flex',
    altText: `${copy.title}: ${booking.serviceName || 'บริการ'} (รหัส #${booking.refNo})`,
    contents: bubble,
  };
}

export async function sendLineFlexPush(
  channelAccessToken: string | undefined | null,
  toUserId: string,
  flexMessage: Record<string, unknown>,
  tenantId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!toUserId) {
    return { success: false, error: 'Missing toUserId' };
  }
  if (!channelAccessToken && !tenantId) {
    return { success: false, error: 'Missing channelAccessToken and tenantId' };
  }

  try {
    const res = await fetch('/api/line-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: channelAccessToken ? channelAccessToken.trim() : undefined,
        tenantId,
        to: toUserId.trim(),
        messages: [flexMessage],
      }),
    });

    if (res.ok) {
      return { success: true };
    }

    const data = await res.json().catch(() => null);
    console.warn('LINE push serverless error:', data);
    return { success: false, error: data?.message || `HTTP ${res.status}` };
  } catch (err: any) {
    console.warn('LINE push request failed:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}
