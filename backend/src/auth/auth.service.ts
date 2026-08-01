import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LineLoginDto } from './dto/line-login.dto';
import { firstValueFrom } from 'rxjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private jwtService: JwtService,
  ) {}

  async lineLogin(lineLoginDto: LineLoginDto) {
    const { code, redirectUri } = lineLoginDto;
    
    try {
      // 1. Exchange code for LINE token
      const tokenResponse = await this.exchangeLineCodeForToken(code, redirectUri);
      const { id_token, access_token } = tokenResponse;

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
