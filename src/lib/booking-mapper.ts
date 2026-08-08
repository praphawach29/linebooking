import type { Booking, BookingStatus, Court, PaymentMethod, Service, Staff } from '../types';
import type { BookingApiResponse } from './booking-api';

export function mapBookingApiResponse(
  response: BookingApiResponse,
  service?: Service,
  staff?: Staff,
  court?: Court,
): Booking {
  return {
    id: response.id,
    refNo: response.refNo,
    tenantId: response.tenantId,
    userId: response.userId,
    userName: response.userName,
    userPhone: response.userPhone || '',
    userAvatar: response.userAvatar || undefined,
    serviceId: response.serviceId,
    serviceName: response.serviceName || service?.name || '',
    serviceDuration: response.serviceDuration ?? service?.durationMinutes ?? 0,
    servicePrice: response.servicePrice ?? response.price,
    staffId: response.staffId || undefined,
    staffName: response.staffName || undefined,
    staffAvatar: staff?.avatarUrl,
    courtId: response.courtId || court?.id || undefined,
    courtName: response.courtName || court?.name || undefined,
    bookingDate: response.bookingDate,
    startTime: response.startTime,
    endTime: response.endTime,
    status: response.status as BookingStatus,
    price: response.price,
    discountAmount: response.discountAmount,
    finalPrice: response.finalPrice,
    depositAmount: response.depositAmount,
    paymentStatus: response.paymentStatus as Booking['paymentStatus'],
    paymentMethod: isPaymentMethod(response.paymentMethod)
      ? response.paymentMethod
      : undefined,
    source: response.source as Booking['source'],
    notes: response.notes || undefined,
    cancellationReason: response.cancellationReason || undefined,
    cancelledAt: response.cancelledAt || undefined,
    checkedInAt: response.checkedInAt || undefined,
    completedAt: response.completedAt || undefined,
    createdAt: response.createdAt,
  };
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    value === 'promptpay' ||
    value === 'credit_card' ||
    value === 'cash' ||
    value === 'transfer'
  );
}
