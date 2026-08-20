import { Booking } from '../types';

export type LineBookingEvent =
  | 'booking_created'
  | 'payment_confirmed'
  | 'booking_confirmed'
  | 'booking_checked_in'
  | 'booking_rescheduled'
  | 'booking_cancelled'
  | 'booking_reminder';

const EVENT_COPY: Record<LineBookingEvent, { title: string; color: string }> = {
  booking_created: { title: 'รับคำขอจองแล้ว', color: '#D97706' },
  payment_confirmed: { title: 'ยืนยันการชำระเงินแล้ว', color: '#0284C7' },
  booking_confirmed: { title: 'ยืนยันการจองแล้ว', color: '#059669' },
  booking_checked_in: { title: 'เช็กอินเรียบร้อยแล้ว', color: '#0F766E' },
  booking_rescheduled: { title: 'เลื่อนเวลาจองแล้ว', color: '#2563EB' },
  booking_cancelled: { title: 'ยกเลิกการจองแล้ว', color: '#DC2626' },
  booking_reminder: { title: 'แจ้งเตือนนัดหมายใกล้ถึงเวลา', color: '#6366F1' },
};

export function buildBookingFlexMessage(
  event: LineBookingEvent,
  booking: Booking,
  tenantName: string,
  liffId?: string | null,
): Record<string, unknown> {
  const copy = EVENT_COPY[event];
  const details: any[] = [
    {
      type: 'text',
      text: booking.serviceName || 'บริการ',
      weight: 'bold',
      size: 'md',
      wrap: true,
    },
    {
      type: 'text',
      text: `${booking.bookingDate} เวลา ${booking.startTime} - ${booking.endTime} น.`,
      size: 'sm',
      color: '#475569',
      wrap: true,
    },
  ];

  if (booking.courtName) {
    details.push({
      type: 'text',
      text: `สนาม: ${booking.courtName}`,
      size: 'sm',
      color: '#475569',
      wrap: true,
    });
  } else if (booking.staffName) {
    details.push({
      type: 'text',
      text: `ผู้ให้บริการ: ${booking.staffName}`,
      size: 'sm',
      color: '#475569',
      wrap: true,
    });
  }

  details.push({
    type: 'text',
    text: `รหัสจอง #${booking.refNo}`,
    size: 'xs',
    color: '#64748B',
    margin: 'md',
  });

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
            label: 'ดูรายการจองของฉัน',
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
  channelAccessToken: string,
  toUserId: string,
  flexMessage: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  if (!channelAccessToken || !toUserId) {
    return { success: false, error: 'Missing channelAccessToken or toUserId' };
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken.trim()}`,
      },
      body: JSON.stringify({
        to: toUserId.trim(),
        messages: [flexMessage],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.warn('LINE Messaging API push error:', data);
      return { success: false, error: data?.message || `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('LINE push request failed:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}
