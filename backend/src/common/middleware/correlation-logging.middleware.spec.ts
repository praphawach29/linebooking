import { CorrelationLoggingMiddleware } from './correlation-logging.middleware';

describe('CorrelationLoggingMiddleware (Unit Tests)', () => {
  let middleware: CorrelationLoggingMiddleware;

  beforeEach(() => {
    middleware = new CorrelationLoggingMiddleware();
  });

  it('generates a new UUID requestId when no x-request-id header is supplied', () => {
    const req: any = {
      headers: {},
      params: {},
      query: {},
      body: {},
      method: 'GET',
      originalUrl: '/bookings',
    };
    const res: any = {
      setHeader: jest.fn(),
      on: jest.fn(),
    };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('reuses existing x-request-id header when provided by caller', () => {
    const customReqId = 'custom-trace-uuid-12345';
    const req: any = {
      headers: { 'x-request-id': customReqId },
      params: {},
      query: {},
      body: {},
      method: 'POST',
      originalUrl: '/bookings',
    };
    const res: any = {
      setHeader: jest.fn(),
      on: jest.fn(),
    };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.requestId).toBe(customReqId);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', customReqId);
  });
});
