import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
  ValidationError,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL is required for PostgreSQL connection.' })
  DATABASE_URL!: string;

  @IsUrl(
    { require_protocol: true, protocols: ['https', 'http'] },
    { message: 'SUPABASE_URL must be a valid URL.' },
  )
  @IsNotEmpty({ message: 'SUPABASE_URL is required.' })
  SUPABASE_URL!: string;

  @IsString()
  @IsNotEmpty({ message: 'SUPABASE_ANON_KEY is required.' })
  SUPABASE_ANON_KEY!: string;

  @IsString()
  @IsOptional()
  SUPABASE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  OMISE_SECRET_KEY?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors: ValidationError[] = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (
    !validatedConfig.SUPABASE_SECRET_KEY?.trim() &&
    !validatedConfig.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    errors.push({
      property: 'SUPABASE_SECRET_KEY',
      constraints: {
        isNotEmpty:
          'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for server operations.',
      },
    });
  }

  if (errors.length > 0) {
    const formattedErrors = errors
      .map((err) => {
        const constraints = Object.values(err.constraints || {}).join(', ');
        return `  ❌ [${err.property}]: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `\n================ ENVIRONMENT VALIDATION FAILED ================\n` +
      `Required environment variables are missing or invalid:\n` +
      `${formattedErrors}\n` +
      `=================================================================\n`,
    );
  }

  return validatedConfig;
}
