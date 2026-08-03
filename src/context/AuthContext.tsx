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
    if (authError || !authData.user) return { error: authError?.message || 'ไม่สามารถสร้างบัญชีได้' };

    // Check if account already exists (identities is empty for duplicate emails in Supabase Auth)
    if (authData.user.identities && authData.user.identities.length === 0) {
      return { error: 'อีเมลนี้มีบัญชีในระบบอยู่แล้ว กรุณาเข้าสู่ระบบแทน' };
    }

    // 2. Ensure an active session is established
    let activeSession = authData.session;
    if (!activeSession) {
      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      activeSession = signInData?.session || null;
    }

    if (!activeSession) {
      return {
        error: 'บัญชีถูกสร้างแล้ว แต่ต้องยืนยันอีเมลก่อนเปิดร้าน กรุณาตรวจสอบกล่องข้อความอีเมลของคุณ',
      };
    }

    const authUserId = authData.user.id;
    const slug = shopName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);

    // 3. Create tenant record
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

    if (tenantError) return { error: `ไม่สามารถสร้างข้อมูลร้านค้าได้: ${tenantError.message}` };

    // 4. Create user record linked to auth user + tenant
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

    // 5. Update tenant owner & update local auth user context
    await supabase
      .from('tenants')
      .update({ owner_user_id: userId })
      .eq('id', tenantId);

    const userProfile = await fetchDbUser(authData.user);
    if (userProfile) setAuthUser(userProfile);

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
