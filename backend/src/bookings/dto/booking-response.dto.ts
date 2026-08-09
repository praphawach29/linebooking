export interface AvailableSlotDto {
  startTime: string;
  endTime: string;
  staffId: string | null;
  courtId?: string | null;
  available: boolean;
}

export interface AvailableSlotsResponseDto {
  bookingDate: string;
  timezone: string;
  slotIntervalMinutes: number;
  slots: AvailableSlotDto[];
}

export interface BookingResponseDto {
  id: string;
  refNo: string;
  tenantId: string;
  userId: string;
  userName: string;
  userPhone?: string | null;
  userAvatar?: string | null;
  serviceId: string;
  serviceName?: string | null;
  serviceDuration?: number | null;
  servicePrice?: number | null;
  staffId?: string | null;
  staffName?: string | null;
  courtId?: string | null;
  courtName?: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: string;
  price: number;
  discountAmount: number;
  finalPrice: number;
  depositAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentSlipUrl?: string | null;
  paymentSlipUploadedAt?: string | null;
  source: string;
  notes?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  checkedInAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  pointsEarned?: number;
  packageRemaining?: number;
}
