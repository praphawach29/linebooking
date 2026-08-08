import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { getSupabaseUrl } from './supabase-env';

/**
 * SupabaseService — เรียก Supabase REST (PostgREST) ด้วย service role key
 *
 * ใช้ service role เพราะ worker เก็บเงินทำงานเบื้องหลัง ไม่มี session ของผู้ใช้
 * จึงต้องข้าม RLS — ห้ามเปิด endpoint ที่รับ table/filter จากผู้ใช้ตรง ๆ
 *
 * ENV: SUPABASE_URL, SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);

  get isConfigured(): boolean {
    return !!(getSupabaseUrl() && this.adminKey);
  }

  private get adminKey(): string | undefined {
    return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  private headers(extra: Record<string, string> = {}) {
    const key = this.adminKey as string;
    const headers: Record<string, string> = {
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...extra,
    };

    // Opaque sb_secret keys must only be sent through apikey. Legacy
    // service_role JWTs still require Authorization for PostgREST.
    if (!key.startsWith('sb_secret_')) {
      headers.Authorization = `Bearer ${key}`;
    }

    return headers;
  }

  private async request<T = any>(path: string, method: string, body?: any, extraHeaders?: Record<string, string>): Promise<T | null> {
    if (!this.isConfigured) {
      this.logger.warn('ยังไม่ได้ตั้ง SUPABASE_URL / Supabase admin key — ข้ามการเรียกฐานข้อมูล');
      return null;
    }

    const res = await fetch(`${getSupabaseUrl()}/rest/v1/${path}`, {
      method,
      headers: this.headers(extraHeaders),
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      this.logger.error(`Supabase ${method} ${path} → ${res.status}: ${text}`);
      throw new InternalServerErrorException(`ฐานข้อมูลตอบกลับผิดพลาด: ${res.status}`);
    }
    return text ? (JSON.parse(text) as T) : null;
  }

  select<T = any>(path: string): Promise<T[] | null> {
    return this.request<T[]>(path, 'GET');
  }

  async selectOne<T = any>(path: string): Promise<T | null> {
    const rows = await this.select<T>(path);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async insert<T = any>(table: string, row: any): Promise<T | null> {
    const rows = await this.request<T[]>(table, 'POST', row);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async update<T = any>(pathWithFilter: string, patch: any): Promise<T | null> {
    const rows = await this.request<T[]>(pathWithFilter, 'PATCH', patch);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  /** upsert โดยชนที่คอลัมน์ conflict ที่ระบุ */
  async upsert<T = any>(table: string, row: any, onConflict: string): Promise<T | null> {
    const rows = await this.request<T[]>(`${table}?on_conflict=${onConflict}`, 'POST', row, {
      Prefer: 'return=representation,resolution=merge-duplicates',
    });
    return rows && rows.length > 0 ? rows[0] : null;
  }

  delete(pathWithFilter: string): Promise<any> {
    return this.request(pathWithFilter, 'DELETE');
  }
}
