import { Booking, ServiceAddon, SelectedAddon, BusinessHour, Staff } from '../types';

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export interface BookingSubmissionPayload {
  tenantId: string;
  serviceId: string;
  serviceName: string;
  staffId?: string;
  staffName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  price: number;
  depositAmount: number;
  notes?: string;
  addons?: ServiceAddon[];
}

export class BookingService {
  /**
   * Calculates available time slots for a specified service, staff, and date based on
   * merchant business hours, staff working schedule, and existing bookings.
   */
  public static getAvailableSlots(
    serviceDurationMinutes: number,
    staffId: string | null,
    dateStr: string, // YYYY-MM-DD
    existingBookings: Booking[],
    businessHours: BusinessHour[] = [],
    staffs: Staff[] = []
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Parse date day of week (0=Sun, 1=Mon, ..., 6=Sat)
    const targetDate = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = targetDate.getDay();

    // Check merchant business hours for this day
    const dayBizHour = businessHours.find((b) => b.dayOfWeek === dayOfWeek);
    let startHour = 9;
    let endHour = 19;

    if (dayBizHour) {
      if (!dayBizHour.isOpen) {
        return [{ time: '09:00', available: false, reason: 'ร้านปิดทำการในวันนี้' }];
      }
      startHour = parseInt(dayBizHour.openTime.split(':')[0], 10);
      endHour = parseInt(dayBizHour.closeTime.split(':')[0], 10);
    }

    // Check staff availability if staff is selected
    if (staffId && staffId !== 'any') {
      const staffMember = staffs.find((s) => s.id === staffId);
      if (staffMember) {
        if (staffMember.workingDays && !staffMember.workingDays.includes(dayOfWeek)) {
          return [{ time: '09:00', available: false, reason: 'ช่างท่านนี้หยุดปฏิบัติงานในวันนี้' }];
        }
        if (staffMember.workStartTime) {
          startHour = Math.max(startHour, parseInt(staffMember.workStartTime.split(':')[0], 10));
        }
        if (staffMember.workEndTime) {
          endHour = Math.min(endHour, parseInt(staffMember.workEndTime.split(':')[0], 10));
        }
      }
    }

    // Generate slots every 30 minutes
    const now = new Date();
    const isToday = targetDate.toDateString() === now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let h = startHour; h < endHour; h++) {
      for (const m of [0, 30]) {
        const slotMinutes = h * 60 + m;
        const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        // If today, check if time has passed
        if (isToday && slotMinutes <= currentMinutes + 30) {
          slots.push({ time: timeFormatted, available: false, reason: 'เลยเวลาเปิดจองแล้ว' });
          continue;
        }

        // Check slot duration overflow beyond business close time
        if (slotMinutes + serviceDurationMinutes > endHour * 60) {
          slots.push({ time: timeFormatted, available: false, reason: 'เกินเวลาปิดทำการของร้าน' });
          continue;
        }

        // Check existing booking conflicts
        const slotEndMinutes = slotMinutes + serviceDurationMinutes;
        const hasConflict = existingBookings.some((b) => {
          if (b.status === 'cancelled') return false;
          if (b.bookingDate !== dateStr) return false;

          // If a specific staff was picked, filter by staff
          if (staffId && staffId !== 'any' && b.staffId !== staffId) {
            return false;
          }

          const [bStartH, bStartM] = b.startTime.split(':').map(Number);
          const [bEndH, bEndM] = b.endTime.split(':').map(Number);

          const bStartMinutes = bStartH * 60 + bStartM;
          const bEndMinutes = bEndH * 60 + bEndM;

          // Overlap condition: (StartA < EndB) && (EndA > StartB)
          return slotMinutes < bEndMinutes && slotEndMinutes > bStartMinutes;
        });

        if (hasConflict) {
          slots.push({ time: timeFormatted, available: false, reason: 'คิวซ้ำกับลูกค้ารายอื่น' });
        } else {
          slots.push({ time: timeFormatted, available: true });
        }
      }
    }

    return slots;
  }

  /**
   * Calculates total price, deposit amount, and total duration with selected add-ons.
   */
  public static calculateTotals(
    basePrice: number,
    baseDurationMinutes: number,
    depositPercentage: number,
    selectedAddons: ServiceAddon[] = []
  ) {
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
    const addonsDuration = selectedAddons.reduce((sum, a) => sum + (a.extraDurationMinutes || 0), 0);

    const totalPrice = basePrice + addonsTotal;
    const totalDurationMinutes = baseDurationMinutes + addonsDuration;
    const depositAmount = Math.round((totalPrice * depositPercentage) / 100);
    const remainingAmount = Math.max(0, totalPrice - depositAmount);

    return {
      basePrice,
      addonsTotal,
      totalPrice,
      totalDurationMinutes,
      depositAmount,
      remainingAmount,
      depositPercentage,
    };
  }

  /**
   * Submits a new booking request to backend service API or context.
   */
  public static async submitBookingRequest(
    payload: BookingSubmissionPayload
  ): Promise<{ success: boolean; booking: Booking; message: string }> {
    // Simulate network API request latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    const refNo = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

    const [startH, startM] = payload.startTime.split(':').map(Number);
    const totalMinutes = startH * 60 + startM + payload.durationMinutes;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const formattedAddons: SelectedAddon[] = (payload.addons || []).map((a) => ({
      id: `sa-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      addonId: a.id,
      name: a.name,
      price: a.price,
      extraDurationMinutes: a.extraDurationMinutes,
    }));

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      tenantId: payload.tenantId,
      refNo,
      userId: 'usr-liff-current',
      userName: payload.customerName,
      userPhone: payload.customerPhone,
      serviceId: payload.serviceId,
      serviceName: payload.serviceName,
      serviceDuration: payload.durationMinutes,
      servicePrice: payload.price,
      staffId: payload.staffId || 'staff-any',
      staffName: payload.staffName || 'ช่างคนใดก็ได้',
      bookingDate: payload.bookingDate,
      startTime: payload.startTime,
      endTime: endTimeStr,
      status: payload.depositAmount > 0 ? 'pending' : 'confirmed',
      depositAmount: payload.depositAmount,
      price: payload.price,
      discountAmount: 0,
      finalPrice: payload.price,
      paymentStatus: payload.depositAmount > 0 ? 'unpaid' : 'paid',
      paymentMethod: 'promptpay',
      source: 'line_liff',
      notes: payload.notes,
      addons: formattedAddons,
      addonsTotalPrice: formattedAddons.reduce((acc, curr) => acc + curr.price, 0),
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      booking: newBooking,
      message: 'สร้างคำขอจองคิวสำเร็จเรียบร้อยแล้ว',
    };
  }
}

