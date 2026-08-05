import { useEffect, useState } from 'react';
import liff from '@line/liff';

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

let cachedProfile: LiffProfileData | null = getStoredProfile();
let liffPromise: Promise<LiffProfileData> | null = null;

async function getOrInitLiff(targetLiffId: string): Promise<LiffProfileData> {
  if (cachedProfile && !cachedProfile.isLoading && cachedProfile.authCheckedOnce) {
    return cachedProfile;
  }
  if (liffPromise) {
    return liffPromise;
  }

  liffPromise = (async () => {
    try {
      if (!liff.id) {
        await liff.init({ liffId: targetLiffId });
      }

      const isInClient = liff.isInClient();
      const isLoggedIn = liff.isLoggedIn();

      if (isLoggedIn) {
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
          authCheckedOnce: true,
        };
        cachedProfile = data;
        saveStoredProfile(data);
        return data;
      } else {
        const stored = getStoredProfile();
        if (stored && stored.lineUserId) {
          cachedProfile = stored;
          return stored;
        }
        const data: LiffProfileData = {
          lineUserId: '',
          displayName: 'ลูกค้า LINE User',
          pictureUrl: '',
          isLoggedIn: false,
          isInClient,
          isLoading: false,
          isAuthorized: false,
          authCheckedOnce: true,
        };
        cachedProfile = data;
        return data;
      }
    } catch (err: any) {
      console.error('LIFF Profile Init Error:', err);
      const stored = getStoredProfile();
      if (stored && stored.lineUserId) {
        cachedProfile = stored;
        return stored;
      }
      const data: LiffProfileData = {
        lineUserId: '',
        displayName: 'ลูกค้า LINE User',
        pictureUrl: '',
        isLoggedIn: false,
        isInClient: false,
        isLoading: false,
        isAuthorized: false,
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
    if (cachedProfile) {
      return cachedProfile;
    }
    const stored = getStoredProfile();
    if (stored) {
      cachedProfile = stored;
      return stored;
    }
    return {
      lineUserId: '',
      displayName: 'ลูกค้า LINE User',
      pictureUrl: '',
      isLoggedIn: false,
      isInClient: false,
      isLoading: false,
      isAuthorized: false,
      authCheckedOnce: false,
    };
  });

  useEffect(() => {
    let isMounted = true;
    const targetLiffId = liffId || '2010969802-QiiDBSxa';

    getOrInitLiff(targetLiffId).then((data) => {
      if (isMounted) {
        setProfile(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [liffId]);

  const login = () => {
    if (!liff.isLoggedIn()) {
      liff.login();
    }
  };

  const logout = () => {
    if (liff.isLoggedIn()) {
      liff.logout();
    }
    cachedProfile = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    window.location.reload();
  };

  return { ...profile, login, logout };
}
