import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function testUpdate(personId: string, newName: string) {
    console.log(`Testing rename for ${personId} to ${newName}`);
    // find old name
    const { data: p } = await supabase.from('asset_people').select('full_name').eq('id', personId).single();
    if (!p) { console.log('not found'); return; }
    const oldName = p.full_name;
    console.log(`Old name was ${oldName}`);

    // find active assignments
    const { data: assignments } = await supabase.from('asset_assignments').select('asset_id').eq('asset_person_id', personId).eq('status', 'Active');
    
    const assetIds = (assignments || []).map(a => a.asset_id);
    console.log('Asset IDs:', assetIds);
    
    if (assetIds.length > 0) {
        const { error } = await supabase.from('assets').update({ assignee: newName }).in('id', assetIds);
        console.log('Update assets error:', error);
    }
}
testUpdate('809febbc-48bb-404d-8727-89f91bd80c4e', 'Aung Kaung Myat 2');
