import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { LineIdentityService } from './line-identity.service';
import { LineIdTokenGuard } from '../common/guards/line-id-token.guard';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-key-for-dev-only',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LineIdentityService, LineIdTokenGuard],
  exports: [AuthService, JwtStrategy, LineIdentityService, LineIdTokenGuard, PassportModule],
})
export class AuthModule {}
