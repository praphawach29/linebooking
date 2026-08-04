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

export function useLiffProfile(liffId?: string) {
  const [profile, setProfile] = useState<LiffProfileData>({
    lineUserId: '',
    displayName: 'ลูกค้า LINE User',
    pictureUrl: '',
    isLoggedIn: false,
    isInClient: false,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const targetLiffId = liffId || '2010969802-QiiDBSxa';

    async function initLiff() {
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

          if (isMounted) {
            setProfile({
              lineUserId: userProfile.userId,
              displayName: userProfile.displayName,
              pictureUrl: userProfile.pictureUrl || '',
              statusMessage: userProfile.statusMessage,
              email: userEmail,
              isLoggedIn: true,
              isInClient,
              isLoading: false,
            });
          }
        } else {
          if (isMounted) {
            setProfile((prev) => ({
              ...prev,
              isInClient,
              isLoggedIn: false,
              isLoading: false,
            }));
          }
        }
      } catch (err: any) {
        console.error('LIFF Profile Init Error:', err);
        if (isMounted) {
          setProfile((prev) => ({
            ...prev,
            isLoading: false,
            error: err?.message || 'Failed to initialize LIFF',
          }));
        }
      }
    }

    initLiff();

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
      window.location.reload();
    }
  };

  return { ...profile, login, logout };
}
