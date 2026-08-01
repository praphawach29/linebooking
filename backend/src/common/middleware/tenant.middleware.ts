import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    // For some routes, tenant_id might not be required (e.g. platform admin routes)
    // but for most, it is. We can let the Guard handle strict enforcement.
    
    if (tenantId) {
      // Basic validation
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new BadRequestException('Invalid Tenant ID');
      }

      // Attach tenant info to request
      (req as any)['tenant'] = tenant;
      
      // Execute SET app.current_tenant to enable RLS in PostgreSQL
      // This requires executing a raw query for the current transaction/session.
      // Since Prisma manages connection pools, doing it safely per-request is tricky.
      // A common pattern is using Prisma extensions or interactive transactions.
      // For this middleware, we just ensure it's available. Real RLS might require 
      // a custom Prisma Client extension to inject SET LOCAL app.current_tenant = X.
    }

    next();
  }
}
