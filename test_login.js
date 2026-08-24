import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@tgp.com',
    password: 'Tgp@admin123',
  });
  
  if (error) {
    console.error('Error logging in:', error);
  } else {
    console.log('Logged in:', data.user?.id);
  }
}
main();
