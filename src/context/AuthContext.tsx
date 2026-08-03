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
      .maybeSingle();

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
        return {
          error: 'บัญชีนี้ยังไม่ได้ลงทะเบียนเปิดร้านค้า กรุณาไปที่หน้าสมัครสมาชิกเพื่อกรอกข้อมูลเปิดร้าน',
        };
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
    // 1. Create auth user or recover existing auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

    let authUserId: string | null = authData?.user?.id || null;
    let activeSession = authData?.session || null;

    const isExistingAuthUser =
      (authData?.user?.identities && authData.user.identities.length === 0) ||
      (authError && authError.message.toLowerCase().includes('already registered'));

    if (isExistingAuthUser || !authUserId) {
      // Attempt to sign in with password to obtain active session and user id for orphaned auth account
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr || !signInData?.user) {
        return { error: 'อีเมลนี้มีบัญชีในระบบอยู่แล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านของคุณ' };
      }
      authUserId = signInData.user.id;
      activeSession = signInData.session;
    }

    // 2. Check if user ALREADY has a shop profile in public.users table
    const { data: existingDbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (existingDbUser) {
      return { error: 'อีเมลนี้มีร้านค้าในระบบอยู่แล้ว กรุณาเข้าสู่ระบบแทน' };
    }

    // 3. Ensure an active session is established for RLS authorization
    if (!activeSession) {
      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      activeSession = signInData?.session || null;
    }

    if (!activeSession) {
      return {
        error: 'บัญชีถูกสร้างแล้ว แต่ต้องยืนยันอีเมลก่อนเปิดร้าน กรุณาตรวจสอบกล่องข้อความอีเมลของคุณ',
      };
    }

    const slug = shopName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);

    // 4. Create tenant record
    const tenantId = crypto.randomUUID();
    const { error: tenantError } = await supabase.from('tenants').insert({
      id: tenantId,
      name: shopName,
      slug,
      business_type: businessType,
      is_active: true,
      settings: { currency: 'THB', autoConfirm: false, depositPercentage: 0 },
    });

    if (tenantError) return { error: `ไม่สามารถสร้างข้อมูลร้านค้าได้: ${tenantError.message}` };

    // 5. Create user record linked to auth user + tenant
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

    if (userError) return { error: `ไม่สามารถสร้างโปรไฟล์ผู้ใช้ได้: ${userError.message}` };

    // 6. Update tenant owner & hydrate local auth user context
    await supabase
      .from('tenants')
      .update({ owner_user_id: userId })
      .eq('id', tenantId);

    const { data: currentAuth } = await supabase.auth.getUser();
    if (currentAuth?.user) {
      const userProfile = await fetchDbUser(currentAuth.user);
      if (userProfile) setAuthUser(userProfile);
    }

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
