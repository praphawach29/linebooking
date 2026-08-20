import { createClient } from '@supabase/supabase-js';

const metaEnv =
  typeof import.meta !== 'undefined' && (import.meta as any)?.env
    ? (import.meta as any).env
    : typeof process !== 'undefined' && process?.env
    ? process.env
    : {};

const supabaseUrl = metaEnv?.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = metaEnv?.VITE_SUPABASE_ANON_KEY || 'mock-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

