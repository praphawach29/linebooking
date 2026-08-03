import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * ประกาศเป็น @Global เพราะทั้ง billing module และ auth guard ต้องใช้ตัวเดียวกัน
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
