import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@tgp.com',
    password: 'Tgp@admin123',
  });
  
  if (error) {
    console.error('Error signing up:', error);
  } else {
    console.log('User created:', data);
  }
}
main();
