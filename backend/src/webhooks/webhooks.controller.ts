import { Controller, Post, Body, Req, Headers, Query } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('omise')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async handleOmiseWebhook(@Body() payload: any) {
    return this.webhooksService.handleOmiseWebhook(payload);
  }

  @Post('line')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async handleLineWebhook(
    @Headers('x-line-signature') signature: string,
    @Query('tenant') tenantSlug: string,
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: any,
  ) {
    return this.webhooksService.handleLineWebhook(
      tenantSlug,
      signature,
      request.rawBody,
      payload,
    );
  }
}
