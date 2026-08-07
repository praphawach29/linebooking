import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SUPABASE_URL: 'https://project.supabase.co' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('[]'),
    }) as jest.Mock;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('sends a new secret key only through the apikey header', async () => {
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_backend';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await new SupabaseService().select('tenants?limit=1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/rest/v1/tenants?limit=1',
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: 'sb_secret_backend' }),
      }),
    );
    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(options.headers).not.toHaveProperty('Authorization');
  });

  it('keeps Authorization for a legacy service role JWT', async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role';

    await new SupabaseService().select('tenants?limit=1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://project.supabase.co/rest/v1/tenants?limit=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: 'legacy-service-role',
          Authorization: 'Bearer legacy-service-role',
        }),
      }),
    );
  });
});
