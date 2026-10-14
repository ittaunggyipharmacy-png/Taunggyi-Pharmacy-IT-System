import { supabase } from '../lib/supabase';
/** Stable pagination prevents the API's default row cap from silently truncating exports. */
export async function readRows(table: string, order = 'id', ascending = true): Promise<any[]> {
 const rows: any[] = [];
 const size = 500;
 for (let offset = 0; ; offset += size) {
  let query = supabase.from(table).select('*').order(order, { ascending });
  if (order !== 'id') query = query.order('id');
  const { data, error } = await query.range(offset, offset + size - 1);
  if (error) throw error;
  rows.push(...(data || []));
  if (!data || data.length < size) return rows;
 }
}
