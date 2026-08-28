import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  const errorMessage = `[Supabase] Missing required environment variable(s): ${missingVars.join(', ')}. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.`;
  console.error(errorMessage);
}

// Resilient custom fetch that retries on transient network disconnects (Failed to fetch)
const resilientFetch: typeof fetch = async (input, init) => {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      return response;
    } catch (err: any) {
      lastError = err;
      const isNetworkError =
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('network');

      if (isNetworkError && attempt < maxRetries) {
        // Exponential backoff with small jitter (300ms, 700ms, 1200ms)
        const delay = (attempt + 1) * 350 + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: resilientFetch,
    },
  }
);


