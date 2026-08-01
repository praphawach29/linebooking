import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LineLoginDto } from './dto/line-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('line/callback')
  @HttpCode(HttpStatus.OK)
  async lineLogin(@Body() lineLoginDto: LineLoginDto) {
    return this.authService.lineLogin(lineLoginDto);
  }
}
