import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from '../supabase/supabase-env';
import { ErrorCode } from '../constants/error-codes';

export interface AppUser {
  /** id ใน auth.users ของ Supabase */
  authUserId: string;
  /** id ในตาราง users ของเรา */
  dbUserId: string;
  email: string;
  role: 'customer' | 'staff' | 'merchant_admin' | 'platform_admin';
  /** ร้านค้าที่ผู้ใช้คนนี้เข้าถึงได้ (สังกัด + เป็นเจ้าของ) */
  tenantIds: string[];
}

/**
 * SupabaseAuthGuard — ตรวจ access token ของ Supabase Auth ที่หน้าเว็บส่งมา
 *
 * วิธีตรวจ: เรียก /auth/v1/user ของ Supabase ด้วย token นั้น (ใช้ได้กับทุกอัลกอริทึมที่ Supabase เซ็น)
 * แล้ว map ไปยังแถวใน users เพื่อรู้ role และร้านค้าที่เข้าถึงได้
 *
 * cache ผลไว้สั้น ๆ เพื่อไม่ให้ยิง Supabase ทุก request
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly cache = new Map<string, { user: AppUser; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly db: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const header: string = req.headers?.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_REQUIRED,
        message: 'Access token is required',
      });
    }

    const cached = this.cache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      req.appUser = cached.user;
      return true;
    }

    const user = await this.resolveUser(token);
    this.cache.set(token, { user, expiresAt: Date.now() + this.CACHE_TTL_MS });
    this.pruneCache();

    req.appUser = user;
    return true;
  }

  private async resolveUser(token: string): Promise<AppUser> {
    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    if (!url || !anonKey) {
      throw new InternalServerErrorException({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'SUPABASE_URL or SUPABASE_ANON_KEY is not configured on backend',
      });
    }

    // 1) ให้ Supabase ยืนยันว่า token นี้ใช้ได้จริงและยังไม่หมดอายุ
    let res: Response;
    try {
      res = await fetch(`${url}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      });
    } catch (err) {
      this.logger.error('Error fetching Supabase auth user:', err);
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_INVALID,
        message: 'Invalid or expired access token',
      });
    }

    if (!res.ok) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_INVALID,
        message: 'Invalid or expired access token',
      });
    }

    const authUser: any = await res.json();
    if (!authUser?.id) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_INVALID,
        message: 'Invalid user data returned from authentication provider',
      });
    }

    // 2) map ไปยังตาราง users ของเรา เพื่อดู role
    const dbUser = await this.db.selectOne<any>(
      `users?auth_user_id=eq.${authUser.id}&select=id,role,tenant_id,email`,
    );
    if (!dbUser) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_USER_NOT_LINKED,
        message: 'Account is not linked to any user in the system',
      });
    }

    // 3) รวบรวมร้านค้าที่เข้าถึงได้: ที่สังกัด + ที่เป็นเจ้าของ
    const tenantIds = new Set<string>();
    if (dbUser.tenant_id) tenantIds.add(dbUser.tenant_id);

    const owned = await this.db.select<any>(`tenants?owner_user_id=eq.${dbUser.id}&select=id`);
    (owned || []).forEach((t: any) => tenantIds.add(t.id));

    return {
      authUserId: authUser.id,
      dbUserId: dbUser.id,
      email: dbUser.email || authUser.email,
      role: dbUser.role,
      tenantIds: [...tenantIds],
    };
  }

  private pruneCache() {
    if (this.cache.size < 500) return;
    const now = Date.now();
    for (const [key, val] of this.cache) {
      if (val.expiresAt <= now) this.cache.delete(key);
    }
  }
}
