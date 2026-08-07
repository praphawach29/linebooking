import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { onboardMerchant } from '../lib/merchant-onboarding';

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
    let userRow: any = null;

    // 1. Try by id matching auth UUID
    const { data: dataById } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (dataById) {
      userRow = dataById;
    } else {
      // 2. Try by auth_user_id
      const { data: dataByAuthId } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', supabaseUser.id)
        .maybeSingle();
      if (dataByAuthId) userRow = dataByAuthId;
    }

    if (!userRow) return null;

    return {
      id: supabaseUser.id,
      dbUserId: userRow.id,
      email: supabaseUser.email || userRow.email || '',
      displayName: userRow.display_name || userRow.displayName || '',
      role: userRow.role || 'merchant_admin',
      tenantId: userRow.tenant_id || userRow.tenantId || null,
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
      let user = await fetchDbUser(data.user);

      // Auto-recovery: If account exists in Auth but shop profile wasn't created OR tenant_id is NULL
      const needsShop = !user || !user.tenantId;
      if (needsShop) {
        const defaultShopName = `ร้านค้าของ ${data.user.email?.split('@')[0] || 'ฉัน'}`;
        if (data.session?.access_token) {
          try {
            const result = await onboardMerchant(data.session.access_token, {
              displayName: user?.displayName || data.user.email?.split('@')[0] || 'เจ้าของร้าน',
              shopName: defaultShopName,
              businessType: 'other',
            });
            user = result.user;
          } catch (onboardingError) {
            return {
              error:
                onboardingError instanceof Error
                  ? onboardingError.message
                  : 'ไม่สามารถสร้างข้อมูลร้านค้าได้',
            };
          }
        }
      }

      if (!user || !user.tenantId) {
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

    // 2. Check if user ALREADY has an active shop profile in public.users table
    let existingShop = false;
    const { data: existingById } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', authUserId)
      .maybeSingle();

    if (existingById?.tenant_id) {
      existingShop = true;
    } else {
      const { data: existingByAuthId } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      if (existingByAuthId?.tenant_id) existingShop = true;
    }

    if (existingShop) {
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

    try {
      const result = await onboardMerchant(activeSession.access_token, {
        displayName,
        shopName,
        businessType,
        phone,
      });
      setAuthUser(result.user);
    } catch (onboardingError) {
      return {
        error:
          onboardingError instanceof Error
            ? onboardingError.message
            : 'ไม่สามารถสร้างข้อมูลร้านค้าได้',
      };
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
