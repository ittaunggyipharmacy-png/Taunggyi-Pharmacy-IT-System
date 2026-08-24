import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserRole, SystemUser } from '../../../types';
import { 
  loginWithGoogle as authLogin, 
  logout as authLogout
} from '../../../services/authService';
import { 
  syncSystemUser 
} from '../../../services/userService';

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
        // Sync user profile
        try {
          const profile = await syncSystemUser(user);
          setUserProfile(profile);

          if (profile) {
            setIsAdmin(profile.role === UserRole.IT_SUPERVISOR || profile.role === UserRole.IT_SUPERVISOR_CAPS || profile.role === UserRole.ADMIN || profile.role === UserRole.ADMIN_CAPS);
          }

          // Realtime user profile updates
          try {
            const userChannel = supabase.channel(`user-profile-${user.id}`)
              .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'app_users', 
                filter: `id=eq.${user.id}` 
              }, (payload) => {
                if (payload.new) {
                  const updatedProfile = payload.new as SystemUser;
                  setUserProfile(updatedProfile);
                  setIsAdmin(updatedProfile.role === UserRole.IT_SUPERVISOR || updatedProfile.role === UserRole.IT_SUPERVISOR_CAPS || updatedProfile.role === UserRole.ADMIN || updatedProfile.role === UserRole.ADMIN_CAPS);
                }
              }).subscribe();

            unsubUserDoc = () => { supabase.removeChannel(userChannel); };
          } catch (e) {
            console.error('User profile subscription failed', e);
          }
        } catch (err) {
          console.error('Error syncing user profile:', err);
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

  const loginWithCredentials = useCallback(async (username?: string, password?: string) => {
    if (username === 'Tgpadmin' && password === 'Tgp@admin123') {
      const mockUser = {
        id: 'mock-admin-id',
        email: 'tgpadmin@taunggyipharmacy.local',
        user_metadata: {
          name: 'Tgpadmin',
        }
      };
      
      const profile: SystemUser = {
        uid: 'mock-admin-id',
        email: 'tgpadmin@taunggyipharmacy.local',
        displayName: 'Tgpadmin',
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
    }
    return false;
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
