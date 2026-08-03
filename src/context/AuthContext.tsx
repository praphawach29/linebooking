import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthUser {
  id: string;               // auth.users UUID
  dbUserId: string;         // users table UUID
  email: string;
  displayName: string;
  role: 'customer' | 'staff' | 'merchant_admin' | 'platform_admin';
  tenantId: string | null;
}

interface AuthContextType {
  session: Session | null;
  authUser: AuthUser | null;
  isAuthLoading: boolean;

  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string, shopName: string, businessType: string, phone: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Fetch our custom user record from 'users' table using auth UUID
  const fetchDbUser = async (supabaseUser: User): Promise<AuthUser | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, role, tenant_id')
      .eq('auth_user_id', supabaseUser.id)
      .single();

    if (error || !data) return null;

    return {
      id: supabaseUser.id,
      dbUserId: data.id,
      email: supabaseUser.email || '',
      displayName: data.display_name,
      role: data.role,
      tenantId: data.tenant_id,
    };
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const user = await fetchDbUser(session.user);
        setAuthUser(user);
      }
      setIsAuthLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const user = await fetchDbUser(session.user);
        setAuthUser(user);
      } else {
        setAuthUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const user = await fetchDbUser(data.user);
      if (!user) {
        return { error: 'ไม่พบข้อมูลโปรไฟล์ร้านค้าในระบบ กรุณาสมัครสมาชิกเปิดร้านก่อนเข้าสู่ระบบ' };
      }
      setAuthUser(user);
    }
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    shopName: string,
    businessType: string,
    phone: string,
  ): Promise<{ error: string | null }> => {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !authData.user) return { error: authError?.message || 'Failed to create account' };

    // Supabase only issues a session immediately when email confirmation is
    // disabled. Without a session, the tenant/user inserts below are sent as
    // anon (not authenticated) and RLS rejects them with a misleading
    // "Failed to create shop profile" error. Fail clearly here instead.
    if (!authData.session) {
      return {
        error:
          'บัญชีถูกสร้างแล้ว แต่ต้องยืนยันอีเมลก่อนจึงจะเปิดร้านได้ กรุณาตรวจสอบอีเมลของคุณ',
      };
    }

    const authUserId = authData.user.id;
    const slug = shopName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);

    // 2. Create tenant record
    // The id is generated client-side and the insert does not select the row
    // back: RLS only lets an authenticated user SELECT a tenant it already
    // owns (via my_tenant_ids(), which resolves through the `users` table),
    // but that ownership link is not created until step 3 below. Requesting
    // the row back here (e.g. via `.select().single()`, which sends
    // `Prefer: return=representation`) makes PostgREST re-check RLS on the
    // just-inserted row and fail with a 403 RLS error even though the INSERT
    // itself would have succeeded.
    const tenantId = crypto.randomUUID();
    const { error: tenantError } = await supabase.from('tenants').insert({
      id: tenantId,
      name: shopName,
      slug,
      business_type: businessType,
      plan: 'free',
      is_active: true,
      settings: { currency: 'THB', autoConfirm: false, depositPercentage: 0 },
    });

    if (tenantError) return { error: 'Failed to create shop profile' };

    // 3. Create user record linked to auth user + tenant
    // Safe to select the row back here: `users_self_read` allows a user to
    // read its own row (`auth_user_id = auth.uid()`) immediately on insert.
    const userId = crypto.randomUUID();
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      auth_user_id: authUserId,
      tenant_id: tenantId,
      display_name: displayName,
      email,
      phone,
      role: 'merchant_admin',
    });

    if (userError) return { error: 'Failed to create user profile' };

    // 4. Update tenant owner
    await supabase
      .from('tenants')
      .update({ owner_user_id: userId })
      .eq('id', tenantId);

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, authUser, isAuthLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
