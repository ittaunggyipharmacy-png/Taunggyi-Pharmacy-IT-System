import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserRole, SystemUser } from '../../../types';
import {
  loginWithGoogle as authLogin,
  loginWithCredentials as authLoginWithCredentials,
  logout as authLogout
} from '../../../services/authService';
import { syncSystemUser } from '../../../services/userService';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<SystemUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState<boolean>(false);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);

      if (user) {
        try {
          const profile = await syncSystemUser(user);
          setUserProfile(profile);

          if (profile) {
            setIsAdmin(
              profile.role === UserRole.IT_SUPERVISOR ||
              profile.role === UserRole.IT_SUPERVISOR_CAPS ||
              profile.role === UserRole.ADMIN ||
              profile.role === UserRole.ADMIN_CAPS
            );
          }

          try {
            const userChannel = supabase.channel(`user-profile-${user.id}`)
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'app_users',
                  filter: `id=eq.${user.id}`
                },
                (payload) => {
                  if (payload.new) {
                    const updatedProfile = payload.new as SystemUser;
                    setUserProfile(updatedProfile);
                    setIsAdmin(
                      updatedProfile.role === UserRole.IT_SUPERVISOR ||
                      updatedProfile.role === UserRole.IT_SUPERVISOR_CAPS ||
                      updatedProfile.role === UserRole.ADMIN ||
                      updatedProfile.role === UserRole.ADMIN_CAPS
                    );
                  }
                }
              )
              .subscribe();

            unsubUserDoc = () => {
              supabase.removeChannel(userChannel);
            };
          } catch (e) {
            console.error('User profile subscription failed', e);
          }
        } catch (err) {
          console.error('Error syncing user profile:', err);
          setUserProfile(null);
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }

      setAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const login = useCallback(async () => {
    await authLogin();
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
  }, []);

  /**
   * Authenticates with Supabase Auth. No mock users or local user IDs are used.
   */
  const loginWithCredentials = useCallback(async (username?: string, password?: string) => {
    if (!username || !password) return false;

    const email = username.trim();
    try {
      await authLoginWithCredentials(email, password);
      return true;
    } catch (error) {
      console.error('Credential login failed:', error);
      return false;
    }
  }, []);

  return {
    currentUser,
    userProfile,
    isAdmin,
    authReady,
    login,
    loginWithCredentials,
    logout,
    setUserProfile,
    setIsAdmin
  };
}
