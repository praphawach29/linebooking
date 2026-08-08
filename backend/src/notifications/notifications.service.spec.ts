import { NotificationsService } from './notifications.service';

describe('NotificationsService LINE quota', () => {
  const queue = { add: jest.fn(), getJob: jest.fn() };
  const prisma = {
    tenant: { findUnique: jest.fn() },
    lineQuotaSnapshot: { upsert: jest.fn(), findUnique: jest.fn() },
    lineMessageDelivery: { aggregate: jest.fn(), findMany: jest.fn() },
  };
  const lineClient = { getQuota: jest.fn() };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(queue as any, prisma as any, lineClient as any);
    prisma.tenant.findUnique.mockResolvedValue({ lineChannelAccessToken: 'token' });
    prisma.lineMessageDelivery.findMany.mockResolvedValue([]);
    queue.getJob.mockResolvedValue(null);
    prisma.lineQuotaSnapshot.upsert.mockImplementation(({ create }: any) => ({
      ...create,
      fetchedAt: new Date('2026-08-08T00:00:00Z'),
    }));
  });

  it('requeues durable deliveries that were left queued', async () => {
    prisma.lineMessageDelivery.findMany.mockResolvedValue([
      { id: 'delivery-1' },
      { id: 'delivery-2' },
    ]);

    await service.onApplicationBootstrap();

    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      'line-booking-event',
      { deliveryId: 'delivery-1' },
      expect.objectContaining({ jobId: 'delivery-1', attempts: 3 }),
    );
  });

  it('replaces a stale Redis job when the durable delivery is still queued', async () => {
    const staleJob = {
      getState: jest.fn().mockResolvedValue('completed'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    prisma.lineMessageDelivery.findMany.mockResolvedValue([{ id: 'delivery-1' }]);
    queue.getJob.mockResolvedValue(staleJob);

    await service.onApplicationBootstrap();

    expect(staleJob.remove).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      'line-booking-event',
      { deliveryId: 'delivery-1' },
      expect.objectContaining({ jobId: 'delivery-1' }),
    );
  });

  it.each([
    [69, 'normal'],
    [70, 'notice'],
    [85, 'warning'],
    [95, 'critical'],
    [100, 'exceeded'],
  ])('classifies %s percent as %s without blocking', async (usage, warningLevel) => {
    lineClient.getQuota.mockResolvedValue({ type: 'limited', value: 100, totalUsage: usage });

    const result = await service.getLineQuotaStatus('tenant-id');

    expect(result.warningLevel).toBe(warningLevel);
    expect(result.sendingBlocked).toBe(false);
    expect(result.remaining).toBe(Math.max(0, 100 - usage));
  });

  it('uses the paid LINE package limit instead of a fixed 300-message ceiling', async () => {
    lineClient.getQuota.mockResolvedValue({ type: 'limited', value: 15000, totalUsage: 301 });

    const result = await service.getLineQuotaStatus('tenant-id');

    expect(result.limit).toBe(15000);
    expect(result.remaining).toBe(14699);
    expect(result.warningLevel).toBe('normal');
  });
});
