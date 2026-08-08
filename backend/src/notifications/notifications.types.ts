export const NOTIFICATIONS_QUEUE = 'notifications';

export type LineBookingEvent =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_checked_in'
  | 'booking_rescheduled'
  | 'booking_cancelled';

export type LineQuotaWarningLevel =
  'normal' | 'notice' | 'warning' | 'critical' | 'exceeded';

export interface LineQuotaStatus {
  period: string;
  quotaType: 'limited' | 'none';
  limit: number | null;
  usage: number;
  remaining: number | null;
  percentage: number | null;
  warningLevel: LineQuotaWarningLevel;
  source: 'line' | 'snapshot' | 'local';
  sendingBlocked: false;
  fetchedAt: string;
}
