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

            // 5. Calculate Availability INSIDE transaction using tx
            const availability =
              await this.availabilityService.calculateAvailability(
                command.tenantId,
                command.bookingDate,
                command.serviceId,
                command.staffId,
                { actor: command.actor, txPrisma: tx },
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
            const priceVal = new Prisma.Decimal(service.price);
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
                service_duration: service.durationMinutes,
                service_price: priceVal,
                staffId: finalStaffId,
                staff_name: staffName,
                staff_avatar: staffAvatar,
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
