import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  loadCurrentProfile,
  type PharmacyProfile,
  supabase,
} from "@/lib/supabase";

type AuthState = {
  loading: boolean;
  user: User | null;
  accessToken: string | null;
  profile: PharmacyProfile | null;
  error: string | null;
};

export function usePharmacyAuth() {
  const [state, setState] = useState<AuthState>({
    loading: isSupabaseConfigured,
    user: null,
    accessToken: null,
    profile: null,
    error: null,
  });

  useEffect(() => {
    if (!supabase) {
      setState({
        loading: false,
        user: null,
        accessToken: null,
        profile: null,
        error: "Supabase production settings have not been added yet.",
      });
      return undefined;
    }

    let active = true;

    async function hydrate(session: Session | null) {
      const user = session?.user ?? null;
      if (!user) {
        if (active) {
          setState({ loading: false, user: null, accessToken: null, profile: null, error: null });
        }
        return;
      }

      try {
        const profile = await loadCurrentProfile(user.id);
        if (active) {
          setState({ loading: false, user, accessToken: session?.access_token ?? null, profile, error: null });
        }
      } catch (error) {
        if (active) {
          setState({
            loading: false,
            user,
            accessToken: session?.access_token ?? null,
            profile: null,
            error: error instanceof Error ? error.message : "Unable to load your pharmacy access profile.",
          });
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrate(session);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    isConfigured: isSupabaseConfigured,
    isApproved: Boolean(state.profile?.approved && state.profile.role !== "disabled"),
    async signOut() {
      await supabase?.auth.signOut();
    },
  };
}
