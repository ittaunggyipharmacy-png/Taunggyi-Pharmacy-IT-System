import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserRole, SystemUser } from '../../../types';
import { loginWithGoogle as authLogin, logout as authLogout } from '../../../services/authService';
import { getSystemUser, syncSystemUser } from '../../../services/userService';

const ADMIN_ROLES = [
  UserRole.IT_SUPERVISOR,
  UserRole.IT_SUPERVISOR_CAPS,
  UserRole.ADMIN,
  UserRole.ADMIN_CAPS,
];

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<SystemUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let activeUserId: string | null = null;

    const clearProfileChannel = async () => {
      if (profileChannel) {
        const channel = profileChannel;
        profileChannel = null;
        await supabase.removeChannel(channel);
      }
      activeUserId = null;
    };

    const applyProfile = (profile: SystemUser | null) => {
      if (!mounted) return;
      setUserProfile(profile);
      setIsAdmin(!!profile && (profile.isAdmin === true || ADMIN_ROLES.includes(profile.role)));
    };

    const loadAuthenticatedUser = async (user: any) => {
      if (!mounted || !user) return;

      // Ignore stale async work if another account has already signed in/out.
      const userId = user.id as string;
      activeUserId = userId;

      try {
        const profile = await syncSystemUser(user);
        if (!mounted || activeUserId !== userId) return;
        applyProfile(profile);

        // Create exactly one realtime channel per signed-in user. The previous
        // implementation created a new channel on every token refresh, which
        // could leave duplicate subscriptions and cause UI state flicker.
        if (!profileChannel) {
          profileChannel = supabase
            .channel(`user-profile-${userId}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'app_users', filter: `uid=eq.${userId}` },
              (payload) => {
                if (!mounted || activeUserId !== userId || !payload.new) return;
                // Realtime payloads use database column names (snake_case), not
                // the application's SystemUser shape. Re-fetch the mapped
                // profile instead of casting the raw row, otherwise is_admin
                // can be lost and an admin can appear to be logged out.
                void getSystemUser(userId).then((updatedProfile) => {
                  if (!mounted || activeUserId !== userId) return;
                  applyProfile(updatedProfile);
                });
              }
            )
            .subscribe();
        }
      } catch (err) {
        if (!mounted || activeUserId !== userId) return;
        console.error('Error syncing user profile:', err);
        applyProfile(null);
      }
    };

    const handleSession = async (session: any) => {
      const user = session?.user || null;

      if (!user) {
        activeUserId = null;
        if (mounted) {
          setCurrentUser(null);
          applyProfile(null);
        }
        await clearProfileChannel();
        return;
      }

      if (!mounted) return;
      setCurrentUser(user);

      // Do not perform database work directly inside Supabase's auth callback.
      // Deferring it prevents auth-lock contention during SIGNED_IN/TOKEN_REFRESHED.
      setTimeout(() => {
        if (mounted) void loadAuthenticatedUser(user);
      }, 0);
    };

    // Register the listener first so a sign-in cannot be missed while the
    // initial session is being read.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void handleSession(session);
    });

    // Resolve the initial session separately so authReady only becomes true
    // after the persisted session has been checked.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      void handleSession(session).finally(() => {
        if (mounted) setAuthReady(true);
      });
    }).catch((err) => {
      console.error('Initial auth session check failed:', err);
      if (mounted) {
        setCurrentUser(null);
        applyProfile(null);
        setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (profileChannel) void supabase.removeChannel(profileChannel);
    };
  }, []);

  const login = useCallback(async () => {
    await authLogin();
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
  }, []);

  const loginWithCredentials = useCallback(async (username?: string, password?: string) => {
    const identifier = username?.trim();
    if (!identifier || !password) return false;

    try {
      const { data: email, error: lookupError } = await supabase.rpc('get_auth_email_by_username', {
        p_username: identifier,
      });

      if (lookupError || !email) {
        console.error('Username lookup failed:', lookupError);
        return false;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Credential login failed:', error);
        return false;
      }

      // Confirm that Supabase actually established a session before reporting
      // success to the login screen. The auth listener will finish profile loading.
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        console.error('Credential login session verification failed:', sessionError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Credential login request failed:', error);
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
    setIsAdmin,
  };
}