import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppUser } from '../guards/supabase-auth.guard';

/**
 * @CurrentUser() — ดึงผู้ใช้ที่ผ่าน SupabaseAuthGuard มาแล้ว
 *
 * ใช้แทนการรับ userId จาก body เพราะ body ปลอมได้
 * (เช่น reviewerId ตอนอนุมัติสลิป ต้องมาจาก token เท่านั้น)
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AppUser => {
  return ctx.switchToHttp().getRequest().appUser;
});
