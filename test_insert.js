import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase.from('assets').select('*').limit(1);
  if (data && data.length > 0) {
    const { error: updErr } = await supabase.from('assets').update({ remarks: data[0].remarks }).eq('id', data[0].id);
    console.log('Update Error:', updErr);
  }
}
main();
