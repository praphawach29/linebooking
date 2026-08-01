import { Controller, Get, Query, Headers } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async getServices(
    @Headers('x-tenant-id') tenantId: string,
    @Query('is_active') isActive?: string,
  ) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.servicesService.getServices(tenantId, active);
  }
}
