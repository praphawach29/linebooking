export type BookingFlowMode =
  | 'service_staff_time'
  | 'service_time_only'
  | 'sports_court_time';

export const VALID_BOOKING_FLOW_MODES: BookingFlowMode[] = [
  'service_staff_time',
  'service_time_only',
  'sports_court_time',
];
