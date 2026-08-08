import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { CreateBookingCommand } from './dto/create-booking-command.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { ErrorCode } from '../common/constants/error-codes';

type BookingPayload = Prisma.BookingGetPayload<Record<string, never>>;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async getCustomerBookings(
    tenantId: string,
    customerUserId: string,
  ): Promise<BookingResponseDto[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { tenantId, userId: customerUserId },
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
      take: 100,
    });

    return bookings.map((booking) => this.toBookingResponse(booking));
  }

  async updateBookingStatusAsMerchant(
    tenantId: string,
    bookingId: string,
    status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show',
    reason?: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
    });
    if (!booking) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.BOOKING_NOT_FOUND,
        message: 'Booking not found for this tenant',
      });
    }

    if (booking.status === status) return this.toBookingResponse(booking);

    const transitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['checked_in', 'completed', 'cancelled', 'no_show'],
      checked_in: ['completed', 'cancelled'],
    };
    if (!transitions[booking.status || 'pending']?.includes(status)) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.INVALID_BOOKING_STATUS,
        message: `Cannot change booking status from ${booking.status} to ${status}`,
      });
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status,
          cancellationReason:
            status === 'cancelled' ? reason?.trim() || null : undefined,
          cancelledAt: status === 'cancelled' ? now : undefined,
          checkedInAt: status === 'checked_in' ? now : undefined,
          completedAt: status === 'completed' ? now : undefined,
        },
      });

      let pointsEarned = 0;
      let packageRemaining: number | undefined;

      if (status === 'checked_in') {
        const loyaltySettings = await tx.tenantLoyaltySettings.findUnique({
          where: { tenantId: booking.tenantId! },
        });

        if (loyaltySettings) {
          // 1. Package Deduction
          if (loyaltySettings.enablePackageDeduction) {
            const activePackages = await tx.customerPackage.findMany({
              where: {
                tenantId: booking.tenantId!,
                userId: booking.userId!,
                status: 'ACTIVE',
                OR: [
                  { serviceId: booking.serviceId },
                  { serviceId: null },
                ],
              },
              orderBy: { createdAt: 'asc' },
            });
            
            const packageToUse = activePackages.find(p => p.usedQuota < p.totalQuota);

            if (packageToUse) {
              await tx.customerPackage.update({
                where: { id: packageToUse.id },
                data: { usedQuota: { increment: 1 } },
              });
              packageRemaining = packageToUse.totalQuota - (packageToUse.usedQuota + 1);
            }
          }

          // 2. Loyalty Points
          if (loyaltySettings.pointStrategy !== 'DISABLED') {
            if (loyaltySettings.pointStrategy === 'PER_VISIT') {
              pointsEarned = loyaltySettings.pointsPerVisit;
            } else if (loyaltySettings.pointStrategy === 'PER_CURRENCY') {
              const amount = updated.finalPrice?.toNumber() || 0;
              const ratio = loyaltySettings.currencyAmount || 1;
              pointsEarned = Math.floor(amount / ratio) * loyaltySettings.pointsPerCurrency;
            }

            if (pointsEarned > 0) {
              let membership = await tx.membership.findUnique({
                where: {
                  tenantId_userId: {
                    tenantId: booking.tenantId!,
                    userId: booking.userId!,
                  }
                },
              });

              if (!membership) {
                membership = await tx.membership.create({
                  data: {
                    tenantId: booking.tenantId!,
                    userId: booking.userId!,
                    points: pointsEarned,
                    totalPointsEarned: pointsEarned,
                  },
                });
              } else {
                membership = await tx.membership.update({
                  where: { id: membership.id },
                  data: {
                    points: { increment: pointsEarned },
                    totalPointsEarned: { increment: pointsEarned },
                  },
                });
              }

              await tx.pointTransaction.create({
                data: {
                  membershipId: membership.id,
                  bookingId: booking.id,
                  points: pointsEarned,
                  type: 'EARNED',
                  description: `Points for booking ${booking.ref_no}`,
                },
              });
            }
          }
        }
      }

      const response = this.toBookingResponse(updated);
      if (pointsEarned > 0) response.pointsEarned = pointsEarned;
      if (packageRemaining !== undefined) response.packageRemaining = packageRemaining;
      
      // Attempt to queue a booking event if it's checked_in (to send Line Flex)
      if (status === 'checked_in') {
        try {
           // We might not have access to notificationsService directly in transaction, but it's okay to call it outside or async
           // Actually, we shouldn't await it if it delays transaction, but NestJS service will handle it
           // Let's defer notification to controller if not available here, but currently where does the LINE flex send?
           // The controller calls checkInBookingAsMerchant, which calls this method.
        } catch (error) {}
      }
      
      return response;
    });
  }

  async checkInBookingAsMerchant(
    tenantId: string,
    rawCode: string,
  ): Promise<BookingResponseDto> {
    const refNo = rawCode
      .trim()
      .replace(/^CHECKIN-/i, '')
      .replace(/^#/, '')
      .trim()
      .toUpperCase();

    if (!/^BK-[A-Z0-9-]+$/.test(refNo)) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid check-in QR code',
      });
    }

    const booking = await this.prisma.booking.findFirst({
      where: { ref_no: refNo, tenantId },
    });
    if (!booking) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.BOOKING_NOT_FOUND,
        message: 'Booking not found for this tenant',
      });
    }

    if (booking.status === 'checked_in') {
      return this.toBookingResponse(booking);
    }

    return this.updateBookingStatusAsMerchant(
      tenantId,
      booking.id,
      'checked_in',
    );
  }

  async rescheduleBookingAsMerchant(
    tenantId: string,
    bookingId: string,
    bookingDate: string,
    startTime: string,
  ): Promise<BookingResponseDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findFirst({
          where: { id: bookingId, tenantId },
        });
        if (!booking) {
          throw new NotFoundException({
            statusCode: 404,
            code: ErrorCode.BOOKING_NOT_FOUND,
            message: 'Booking not found for this tenant',
          });
        }
        if (!['pending', 'confirmed'].includes(booking.status || 'pending')) {
          throw new BadRequestException({
            statusCode: 400,
            code: ErrorCode.INVALID_BOOKING_STATUS,
            message: `Cannot reschedule booking with status ${booking.status}`,
          });
        }
        if (!booking.serviceId) {
          throw new NotFoundException({
            statusCode: 404,
            code: ErrorCode.SERVICE_NOT_FOUND,
            message: 'Booking service no longer exists',
          });
        }

        const availability = await this.availabilityService.calculateAvailability(
          tenantId,
          bookingDate,
          booking.serviceId,
          booking.staffId || undefined,
          {
            actor: 'merchant',
            txPrisma: tx,
            courtId: booking.court_id || undefined,
            excludeBookingId: booking.id,
          },
        );
        const slot = availability.slots.find(
          (candidate) => candidate.startTime === startTime && candidate.available,
        );
        if (!slot) {
          throw new ConflictException({
            statusCode: 409,
            code: ErrorCode.BOOKING_SLOT_UNAVAILABLE,
            message: 'Selected booking slot is no longer available',
          });
        }

        const [year, month, day] = bookingDate.split('-').map(Number);
        const updated = await tx.booking.update({
          where: { id: booking.id },
          data: {
            bookingDate: new Date(Date.UTC(year, month - 1, day)),
            startTime: new Date(`1970-01-01T${startTime}:00Z`),
            endTime: new Date(`1970-01-01T${slot.endTime}:00Z`),
            staffId: slot.staffId,
          },
        });
        return this.toBookingResponse(updated);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000,
      },
    );
  }

  /**
   * Atomic Create Booking with Serializable Isolation Level and Bounded Retry (up to 3 attempts).
   * Single source of truth for creating customer and merchant bookings in Phase 1.
   */
  async createBookingAtomic(
    command: CreateBookingCommand,
  ): Promise<BookingResponseDto> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const currentRefNo = this.generateBookingReference();

      try {
        return await this.prisma.$transaction(
          async (tx: Prisma.TransactionClient) => {
            // 1. Fetch & validate Tenant inside transaction
            const tenant = await tx.tenant.findUnique({
              where: { id: command.tenantId },
              select: { id: true, isActive: true },
            });

            if (!tenant) {
              throw new NotFoundException({
                statusCode: 404,
                code: ErrorCode.TENANT_NOT_FOUND,
                message: 'Tenant not found',
              });
            }

            if (tenant.isActive !== true) {
              throw new ConflictException({
                statusCode: 409,
                code: ErrorCode.TENANT_INACTIVE,
                message: 'Tenant is currently inactive',
              });
            }

            // 2. Fetch & validate Customer User inside transaction
            const customerUser = await tx.user.findUnique({
              where: { id: command.customerUserId },
              select: {
                id: true,
                displayName: true,
                phone: true,
                avatarUrl: true,
              },
            });

            if (!customerUser) {
              throw new NotFoundException({
                statusCode: 404,
                code: ErrorCode.CUSTOMER_NOT_FOUND,
                message: 'Customer user record not found',
              });
            }

            // 3. Verify Customer-Tenant Membership relationship inside transaction
            const membership = await tx.membership.findUnique({
              where: {
                tenantId_userId: {
                  tenantId: command.tenantId,
                  userId: command.customerUserId,
                },
              },
              select: { id: true },
            });

            if (!membership) {
              throw new NotFoundException({
                statusCode: 404,
                code: ErrorCode.CUSTOMER_NOT_FOUND,
                message: 'Customer is not a member of this tenant',
              });
            }

            // 4. Fetch & validate Service inside transaction
            const service = await tx.service.findFirst({
              where: { id: command.serviceId, tenantId: command.tenantId },
            });

            if (!service) {
              throw new NotFoundException({
                statusCode: 404,
                code: ErrorCode.SERVICE_NOT_FOUND,
                message: 'Service not found for this tenant',
              });
            }

            if (service.isActive !== true) {
              throw new BadRequestException({
                statusCode: 400,
                code: ErrorCode.SERVICE_INACTIVE,
                message: 'Service is currently inactive',
              });
            }

            const bookingHours = command.bookingHours ?? 1;
            if (
              !Number.isInteger(bookingHours) ||
              bookingHours < 1 ||
              bookingHours > 24
            ) {
              throw new BadRequestException({
                statusCode: 400,
                code: ErrorCode.VALIDATION_FAILED,
                message: 'bookingHours must be an integer between 1 and 24',
              });
            }
            const effectiveDurationMinutes =
              service.durationMinutes * bookingHours;

            let selectedCourt: {
              id: string;
              name: string;
              extraPricePerHour: Prisma.Decimal | null;
            } | null = null;
            if (command.courtId) {
              const court = await tx.courts.findFirst({
                where: {
                  id: command.courtId,
                  tenant_id: command.tenantId,
                  is_active: true,
                  OR: [{ service_id: command.serviceId }, { service_id: null }],
                },
                select: { id: true, name: true, extra_price_per_hour: true },
              });

              if (!court) {
                throw new NotFoundException({
                  statusCode: 404,
                  code: ErrorCode.RESOURCE_NOT_FOUND,
                  message: 'Court not found or inactive for this service',
                });
              }

              selectedCourt = {
                id: court.id,
                name: court.name,
                extraPricePerHour: court.extra_price_per_hour,
              };
            }

            // 5. Calculate Availability INSIDE transaction using tx
            const availability =
              await this.availabilityService.calculateAvailability(
                command.tenantId,
                command.bookingDate,
                command.serviceId,
                command.staffId,
                {
                  actor: command.actor,
                  txPrisma: tx,
                  courtId: command.courtId,
                  durationMinutesOverride: effectiveDurationMinutes,
                },
              );

            // 6. Match candidate slot at exact startTime (HH:mm)
            const matchingSlot = availability.slots.find(
              (s) => s.startTime === command.startTime,
            );

            if (!matchingSlot || matchingSlot.available !== true) {
              throw new ConflictException({
                statusCode: 409,
                code: ErrorCode.BOOKING_SLOT_UNAVAILABLE,
                message: 'Selected booking slot is no longer available',
              });
            }

            // 7. Final Staff Assignment
            const finalStaffId = matchingSlot.staffId;

            let staffName: string | null = null;
            let staffAvatar: string | null = null;

            if (finalStaffId) {
              const staffObj = await tx.staff.findFirst({
                where: { id: finalStaffId, tenant_id: command.tenantId },
                select: { name: true, avatar_url: true },
              });
              if (staffObj) {
                staffName = staffObj.name;
                staffAvatar = staffObj.avatar_url;
              }
            }

            // 8. Calculate Pricing & Time Objects
            const adjustedUnitPrice = new Prisma.Decimal(service.price).add(
              selectedCourt?.extraPricePerHour ?? 0,
            );
            const unitPrice = adjustedUnitPrice.isNegative()
              ? new Prisma.Decimal(0)
              : adjustedUnitPrice;
            const priceVal = unitPrice.mul(bookingHours);
            const discountVal = new Prisma.Decimal(0);
            const finalPriceVal = priceVal.sub(discountVal);

            const sourceVal: 'line_liff' | 'admin' =
              command.actor === 'customer' ? 'line_liff' : 'admin';

            const resolvedUserName = (
              command.customerName ||
              customerUser.displayName ||
              ''
            ).trim();

            if (!resolvedUserName) {
              throw new BadRequestException({
                statusCode: 400,
                code: ErrorCode.VALIDATION_FAILED,
                message: 'Customer name is required',
              });
            }

            const resolvedUserPhone =
              command.customerPhone?.trim() || customerUser.phone || null;

            const dateParts = command.bookingDate.split('-').map(Number);
            const bookingDateObj = new Date(
              Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]),
            );
            const startTimeObj = new Date(
              `1970-01-01T${command.startTime}:00Z`,
            );
            const endTimeObj = new Date(
              `1970-01-01T${matchingSlot.endTime}:00Z`,
            );

            // 9. Booking Creation
            const createdBooking: BookingPayload = await tx.booking.create({
              data: {
                ref_no: currentRefNo,
                tenantId: command.tenantId,
                userId: command.customerUserId,
                user_name: resolvedUserName,
                user_phone: resolvedUserPhone,
                user_avatar: customerUser.avatarUrl,
                serviceId: command.serviceId,
                service_name: service.name,
                service_duration: effectiveDurationMinutes,
                service_price: priceVal,
                staffId: finalStaffId,
                staff_name: staffName,
                staff_avatar: staffAvatar,
                court_id: selectedCourt?.id || null,
                court_name: selectedCourt?.name || null,
                bookingDate: bookingDateObj,
                startTime: startTimeObj,
                endTime: endTimeObj,
                status: 'pending',
                price: priceVal,
                discountAmount: discountVal,
                finalPrice: finalPriceVal,
                paymentStatus: 'unpaid',
                source: sourceVal,
                notes: command.notes || null,
              },
            });

            if (!createdBooking.createdAt) {
              throw new InternalServerErrorException({
                statusCode: 500,
                code: ErrorCode.INTERNAL_SERVER_ERROR,
                message:
                  'Invalid DB booking creation response: missing createdAt',
              });
            }

            return {
              id: createdBooking.id,
              refNo: createdBooking.ref_no,
              tenantId: createdBooking.tenantId!,
              userId: createdBooking.userId!,
              userName: createdBooking.user_name,
              userPhone: createdBooking.user_phone,
              serviceId: createdBooking.serviceId!,
              serviceName: createdBooking.service_name,
              serviceDuration: createdBooking.service_duration,
              servicePrice:
                createdBooking.service_price === null
                  ? null
                  : Number(createdBooking.service_price),
              staffId: createdBooking.staffId,
              staffName: createdBooking.staff_name,
              courtId: createdBooking.court_id,
              courtName: createdBooking.court_name,
              bookingDate: command.bookingDate,
              startTime: command.startTime,
              endTime: matchingSlot.endTime,
              status: createdBooking.status || 'pending',
              price: Number(createdBooking.price),
              discountAmount: Number(createdBooking.discountAmount || 0),
              finalPrice: Number(createdBooking.finalPrice),
              depositAmount: Number(createdBooking.deposit_amount || 0),
              paymentStatus: createdBooking.paymentStatus || 'unpaid',
              paymentMethod: createdBooking.payment_method,
              source: createdBooking.source || 'line_liff',
              notes: createdBooking.notes,
              createdAt: createdBooking.createdAt.toISOString(),
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 10000,
          },
        );
      } catch (error: unknown) {
        // P2002 Unique Violation on ref_no: Rollback current transaction & start NEW transaction attempt
        if (this.isRefNoUniqueViolation(error)) {
          if (attempt < maxAttempts) {
            this.logger.warn(
              `Booking reference collision on ${currentRefNo} (Attempt ${attempt}/${maxAttempts}). Retrying with new transaction...`,
            );
            const delayMs = this.calculateRetryDelay(attempt);
            await this.sleep(delayMs);
            continue;
          }
          throw error;
        }

        // Retryable Serialization Errors (P2034 / 40001 / 40P01): Start NEW transaction attempt
        if (this.isRetryableTransactionError(error)) {
          if (attempt < maxAttempts) {
            this.logger.warn(
              `Serializable transaction conflict (Attempt ${attempt}/${maxAttempts}). Retrying... Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            const delayMs = this.calculateRetryDelay(attempt);
            await this.sleep(delayMs);
            continue;
          }
          this.logger.error(
            `Serializable transaction conflict exhausted after ${maxAttempts} attempts.`,
          );
          throw new ConflictException({
            statusCode: 409,
            code: ErrorCode.BOOKING_SLOT_UNAVAILABLE,
            message:
              'Selected booking slot is no longer available due to high demand',
          });
        }

        // Non-retryable errors (Domain exceptions, validation failures, auth, or P2002 on other fields)
        throw error;
      }
    }

    throw new ConflictException({
      statusCode: 409,
      code: ErrorCode.BOOKING_SLOT_UNAVAILABLE,
      message: 'Selected booking slot is no longer available',
    });
  }

  // --- Typed Helper Methods ---

  private toBookingResponse(booking: BookingPayload): BookingResponseDto {
    return {
      id: booking.id,
      refNo: booking.ref_no,
      tenantId: booking.tenantId || '',
      userId: booking.userId || '',
      userName: booking.user_name,
      userPhone: booking.user_phone,
      serviceId: booking.serviceId || '',
      serviceName: booking.service_name,
      serviceDuration: booking.service_duration,
      servicePrice:
        booking.service_price === null ? null : Number(booking.service_price),
      staffId: booking.staffId,
      staffName: booking.staff_name,
      courtId: booking.court_id,
      courtName: booking.court_name,
      bookingDate: booking.bookingDate.toISOString().slice(0, 10),
      startTime: booking.startTime.toISOString().slice(11, 16),
      endTime: booking.endTime.toISOString().slice(11, 16),
      status: booking.status || 'pending',
      price: Number(booking.price),
      discountAmount: Number(booking.discountAmount || 0),
      finalPrice: Number(booking.finalPrice),
      depositAmount: Number(booking.deposit_amount || 0),
      paymentStatus: booking.paymentStatus || 'unpaid',
      paymentMethod: booking.payment_method,
      source: booking.source || 'line_liff',
      notes: booking.notes,
      cancellationReason: booking.cancellationReason,
      cancelledAt: booking.cancelledAt?.toISOString() || null,
      checkedInAt: booking.checkedInAt?.toISOString() || null,
      completedAt: booking.completedAt?.toISOString() || null,
      createdAt: booking.createdAt?.toISOString() || '',
    };
  }

  public isRefNoUniqueViolation(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2002') return false;
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return target.includes('ref_no');
    }
    if (typeof target === 'string') {
      return target.includes('ref_no');
    }
    return false;
  }

  public isRetryableTransactionError(error: unknown): boolean {
    if (!error) return false;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return true;
    }

    if (typeof error === 'object' && 'cause' in error) {
      const cause: unknown = error.cause;
      if (
        typeof cause === 'object' &&
        cause !== null &&
        'kind' in cause &&
        cause.kind === 'TransactionWriteConflict'
      ) {
        return true;
      }
    }

    const msg =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';
    if (
      msg.includes('40001') ||
      msg.includes('40P01') ||
      msg.includes('TransactionWriteConflict') ||
      msg.includes('Transaction failed due to a write conflict')
    ) {
      return true;
    }
    return false;
  }

  public calculateRetryDelay(attempt: number): number {
    return Math.floor(Math.pow(2, attempt) * 50 + Math.random() * 50);
  }

  public generateBookingReference(): string {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const timestampStr = Date.now().toString(36).toUpperCase();
    return `BK-${timestampStr}-${randomHex}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // --- Legacy Methods (Maintained for Backward Compatibility) ---

  /** @deprecated LEGACY METHOD — DO NOT USE IN STEP 9+ */
  async getAvailableSlots(
    tenantId: string,
    date: string,
    serviceId: string,
    staffId?: string,
  ) {
    if (!tenantId || !date || !serviceId) {
      throw new BadRequestException(
        'tenantId, date, and serviceId are required',
      );
    }
    return this.availabilityService.calculateAvailability(
      tenantId,
      date,
      serviceId,
      staffId,
      { actor: 'customer' },
    );
  }

  async cancelBookingAsMerchant(tenantId: string, bookingId: string) {
    if (!tenantId) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_REQUIRED,
        message: 'Tenant ID is required',
      });
    }

    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
    });

    if (!booking) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.BOOKING_NOT_FOUND,
        message: 'Booking not found for this tenant',
      });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.INVALID_BOOKING_STATUS,
        message: `Cannot cancel booking with status ${booking.status}`,
      });
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
  }
}
