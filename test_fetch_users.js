import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase.from('app_users').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}
main();
