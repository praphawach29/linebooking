import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController (Unit Tests)', () => {
  let controller: HealthController;
  let service: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const mockHealthService = {
      getLiveness: jest.fn().mockReturnValue({
        status: 'ok',
        uptimeSeconds: 120,
        timestamp: '2026-08-19T15:00:00.000Z',
        env: 'test',
        memoryUsageMb: { rss: 45, heapTotal: 30, heapUsed: 20 },
      }),
      getReadiness: jest.fn().mockResolvedValue({
        status: 'ok',
        checks: { database: 'up', redis: 'up', queue: 'up' },
        latencyMs: { database: 2, redis: 1 },
        timestamp: '2026-08-19T15:00:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get(HealthService);
  });

  it('handles GET /health and returns liveness probe', () => {
    const result = controller.getHealth();
    expect(result.status).toBe('ok');
    expect(service.getLiveness).toHaveBeenCalled();
  });

  it('handles GET /ready and returns readiness probe', async () => {
    const result = await controller.getReady();
    expect(result.status).toBe('ok');
    expect(service.getReadiness).toHaveBeenCalled();
  });
});
