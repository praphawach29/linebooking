import { MembershipsService } from './memberships.service';

describe('MembershipsService customer profile summary', () => {
  it('returns current membership and counts only completed visits', async () => {
    const prisma = {
      booking: {
        count: jest.fn().mockResolvedValueOnce(6).mockResolvedValueOnce(3),
      },
    };
    const service = new MembershipsService(prisma as never);
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
});
