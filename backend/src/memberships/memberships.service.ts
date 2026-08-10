import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeMembershipTier } from '../common/utils/membership-tier';

@Injectable()
export class MembershipsService {
  constructor(private prisma: PrismaService) {}

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
    const membership = await this.getMembershipWithPhoneFallback(
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

    const [totalBookings, completedVisits] = await Promise.all([
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
}
