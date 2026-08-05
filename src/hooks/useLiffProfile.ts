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
  error?: string;
}

let cachedProfile: LiffProfileData | null = null;
let liffPromise: Promise<LiffProfileData> | null = null;

async function getOrInitLiff(targetLiffId: string): Promise<LiffProfileData> {
  if (cachedProfile && !cachedProfile.isLoading) {
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

        const data: LiffProfileData = {
          lineUserId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl || '',
          statusMessage: userProfile.statusMessage,
          email: userEmail,
          isLoggedIn: true,
          isInClient,
          isLoading: false,
        };
        cachedProfile = data;
        return data;
      } else {
        const data: LiffProfileData = {
          lineUserId: '',
          displayName: 'ลูกค้า LINE User',
          pictureUrl: '',
          isLoggedIn: false,
          isInClient,
          isLoading: false,
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
    return {
      lineUserId: '',
      displayName: 'ลูกค้า LINE User',
      pictureUrl: '',
      isLoggedIn: false,
      isInClient: false,
      isLoading: true,
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
      cachedProfile = null;
      window.location.reload();
    }
  };

  return { ...profile, login, logout };
}
