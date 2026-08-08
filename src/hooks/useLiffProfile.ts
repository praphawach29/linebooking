import { useCallback, useEffect, useState } from 'react';
import liff from '@line/liff';
import {
  getCleanLiffRedirectUri,
  isLineIdTokenSessionValid,
} from '../lib/booking-auth';

export interface LiffProfileData {
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
  statusMessage?: string;
  email?: string;
  isLoggedIn: boolean;
  isInClient: boolean;
  isLoading: boolean;
  isAuthorized: boolean;
  hasIdToken: boolean;
  authCheckedOnce: boolean;
  error?: string;
}

const STORAGE_KEY = 'line_liff_profile_v1';

function getStoredProfile(): LiffProfileData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.lineUserId) {
        return {
          ...parsed,
          isLoading: false,
          authCheckedOnce: true,
          isAuthorized: Boolean(parsed.lineUserId && parsed.displayName && parsed.displayName !== 'ลูกค้า LINE User'),
        };
      }
    }
  } catch (e) {
    // Ignore storage errors
  }
  return null;
}

function saveStoredProfile(data: LiffProfileData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Ignore storage errors
  }
}

let cachedProfile: LiffProfileData | null = null;
let liffPromise: Promise<LiffProfileData> | null = null;

async function getOrInitLiff(targetLiffId: string): Promise<LiffProfileData> {
  if (liffPromise) {
    return liffPromise;
  }

  liffPromise = (async () => {
    try {
      await liff.init({ liffId: targetLiffId });

      const isInClient = liff.isInClient();
      const isLoggedIn = liff.isLoggedIn();

      if (isLoggedIn) {
        const idToken = liff.getIDToken();
        if (!idToken) {
          return {
            lineUserId: '',
            displayName: 'ลูกค้า LINE User',
            pictureUrl: '',
            isLoggedIn: true,
            isInClient,
            isLoading: false,
            isAuthorized: false,
            hasIdToken: false,
            authCheckedOnce: true,
            error: 'ไม่พบ LINE ID token กรุณาตรวจสอบว่า LIFF เปิดใช้ scope openid แล้วเข้าสู่ระบบใหม่',
          };
        }
        if (!isLineIdTokenSessionValid(targetLiffId, liff.getDecodedIDToken())) {
          liff.logout();
          cachedProfile = null;
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch (e) {
            // Ignore storage errors
          }
          liff.login({ redirectUri: getCleanLiffRedirectUri(window.location.href) });
          return {
            lineUserId: '',
            displayName: 'ลูกค้า LINE User',
            pictureUrl: '',
            isLoggedIn: false,
            isInClient,
            isLoading: true,
            isAuthorized: false,
            hasIdToken: false,
            authCheckedOnce: false,
          };
        }
        const userProfile = await liff.getProfile();
        let userEmail = '';
        try {
          const decoded = liff.getDecodedIDToken();
          if (decoded && decoded.email) {
            userEmail = decoded.email;
          }
        } catch (e) {
          // Ignore if email scope is not enabled
        }

        const isAuthorized = Boolean(userProfile.userId && userProfile.displayName);

        const data: LiffProfileData = {
          lineUserId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl || '',
          statusMessage: userProfile.statusMessage,
          email: userEmail,
          isLoggedIn: true,
          isInClient,
          isLoading: false,
          isAuthorized,
          hasIdToken: true,
          authCheckedOnce: true,
        };
        cachedProfile = data;
        saveStoredProfile(data);
        return data;
      } else {
        const data: LiffProfileData = {
          lineUserId: '',
          displayName: 'ลูกค้า LINE User',
          pictureUrl: '',
          isLoggedIn: false,
          isInClient,
          isLoading: false,
          isAuthorized: false,
          hasIdToken: false,
          authCheckedOnce: true,
        };
        cachedProfile = data;
        return data;
      }
    } catch (err: any) {
      console.error('LIFF Profile Init Error:', err);
      const data: LiffProfileData = {
        lineUserId: '',
        displayName: 'ลูกค้า LINE User',
        pictureUrl: '',
        isLoggedIn: false,
        isInClient: false,
        isLoading: false,
        isAuthorized: false,
        hasIdToken: false,
        authCheckedOnce: true,
        error: err?.message || 'Failed to initialize LIFF',
      };
      cachedProfile = data;
      return data;
    } finally {
      liffPromise = null;
    }
  })();

  return liffPromise;
}

export function useLiffProfile(liffId?: string) {
  const [profile, setProfile] = useState<LiffProfileData>(() => {
    const stored = getStoredProfile();
    if (stored) {
      return {
        ...stored,
        isLoggedIn: false,
        isLoading: true,
        isAuthorized: false,
        hasIdToken: false,
        authCheckedOnce: false,
      };
    }
    return {
      lineUserId: '',
      displayName: 'ลูกค้า LINE User',
      pictureUrl: '',
      isLoggedIn: false,
      isInClient: false,
      isLoading: true,
      isAuthorized: false,
      hasIdToken: false,
      authCheckedOnce: false,
    };
  });

  useEffect(() => {
    let isMounted = true;
    const targetLiffId = liffId?.trim();
    if (!targetLiffId) {
      setProfile((current) => ({
        ...current,
        isLoading: false,
        authCheckedOnce: true,
        error: 'ร้านค้านี้ยังไม่ได้ตั้งค่า LIFF ID',
      }));
      return () => {
        isMounted = false;
      };
    }

    setProfile((current) => ({
      ...current,
      isLoggedIn: false,
      isLoading: true,
      isAuthorized: false,
      hasIdToken: false,
      authCheckedOnce: false,
      error: undefined,
    }));

    getOrInitLiff(targetLiffId).then((data) => {
      if (isMounted) {
        setProfile(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [liffId]);

  const login = useCallback(() => {
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: getCleanLiffRedirectUri(window.location.href) });
    }
  }, []);

  const logout = useCallback(() => {
    if (liff.isLoggedIn()) {
      liff.logout();
    }
    cachedProfile = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    window.location.replace(getCleanLiffRedirectUri(window.location.href));
  }, []);

  return { ...profile, login, logout };
}
