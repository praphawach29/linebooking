import { validateEnv } from './env.validation';

describe('validateEnv (Environment Schema Validation)', () => {
  const validConfig = {
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/booking_db?schema=public',
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key-with-sufficient-length',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-with-sufficient-length',
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173,https://admin.example.com',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: '',
  };

  it('passes validation when all required environment variables are present and valid', () => {
    const validated = validateEnv(validConfig);
    expect(validated.PORT).toBe(3000);
    expect(validated.DATABASE_URL).toBe(validConfig.DATABASE_URL);
    expect(validated.SUPABASE_URL).toBe(validConfig.SUPABASE_URL);
    expect(validated.CORS_ORIGINS).toBe(validConfig.CORS_ORIGINS);
  });

  it('accepts the current Supabase secret key without a legacy service-role key', () => {
    const config = {
      ...validConfig,
      SUPABASE_SECRET_KEY: 'sb_secret_backend',
    };
    delete (config as Partial<typeof validConfig>).SUPABASE_SERVICE_ROLE_KEY;

    const validated = validateEnv(config);

    expect(validated.SUPABASE_SECRET_KEY).toBe('sb_secret_backend');
  });

  it('fails fast when neither Supabase server key is configured', () => {
    const invalidConfig = { ...validConfig };
    delete (invalidConfig as Partial<typeof validConfig>).SUPABASE_SERVICE_ROLE_KEY;

    expect(() => validateEnv(invalidConfig)).toThrow(
      /SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY/,
    );
  });

  it('fails fast and throws when DATABASE_URL is missing', () => {
    const invalidConfig = { ...validConfig };
    delete (invalidConfig as any).DATABASE_URL;

    expect(() => validateEnv(invalidConfig)).toThrow(/DATABASE_URL/);
  });

  it('fails fast when SUPABASE_URL is not a valid URL', () => {
    const invalidConfig = { ...validConfig, SUPABASE_URL: 'not-a-valid-url' };

    expect(() => validateEnv(invalidConfig)).toThrow(/SUPABASE_URL/);
  });

  it('fails fast when PORT is not a number', () => {
    const invalidConfig = { ...validConfig, PORT: 'abc' };

    expect(() => validateEnv(invalidConfig)).toThrow(/PORT/);
  });

  it('fails fast when SUPABASE_ANON_KEY is empty', () => {
    const invalidConfig = { ...validConfig, SUPABASE_ANON_KEY: '' };

    expect(() => validateEnv(invalidConfig)).toThrow(/SUPABASE_ANON_KEY/);
  });
});
