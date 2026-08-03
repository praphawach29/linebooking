import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AppUser } from './supabase-auth.guard';

/**
 * PlatformAdminGuard — เฉพาะ Super Admin เท่านั้น
 * ใช้กับ endpoint ที่กระทบทั้งระบบ เช่น อนุมัติสลิป, สั่งรอบเก็บเงินด้วยมือ
 *
 * ต้องวางต่อจาก SupabaseAuthGuard เสมอ (ต้องมี req.appUser ก่อน)
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: AppUser | undefined = context.switchToHttp().getRequest().appUser;

    if (!user || user.role !== 'platform_admin') {
      throw new ForbiddenException('ต้องเป็นผู้ดูแลระบบ (platform_admin) เท่านั้น');
    }
    return true;
  }
}
