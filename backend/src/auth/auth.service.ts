import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from '../common/supabase/supabase-env';
import { LineLoginDto } from './dto/line-login.dto';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { MerchantOnboardingDto } from './dto/merchant-onboarding.dto';

interface SupabaseIdentity {
  id: string;
  email: string;
}

/**
 * Derives sensible booking-flow defaults from the business type chosen at
 * signup, so a new "sports/venue" shop doesn't land on an empty dashboard
 * still configured for staff-based booking — the merchant would otherwise
 * have to separately discover and manually enable court selection in
 * Booking Flow settings before their shop is usable at all.
 */
function defaultSettingsForBusinessType(businessType: string): Record<string, unknown> {
  if (businessType === 'sports' || businessType === 'venue') {
    return { enableCourtSelection: true };
  }
  return {};
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private jwtService: JwtService,
  ) {}

  async onboardMerchant(
    authorization: string,
    dto: MerchantOnboardingDto,
  ) {
    const identity = await this.verifySupabaseIdentity(authorization);

    return this.prisma.$transaction(
      async (tx) => {
        let user = await tx.user.findFirst({
          where: {
            OR: [{ auth_user_id: identity.id }, { id: identity.id }],
          },
        });

        if (user?.tenant_id) {
          const tenant = await tx.tenant.findUnique({
            where: { id: user.tenant_id },
            select: { id: true, name: true, slug: true, businessType: true },
          });
          if (tenant) return this.onboardingResponse(user, tenant);
        }

        const profile = {
          auth_user_id: identity.id,
          displayName: dto.displayName.trim(),
          email: identity.email,
          phone: dto.phone?.trim() || null,
          role: 'merchant_admin' as const,
        };

        if (user) {
          user = await tx.user.update({
            where: { id: user.id },
            data: profile,
          });
        } else {
          user = await tx.user.create({
            data: { id: identity.id, ...profile },
          });
        }

        const tenant = await tx.tenant.create({
          data: {
            name: dto.shopName.trim(),
            slug: this.createTenantSlug(dto.shopName),
            businessType: dto.businessType,
            email: identity.email,
            phone: dto.phone?.trim() || null,
            isActive: true,
            owner_user_id: user.id,
            settings: {
              currency: 'THB',
              autoConfirm: false,
              depositPercentage: 0,
              ...defaultSettingsForBusinessType(dto.businessType),
            },
          },
          select: { id: true, name: true, slug: true, businessType: true },
        });

        const defaultOpenTime = new Date('1970-01-01T08:00:00.000Z');
        const defaultCloseTime = new Date('1970-01-01T23:00:00.000Z');
        await tx.businessHours.createMany({
          data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            tenantId: tenant.id,
            dayOfWeek,
            openTime: defaultOpenTime,
            closeTime: defaultCloseTime,
            isOpen: true,
          })),
        });

        user = await tx.user.update({
          where: { id: user.id },
          data: { tenant_id: tenant.id },
        });

        return this.onboardingResponse(user, tenant);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000,
      },
    );
  }

  private async verifySupabaseIdentity(
    authorization: string,
  ): Promise<SupabaseIdentity> {
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';
    if (!token) throw new UnauthorizedException('Access token is required');

    const url = getSupabaseUrl();
    const apiKey = getSupabaseAnonKey();
    if (!url || !apiKey) {
      throw new InternalServerErrorException(
        'Supabase authentication is not configured',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${url}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: apiKey },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (!response.ok) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const payload = (await response.json()) as {
      id?: string;
      email?: string;
    };
    if (!payload.id || !payload.email) {
      throw new UnauthorizedException('Invalid authentication profile');
    }
    return { id: payload.id, email: payload.email };
  }

  private createTenantSlug(shopName: string): string {
    const base = shopName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '') || 'shop';
    return `${base}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  }

  private onboardingResponse(
    user: {
      id: string;
      auth_user_id: string | null;
      displayName: string;
      email: string | null;
      role: string | null;
      tenant_id: string | null;
    },
    tenant: { id: string; name: string; slug: string; businessType: string },
  ) {
    return {
      user: {
        id: user.auth_user_id || user.id,
        dbUserId: user.id,
        email: user.email || '',
        displayName: user.displayName,
        role: user.role || 'merchant_admin',
        tenantId: tenant.id,
      },
      tenant,
    };
  }

  async lineLogin(lineLoginDto: LineLoginDto) {
    const { code, redirectUri } = lineLoginDto;
    
    try {
      // 1. Exchange code for LINE token
      const tokenResponse = await this.exchangeLineCodeForToken(code, redirectUri);
      const { id_token } = tokenResponse;

      // 2. Decode ID Token to get user profile
      const decoded: any = jwt.decode(id_token);
      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Invalid ID token from LINE');
      }

      const lineId = decoded.sub;
      const name = decoded.name;
      const picture = decoded.picture;
      const email = decoded.email;

      // 3. Find or Create User
      let user = await this.prisma.user.findUnique({
        where: { lineUserId: lineId },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            lineUserId: lineId,
            displayName: name,
            avatarUrl: picture,
            email: email,
          },
        });
      } else {
        // Optional: Update profile picture and name if they changed
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            displayName: name,
            avatarUrl: picture,
            email: email,
          },
        });
      }

      // 4. Generate our own JWT token
      const payload = { sub: user.id, line_id: user.lineUserId };
      const systemAccessToken = this.jwtService.sign(payload);

      return {
        access_token: systemAccessToken,
        user: {
          id: user.id,
          name: user.displayName,
          avatar_url: user.avatarUrl,
          email: user.email,
        }
      };
    } catch (error) {
      this.logger.error(`LINE Login failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('LINE Login failed');
    }
  }

  private async exchangeLineCodeForToken(code: string, redirectUri: string): Promise<any> {
    const channelId = process.env.LINE_CLIENT_ID;
    const channelSecret = process.env.LINE_CLIENT_SECRET;
    
    if (!channelId || !channelSecret) {
      this.logger.warn('LINE_CLIENT_ID or LINE_CLIENT_SECRET is not configured properly');
    }

    const tokenUrl = 'https://api.line.me/oauth2/v2.1/token';
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: channelId || 'mock_client_id',
      client_secret: channelSecret || 'mock_client_secret',
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error exchanging LINE code: ${error.response?.data?.error_description || error.message}`);
      throw new UnauthorizedException('Invalid LINE authorization code');
    }
  }
}
