import { supabase } from '../lib/supabase';
export async function driveRequest(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sign in required.');
  const response = await fetch('/api/drive/' + path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${data.session.access_token}` } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'File operation failed.');
  return result;
}
