import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';

export interface VerifiedLineProfile {
  lineUserId: string;
  name?: string;
  picture?: string;
}

const LINE_USER_ID_REGEX = /^U[0-9a-f]{32}$/i;

/**
 * Derives LINE Login Channel ID from tenant.lineChannelId or prefix of tenant.liffId
 */
export function getLineChannelIdFromTenant(tenant: {
  lineChannelId?: string | null;
  liffId?: string | null;
}): string | null {
  if (tenant.lineChannelId && tenant.lineChannelId.trim()) {
    return tenant.lineChannelId.trim();
  }
  if (tenant.liffId && tenant.liffId.includes('-')) {
    const prefix = tenant.liffId.split('-')[0].trim();
    if (/^\d+$/.test(prefix)) {
      return prefix;
    }
  }
  return null;
}

@Injectable()
export class LineIdentityService {
  private readonly logger = new Logger(LineIdentityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify LINE ID token via LINE verification API using tenant channel ID with 5s timeout
   */
  async verifyIdToken(idToken: string, channelId: string): Promise<VerifiedLineProfile> {
    if (!idToken) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_REQUIRED,
        message: 'LINE ID token is required',
      });
    }

    if (!channelId) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_LINE_NOT_CONFIGURED,
        message: 'Tenant LINE channel ID is not configured',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const params = new URLSearchParams();
      params.append('id_token', idToken);
      params.append('client_id', channelId);

      const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal,
      });

      if (response.status >= 500 || response.status === 429) {
        this.logger.error(`LINE Auth Provider unavailable (Status ${response.status})`);
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: ErrorCode.AUTH_PROVIDER_UNAVAILABLE,
          message: 'LINE authentication provider is currently unavailable',
        });
      }

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.warn(`LINE ID Token verification failed (${response.status}): ${errorData}`);
        throw new UnauthorizedException({
          statusCode: 401,
          code: ErrorCode.AUTH_INVALID,
          message: 'Invalid or expired LINE ID token',
        });
      }

      const body: any = await response.json();
      if (!body?.sub || !LINE_USER_ID_REGEX.test(body.sub)) {
        throw new UnauthorizedException({
          statusCode: 401,
          code: ErrorCode.AUTH_INVALID,
          message: 'Invalid LINE user ID format in token response',
        });
      }

      return {
        lineUserId: body.sub,
        name: body.name,
        picture: body.picture,
      };
    } catch (err: any) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof BadRequestException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }

      if (err.name === 'AbortError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
        this.logger.error('LINE token verification request timed out');
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: ErrorCode.AUTH_PROVIDER_UNAVAILABLE,
          message: 'LINE authentication provider request timed out',
        });
      }

      this.logger.error('Network error during LINE token verification:', err);
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: ErrorCode.AUTH_PROVIDER_UNAVAILABLE,
        message: 'LINE authentication provider network failure',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Race-safely upsert user without role downgrade or email collision,
   * and link customer to tenant via memberships table.
   */
  async resolveOrCreateCustomer(
    tenantId: string,
    lineUserId: string,
    profile?: { name?: string; picture?: string },
  ) {
    if (!lineUserId || !LINE_USER_ID_REGEX.test(lineUserId)) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_INVALID,
        message: 'Valid LINE User ID is required',
      });
    }

    const user = await this.prisma.user.upsert({
      where: { lineUserId },
      update: {
        ...(profile?.name ? { displayName: profile.name } : {}),
        ...(profile?.picture ? { avatarUrl: profile.picture } : {}),
      },
      create: {
        lineUserId,
        displayName: profile?.name || 'LINE Customer',
        avatarUrl: profile?.picture,
        role: 'customer',
      },
    });

    await this.prisma.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        tenantId,
        userId: user.id,
        tier: 'bronze',
        points: 0,
        totalPointsEarned: 0,
      },
    });

    return user;
  }
}
