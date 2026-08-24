import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserRole, SystemUser } from '../../../types';
import {
  loginWithGoogle as authLogin,
  logout as authLogout
} from '../../../services/authService';
import { syncSystemUser } from '../../../services/userService';

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

const isAdminRole = (role?: UserRole) =>
  role === UserRole.IT_SUPERVISOR ||
  role === UserRole.IT_SUPERVISOR_CAPS ||
  role === UserRole.ADMIN ||
  role === UserRole.ADMIN_CAPS;

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<SystemUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribeUserProfile: (() => void) | null = null;

    const handleSession = async (session: { user?: AuthUser | null } | null) => {
      const user = session?.user ?? null;
      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        const profile = await syncSystemUser(user as Parameters<typeof syncSystemUser>[0]);
        setUserProfile(profile);
        setIsAdmin(isAdminRole(profile?.role));

        if (unsubscribeUserProfile) unsubscribeUserProfile();

        const userChannel = supabase
          .channel(`user-profile-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'app_users',
              filter: `uid=eq.${user.id}`
            },
            (payload) => {
              if (payload.new) {
                const updatedProfile = payload.new as SystemUser;
                setUserProfile(updatedProfile);
                setIsAdmin(isAdminRole(updatedProfile.role));
              }
            }
          )
          .subscribe();

        unsubscribeUserProfile = () => {
          void supabase.removeChannel(userChannel);
        };
      } catch (error) {
        console.error('Error syncing user profile:', error);
        setUserProfile(null);
        setIsAdmin(false);
      } finally {
        setAuthReady(true);
      }
    };

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Failed to restore auth session:', error);
      await handleSession(data.session);
    };

    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
      if (unsubscribeUserProfile) unsubscribeUserProfile();
    };
  }, []);

  const login = useCallback(async () => {
    await authLogin();
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
  }, []);

  const loginWithCredentials = useCallback(async (username?: string, password?: string) => {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      console.error('Local admin login is not configured. Set VITE_ADMIN_USERNAME and VITE_ADMIN_PASSWORD.');
      return false;
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return false;
    }

    // Preserve the existing local-admin workflow without storing credentials in source code.
    const mockUser: AuthUser = {
      id: 'mock-admin-id',
      email: 'tgpadmin@taunggyipharmacy.local',
      user_metadata: { name: username }
    };

    const profile: SystemUser = {
      uid: mockUser.id,
      email: mockUser.email || '',
      displayName: username || 'Admin',
      role: UserRole.ADMIN,
      isAdmin: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    setCurrentUser(mockUser);
    setUserProfile(profile);
    setIsAdmin(true);
    setAuthReady(true);
    return true;
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
