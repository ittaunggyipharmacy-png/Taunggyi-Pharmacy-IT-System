import { createClient } from "@supabase/supabase-js";
import { normalizePharmacyLogin } from "@shared/pharmacyAuth";

const projectUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(projectUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type PharmacyRole =
  | "super_admin"
  | "it_supervisor"
  | "finance_manager"
  | "asset_editor"
  | "document_manager"
  | "staff_viewer"
  | "disabled";

export type PharmacyProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: PharmacyRole;
  approved: boolean;
};

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error("Supabase has not been configured yet.");
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signInWithUsernamePassword(username: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase has not been configured yet.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizePharmacyLogin(username),
    password,
  });

  if (error) {
    throw error;
  }
}

export async function loadCurrentProfile(userId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, approved")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PharmacyProfile | null;
}
