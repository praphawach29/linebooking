export type BookingActor = 'customer' | 'merchant';

export interface CreateBookingCommand {
  actor: BookingActor;
  tenantId: string;
  customerUserId: string;
  serviceId: string;
  staffId?: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}
