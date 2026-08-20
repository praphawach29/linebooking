import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeMembershipTier } from '../common/utils/membership-tier';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class MembershipsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Merges a separate, phone-linked account (e.g. created by a walk-in
   * check-in before the customer ever logged into LINE) into their
   * authenticated LINE account, once the customer self-attests the phone
   * number is theirs (e.g. saving it in their own profile). Only merges
   * when the candidate has no LINE identity of its own — never merges two
   * accounts that both have a verified lineUserId, since a shared phone
   * doesn't prove they're the same person.
   */
  async linkPhoneAndMergeIdentity(authUserId: string, rawPhone: string) {
    const phone = rawPhone.replace(/[\s-]/g, '');
    if (!phone) return { merged: false };

    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.user.findFirst({
        where: {
          phone,
          lineUserId: null,
          mergedIntoUserId: null,
          id: { not: authUserId },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!candidate) {
        await tx.user.update({ where: { id: authUserId }, data: { phone } });
        return { merged: false };
      }

      await tx.booking.updateMany({
        where: { userId: candidate.id },
        data: { userId: authUserId },
      });
      await tx.customerPackage.updateMany({
        where: { userId: candidate.id },
        data: { userId: authUserId },
      });

      const candidateMemberships = await tx.membership.findMany({
        where: { userId: candidate.id },
      });

      for (const walkinMembership of candidateMemberships) {
        const authMembership = await tx.membership.findUnique({
          where: {
            tenantId_userId: {
              tenantId: walkinMembership.tenantId!,
              userId: authUserId,
            },
          },
        });

        if (!authMembership) {
          await tx.membership.update({
            where: { id: walkinMembership.id },
            data: { userId: authUserId },
          });
          continue;
        }

        const mergedTotalPointsEarned =
          (authMembership.totalPointsEarned || 0) +
          (walkinMembership.totalPointsEarned || 0);

        await tx.pointTransaction.updateMany({
          where: { membershipId: walkinMembership.id },
          data: { membershipId: authMembership.id },
        });

        await tx.membership.update({
          where: { id: authMembership.id },
          data: {
            points:
              (authMembership.points || 0) + (walkinMembership.points || 0),
            totalPointsEarned: mergedTotalPointsEarned,
            tier: computeMembershipTier(mergedTotalPointsEarned),
          },
        });

        await tx.membership.delete({ where: { id: walkinMembership.id } });
      }

      await tx.user.update({
        where: { id: candidate.id },
        data: { mergedIntoUserId: authUserId, phone: null },
      });
      await tx.user.update({ where: { id: authUserId }, data: { phone } });

      return { merged: true, mergedFromUserId: candidate.id };
    });
  }

  async getMembershipWithPhoneFallback(
    tenantId: string,
    userId: string,
    phone?: string,
  ) {
    // A customer's real point history can end up under two different user
    // records: the one tied to their authenticated LINE identity, and a
    // separate phone-linked record if staff checked them in (e.g. a walk-in
    // scan) before they ever opened the LIFF app and logged into LINE.
    // Look up both candidates and trust whichever one actually holds the
    // points, rather than assuming either is always authoritative.
    const authMembership = await this.prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: {
        pointTransactions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    let phoneMembership = null;
    if (phone) {
      const bookingWithPhone = await this.prisma.booking.findFirst({
        where: { tenantId, user_phone: phone, userId: { not: null } },
        orderBy: { createdAt: 'desc' },
      });

      if (
        bookingWithPhone &&
        bookingWithPhone.userId &&
        bookingWithPhone.userId !== userId
      ) {
        phoneMembership = await this.prisma.membership.findUnique({
          where: {
            tenantId_userId: { tenantId, userId: bookingWithPhone.userId },
          },
          include: {
            pointTransactions: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        });
      }
    }

    let membership = authMembership;
    if (
      phoneMembership &&
      (phoneMembership.totalPointsEarned || 0) >
        (authMembership?.totalPointsEarned || 0)
    ) {
      membership = phoneMembership;
    }

    if (!membership) {
      membership = await this.prisma.membership.create({
        data: {
          tenantId,
          userId,
          tier: 'bronze',
          points: 0,
          totalPointsEarned: 0,
        },
        include: {
          pointTransactions: true,
        },
      });
    }

    return {
      ...membership,
      pointTransactions: membership.pointTransactions || [],
    };
  }

  async getCustomerProfileSummary(
    tenantId: string,
    userId: string,
    phone?: string,
  ) {
    const membershipPromise = this.getMembershipWithPhoneFallback(
      tenantId,
      userId,
      phone,
    );
    const normalizedPhone = phone?.replace(/[\s-]/g, '');
    const phoneFilters = phone
      ? [
          { user_phone: phone },
          ...(normalizedPhone && normalizedPhone !== phone
            ? [{ user_phone: normalizedPhone }]
            : []),
        ]
      : [];
    const customerFilter = {
      tenantId,
      OR: [{ userId }, ...phoneFilters],
    };

    const [membership, totalBookings, completedVisits] = await Promise.all([
      membershipPromise,
      this.prisma.booking.count({ where: customerFilter }),
      this.prisma.booking.count({
        where: {
          ...customerFilter,
          status: { in: ['checked_in', 'completed'] },
        },
      }),
    ]);

    return {
      membership,
      stats: {
        totalBookings,
        completedVisits,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async getMembership(tenantId: string, userId: string) {
    let membership = await this.prisma.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      include: {
        pointTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!membership) {
      // Auto-create a bronze membership if they don't have one
      membership = await this.prisma.membership.create({
        data: {
          tenantId,
          userId,
          tier: 'bronze',
          points: 0,
          totalPointsEarned: 0,
        },
        include: {
          pointTransactions: true,
        },
      });
    }

    return membership;
  }

  async getRewards(tenantId: string) {
    return this.prisma.reward.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { pointsRequired: 'asc' },
    });
  }

  async redeemReward(tenantId: string, userId: string, rewardId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get reward
      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });

      if (!reward || reward.tenantId !== tenantId || !reward.isActive) {
        throw new NotFoundException('Reward not found or not active');
      }

      // 2. Get membership
      const membership = await tx.membership.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new BadRequestException('Membership not found');
      }

      // 3. Check points
      if ((membership.points ?? 0) < reward.pointsRequired) {
        throw new BadRequestException('Insufficient points');
      }

      // 4. Deduct points
      const updatedMembership = await tx.membership.update({
        where: { id: membership.id },
        data: {
          points: {
            decrement: reward.pointsRequired,
          },
        },
      });

      // 5. Create transaction
      const transaction = await tx.pointTransaction.create({
        data: {
          membershipId: membership.id,
          type: 'REDEEM',
          points: -reward.pointsRequired,
          description: `Redeemed: ${reward.name}`,
        },
      });

      return {
        success: true,
        membership: updatedMembership,
        transaction,
        reward,
      };
    });
  }

  async adjustCustomerPointsAsMerchant(
    tenantId: string,
    targetUserId: string,
    pointsDelta: number,
    reason?: string,
    actor?: { id?: string; role?: string },
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    if (!targetUserId) {
      throw new BadRequestException('Target customer user ID is required');
    }
    if (
      typeof pointsDelta !== 'number' ||
      isNaN(pointsDelta) ||
      pointsDelta === 0
    ) {
      throw new BadRequestException('Points delta must be a non-zero number');
    }

    return this.prisma.$transaction(async (tx) => {
      let membership = await tx.membership.findUnique({
        where: { tenantId_userId: { tenantId, userId: targetUserId } },
      });

      const previousPoints = membership?.points || 0;
      const previousTotalEarned = membership?.totalPointsEarned || 0;
      const previousTier = membership?.tier || 'bronze';

      const newPoints = Math.max(0, previousPoints + pointsDelta);
      const newTotalEarned =
        pointsDelta > 0
          ? previousTotalEarned + pointsDelta
          : previousTotalEarned;
      const newTier = computeMembershipTier(newTotalEarned);

      if (!membership) {
        membership = await tx.membership.create({
          data: {
            tenantId,
            userId: targetUserId,
            points: newPoints,
            totalPointsEarned: newTotalEarned,
            tier: newTier,
          },
        });
      } else {
        membership = await tx.membership.update({
          where: { id: membership.id },
          data: {
            points: newPoints,
            totalPointsEarned: newTotalEarned,
            tier: newTier,
          },
        });
      }

      const pointTx = await tx.pointTransaction.create({
        data: {
          membershipId: membership.id,
          points: pointsDelta,
          type: pointsDelta >= 0 ? 'ADJUST_ADD' : 'ADJUST_DEDUCT',
          description: reason?.trim() || 'Manual adjustment by merchant',
        },
      });

      await this.auditService.record(
        {
          tenantId,
          actorId: actor?.id || null,
          actorType: (actor?.role as any) || 'merchant_admin',
          action: 'points_adjusted',
          entityType: 'membership',
          entityId: membership.id,
          beforeState: {
            points: previousPoints,
            totalPointsEarned: previousTotalEarned,
            tier: previousTier,
          },
          afterState: {
            points: newPoints,
            totalPointsEarned: newTotalEarned,
            tier: newTier,
            pointsDelta,
          },
          reason: reason?.trim() || null,
        },
        tx,
      );

      return {
        success: true,
        membership,
        pointTransaction: pointTx,
      };
    });
  }

  /**
   * PDPA - สิทธิในการขอเข้าถึงและรับสำเนาข้อมูลส่วนบุคคล (Data Portability / Export)
   */
  async exportCustomerData(tenantId: string, userId: string) {
    const [user, membership, bookings] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          phone: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.membership.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
        include: {
          pointTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
          reward_redemptions: {
            include: {
              rewards: { select: { name: true, pointsRequired: true } },
            },
          },
        },
      }),
      this.prisma.booking.findMany({
        where: { tenantId, userId },
        orderBy: { bookingDate: 'desc' },
        take: 100,
        select: {
          ref_no: true,
          service_name: true,
          court_name: true,
          bookingDate: true,
          startTime: true,
          endTime: true,
          status: true,
          finalPrice: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      tenantId,
      profile: user,
      membership,
      bookings,
    };
  }

  /**
   * PDPA - สิทธิในการขอลบหรือทำลายข้อมูลส่วนบุคคล (Right to Erasure / Anonymization)
   */
  async eraseCustomerData(tenantId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('ไม่พบข้อมูลผู้ใช้');

    const anonymizedName = `Anonymized User ${userId.slice(0, 8)}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: anonymizedName,
        phone: null,
        avatarUrl: null,
        lineUserId: user.lineUserId ? `deleted_${Date.now()}_${userId.slice(0, 6)}` : null,
      },
    });

    await this.prisma.booking.updateMany({
      where: { userId },
      data: {
        user_name: anonymizedName,
        user_phone: null,
        user_avatar: null,
        notes: null,
        paymentSlipUrl: null,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: userId,
      actorType: 'customer',
      action: 'customer_data_erased_pdpa',
      entityType: 'user',
      entityId: userId,
      beforeState: { displayName: user.displayName, phone: user.phone },
      afterState: { displayName: anonymizedName, phone: null },
      reason: 'Customer exercised PDPA Right to Erasure',
    });

    return {
      success: true,
      message: 'ข้อมูลส่วนบุคคลของคุณได้รับการลบและทำให้นิรนามเรียบร้อยแล้วตามสิทธิ PDPA',
      anonymizedAt: new Date().toISOString(),
    };
  }
}
