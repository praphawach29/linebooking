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
        const tenantId = crypto.randomUUID();
        const defaultShopName = `ร้านค้าของ ${data.user.email?.split('@')[0] || 'ฉัน'}`;
        const slug = 'shop-' + Date.now().toString(36);

        // 1. Create tenant record
        const { error: tenantError } = await supabase.from('tenants').insert({
          id: tenantId,
          name: defaultShopName,
          slug,
          business_type: 'other',
          is_active: true,
          settings: { currency: 'THB', autoConfirm: false, depositPercentage: 0 },
        });

        if (!tenantError) {
          if (!user) {
            // 2a. No user row at all — create one
            const { error: userError } = await supabase.from('users').insert({
              id: data.user.id,
              tenant_id: tenantId,
              display_name: data.user.email?.split('@')[0] || 'เจ้าของร้าน',
              email: data.user.email || email,
            });
            if (!userError) {
              await supabase.from('tenants').update({ owner_user_id: data.user.id }).eq('id', tenantId);
            }
          } else {
            // 2b. User row exists but has no tenant — just link it
            await supabase
              .from('users')
              .update({ tenant_id: tenantId })
              .eq('id', user.dbUserId);
            await supabase.from('tenants').update({ owner_user_id: user.dbUserId }).eq('id', tenantId);
          }
          user = await fetchDbUser(data.user);
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

    // 5. Create or update user record linked to auth user + tenant
    // Use authUserId directly as users.id to guarantee 1:1 mapping with auth.users
    const userPayload: Record<string, any> = {
      id: authUserId,
      tenant_id: tenantId,
      display_name: displayName,
      email,
      phone,
    };

    let { error: userError } = await supabase.from('users').insert(userPayload);

    if (userError) {
      // If user row already exists for this auth user, update its tenant_id
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          tenant_id: tenantId,
          display_name: displayName,
          email,
          phone,
        })
        .eq('id', authUserId);

      if (updateErr) {
        return { error: `ไม่สามารถสร้างโปรไฟล์ผู้ใช้ได้: ${userError.message}` };
      }
    }

    // 6. Update tenant owner & hydrate local auth user context
    await supabase
      .from('tenants')
      .update({ owner_user_id: authUserId })
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
