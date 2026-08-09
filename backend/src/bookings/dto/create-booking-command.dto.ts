export type BookingActor = 'customer' | 'merchant';

export interface CreateBookingCommand {
  actor: BookingActor;
  tenantId: string;
  customerUserId: string;
  serviceId: string;
  staffId?: string;
  courtId?: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm
  bookingHours?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod?: string;
  depositPaid?: boolean;
  paymentSlipUrl?: string;
}
