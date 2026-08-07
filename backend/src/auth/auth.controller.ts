import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LineLoginDto } from './dto/line-login.dto';
import { MerchantOnboardingDto } from './dto/merchant-onboarding.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('line/callback')
  @HttpCode(HttpStatus.OK)
  async lineLogin(@Body() lineLoginDto: LineLoginDto) {
    return this.authService.lineLogin(lineLoginDto);
  }

  @Post('merchant/onboard')
  @HttpCode(HttpStatus.OK)
  async onboardMerchant(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: MerchantOnboardingDto,
  ) {
    return this.authService.onboardMerchant(authorization || '', dto);
  }
}
