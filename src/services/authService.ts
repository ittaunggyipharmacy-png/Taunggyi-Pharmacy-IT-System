import { supabase } from '../lib/supabase';
import { UserRole, SystemUser } from '../types';

/**
 * Initializes listeners for Supabase authentication in iframe and popup environments.
 * Handles the SUPABASE_AUTH_COMPLETED cross-window message safely without triggering page reload.
 */
export const initAuthPopupHandler = () => {
  if (typeof window === 'undefined') return;

  // If this window is a popup and has an access token in the URL, close it after Supabase processes it
  if (window.opener && window.location.hash.includes('access_token')) {
    setTimeout(() => {
      try {
        window.opener.postMessage(
          {
            type: 'SUPABASE_AUTH_COMPLETED',
            hash: window.location.hash
          },
          '*'
        );
        window.close();
      } catch (err) {
        console.error('Failed to notify opener popup:', err);
      }
    }, 1500);
  }

  // In the main window, listen for the popup closing / message
  if (!window.opener) {
    window.addEventListener('message', async (event) => {
      if (event.data && event.data.type === 'SUPABASE_AUTH_COMPLETED') {
        const hash = event.data.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          }
        }
      } else if (event.data === 'SUPABASE_AUTH_COMPLETED') {
        await supabase.auth.getSession();
      }
    });
  }
};

/**
 * Initiates Google OAuth login via popup window.
 */
export const loginWithGoogle = async (): Promise<void> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    });

    if (error) throw error;

    if (data?.url && typeof window !== 'undefined') {
      window.open(data.url, 'oauth_popup', 'width=600,height=700');
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
