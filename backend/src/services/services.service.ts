import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async getServices(tenantId: string, isActive?: boolean) {
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    const whereClause: any = {
      tenant_id: tenantId,
    };

    if (isActive !== undefined) {
      whereClause.is_active = isActive;
    }

    return this.prisma.service.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }
}
