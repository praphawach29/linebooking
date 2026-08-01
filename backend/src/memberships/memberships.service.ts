import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private prisma: PrismaService) {}

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
          currentPoints: 0,
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
      if (membership.currentPoints < reward.pointsRequired) {
        throw new BadRequestException('Insufficient points');
      }

      // 4. Deduct points
      const updatedMembership = await tx.membership.update({
        where: { id: membership.id },
        data: {
          currentPoints: {
            decrement: reward.pointsRequired,
          },
        },
      });

      // 5. Create transaction
      const transaction = await tx.pointTransaction.create({
        data: {
          membershipId: membership.id,
          type: 'REDEEM',
          amount: -reward.pointsRequired,
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
