import {
  BadRequestException,
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LineIdentityService, getLineChannelIdFromTenant } from '../../auth/line-identity.service';
import { ErrorCode } from '../constants/error-codes';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * LineIdTokenGuard — Security-Hardened LINE Identity Bridge Guard
 * 1. Validates x-tenant-id header
 * 2. Checks DB for tenant existence, strict active status (isActive === true), and LINE Login channel ID configuration
 * 3. Verifies LINE ID token against tenant channel ID with 5s timeout
 * 4. Race-safely resolves customer user & membership
 */
@Injectable()
export class LineIdTokenGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lineIdentityService: LineIdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // 1. Extract & validate tenant ID header
    const rawHeader = req.headers['x-tenant-id'];
    if (!rawHeader) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_REQUIRED,
        message: 'x-tenant-id header is required',
      });
    }

    if (Array.isArray(rawHeader)) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_INVALID,
        message: 'Ambiguous multiple x-tenant-id headers provided',
      });
    }

    const tenantId = (rawHeader as string).trim();
    if (!UUID_REGEX.test(tenantId)) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_ID_INVALID,
        message: 'x-tenant-id header must be a valid UUID',
      });
    }

    // 2. Fetch tenant from DB and verify strict active status (isActive === true) & LINE channel ID
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isActive: true, lineChannelId: true, liffId: true },
    });

    if (!tenant) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.TENANT_NOT_FOUND,
        message: 'Tenant not found',
      });
    }

    if (tenant.isActive !== true) {
      throw new ConflictException({
        statusCode: 409,
        code: ErrorCode.TENANT_INACTIVE,
        message: 'Tenant is currently inactive',
      });
    }

    const channelId = getLineChannelIdFromTenant(tenant);
    if (!channelId) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.TENANT_LINE_NOT_CONFIGURED,
        message: 'Tenant LINE channel ID is not configured',
      });
    }

    // 3. Extract & verify LINE ID Token
    const authHeader: string = req.headers?.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!idToken) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_REQUIRED,
        message: 'Authorization Bearer LINE ID token is required',
      });
    }

    const verifiedProfile = await this.lineIdentityService.verifyIdToken(
      idToken,
      channelId,
    );

    // 4. Resolve/upsert customer user and membership
    const customerUser = await this.lineIdentityService.resolveOrCreateCustomer(
      tenantId,
      verifiedProfile.lineUserId,
      verifiedProfile,
    );

    req.tenantId = tenantId;
    req.customerUser = customerUser;
    req.lineUserId = verifiedProfile.lineUserId;

    return true;
  }
}
