import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function main() {
  const { data, error } = await supabase.from('assets').select('*').limit(1);
  console.log("Assets:", data);
  const { data: cols, error: err2 } = await supabase.rpc('get_columns', { table_name: 'assets' });
  console.log("Cols:", cols, err2);
}
main();
