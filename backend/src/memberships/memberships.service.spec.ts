import { MembershipsService } from './memberships.service';

describe('MembershipsService customer profile summary', () => {
  const mockAuditService = {
    record: jest.fn().mockResolvedValue({ id: 'audit-log-uuid' }),
  };

  it('returns current membership and counts only completed visits', async () => {
    const prisma = {
      booking: {
        count: jest.fn().mockResolvedValueOnce(6).mockResolvedValueOnce(3),
      },
    };
    const service = new MembershipsService(
      prisma as never,
      mockAuditService as never,
    );
    const membership = {
      id: 'membership-id',
      tenantId: 'tenant-id',
      userId: 'user-id',
      points: 30,
      totalPointsEarned: 50,
      tier: 'bronze',
      pointTransactions: [],
    };
    jest
      .spyOn(service, 'getMembershipWithPhoneFallback')
      .mockResolvedValue(membership as never);

    const summary = await service.getCustomerProfileSummary(
      'tenant-id',
      'user-id',
      '081-234-5678',
    );

    expect(summary.membership).toBe(membership);
    expect(summary.stats).toEqual({
      totalBookings: 6,
      completedVisits: 3,
    });
    expect(prisma.booking.count).toHaveBeenNthCalledWith(2, {
      where: {
        tenantId: 'tenant-id',
        OR: [
          { userId: 'user-id' },
          { user_phone: '081-234-5678' },
          { user_phone: '0812345678' },
        ],
        status: { in: ['checked_in', 'completed'] },
      },
    });
  });

  it('adjustCustomerPointsAsMerchant atomically updates points and writes audit log', async () => {
    const mockTx = {
      membership: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'mem-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          points: 100,
          totalPointsEarned: 100,
          tier: 'bronze',
        }),
        update: jest.fn().mockResolvedValue({
          id: 'mem-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          points: 150,
          totalPointsEarned: 150,
          tier: 'bronze',
        }),
      },
      pointTransaction: {
        create: jest.fn().mockResolvedValue({ id: 'pt-1' }),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
    };

    const service = new MembershipsService(
      prisma as never,
      mockAuditService as never,
    );

    const result = await service.adjustCustomerPointsAsMerchant(
      'tenant-1',
      'user-1',
      50,
      'Promotion reward',
      { id: 'admin-1', role: 'tenant_owner' },
    );

    expect(result.success).toBe(true);
    expect(mockTx.pointTransaction.create).toHaveBeenCalledWith({
      data: {
        membershipId: 'mem-1',
        points: 50,
        type: 'ADJUST_ADD',
        description: 'Promotion reward',
      },
    });
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        actorId: 'admin-1',
        actorType: 'tenant_owner',
        action: 'points_adjusted',
        entityType: 'membership',
        beforeState: expect.objectContaining({ points: 100 }),
        afterState: expect.objectContaining({ points: 150, pointsDelta: 50 }),
      }),
      mockTx,
    );
  });
});
