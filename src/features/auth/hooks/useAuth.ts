import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserRole, SystemUser } from '../../../types';
import { loginWithGoogle as authLogin, logout as authLogout } from '../../../services/authService';
import { syncSystemUser } from '../../../services/userService';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<SystemUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await syncSystemUser(user);
          setUserProfile(profile);
          if (profile) setIsAdmin([UserRole.IT_SUPERVISOR, UserRole.IT_SUPERVISOR_CAPS, UserRole.ADMIN, UserRole.ADMIN_CAPS].includes(profile.role));
          const userChannel = supabase.channel(`user-profile-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users', filter: `uid=eq.${user.id}` }, (payload) => {
              if (payload.new) {
                const updatedProfile = payload.new as SystemUser;
                setUserProfile(updatedProfile);
                setIsAdmin([UserRole.IT_SUPERVISOR, UserRole.IT_SUPERVISOR_CAPS, UserRole.ADMIN, UserRole.ADMIN_CAPS].includes(updatedProfile.role));
              }
            }).subscribe();
          unsubUserDoc = () => { supabase.removeChannel(userChannel); };
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
    return () => { subscription.unsubscribe(); if (unsubUserDoc) unsubUserDoc(); };
  }, []);

  const login = useCallback(async () => { await authLogin(); }, []);
  const logout = useCallback(async () => { await authLogout(); }, []);

  const loginWithCredentials = useCallback(async (username?: string, password?: string) => {
    const identifier = username?.trim();
    if (!identifier || !password) return false;

    // Username lookup must work before authentication, so use the restricted RPC
    // instead of selecting app_users directly (which is protected by authenticated-only RLS).
    const { data: email, error: lookupError } = await supabase.rpc('get_auth_email_by_username', { p_username: identifier });
    if (lookupError || !email) {
      console.error('Username lookup failed:', lookupError);
      return false;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Credential login failed:', error);
      return false;
    }
    return true;
  }, []);

  return { currentUser, userProfile, isAdmin, authReady, login, loginWithCredentials, logout, setUserProfile, setIsAdmin };
}
