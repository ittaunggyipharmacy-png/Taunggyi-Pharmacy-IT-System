import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserRole, SystemUser } from '../../../types';
import { 
  loginWithGoogle as authLogin, 
  logoutUser as authLogout, 
  syncSystemUser, 
  isUserAdmin 
} from '../../../services/authService';

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
            setIsAdmin(isUserAdmin(profile.role));
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
                  setIsAdmin(isUserAdmin(updatedProfile.role));
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

  return {
    currentUser,
    userProfile,
    isAdmin,
    authReady,
    login,
    logout,
    setUserProfile,
    setIsAdmin
  };
}
