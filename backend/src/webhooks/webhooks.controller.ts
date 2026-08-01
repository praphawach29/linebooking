import { Controller, Post, Body, Req, Headers, RawBodyRequest } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('omise')
  async handleOmiseWebhook(@Body() payload: any) {
    return this.webhooksService.handleOmiseWebhook(payload);
  }

  @Post('line')
  async handleLineWebhook(
    @Headers('x-line-signature') signature: string,
    @Body() payload: any,
  ) {
    // In production, verify the LINE signature here
    return this.webhooksService.handleLineWebhook(payload);
  }
}
