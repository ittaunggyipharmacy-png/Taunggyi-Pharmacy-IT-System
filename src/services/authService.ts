import { supabase } from '../lib/supabase';
import { UserRole, SystemUser } from '../types';

// Supabase processes the OAuth callback in this tab, avoiding cross-window token transfer.
export const initAuthPopupHandler = () => {};

/**
 * Initiates Google OAuth login via popup window.
 */
export const loginWithGoogle = async (): Promise<void> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: false,
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    });

    if (error) throw error;

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url);
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Signs out the current user session.
 */
export const logout = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};

/**
 * Gets the current active Supabase user session.
 */
export const getAuthSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

/**
 * Subscribes to authentication state changes.
 */
export const subscribeToAuthState = (callback: (user: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => subscription.unsubscribe();
};
