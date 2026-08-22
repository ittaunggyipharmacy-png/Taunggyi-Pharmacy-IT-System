import { supabase } from '../lib/supabase';
import { RenewalRecord } from '../types';
import { cleanData } from '../utils/cleanData';

export const fetchRenewals = async (): Promise<RenewalRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('renewals')
      .select('*')
      .order('order_index', { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as RenewalRecord[];
  } catch (error) {
    console.error('Error fetching renewals:', error);
    return [];
  }
};

export const saveRenewal = async (renewal: Partial<RenewalRecord>): Promise<string | undefined> => {
  try {
    const rec = {
      id: renewal.id || crypto.randomUUID(),
      ...cleanData(renewal),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('renewals').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving renewal:', error);
    throw error;
  }
};

export const deleteRenewal = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('renewals').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting renewal:', error);
    throw error;
  }
};

export const updateRenewalOrder = async (renewals: RenewalRecord[]): Promise<void> => {
  try {
    for (let i = 0; i < renewals.length; i++) {
      await supabase.from('renewals').update({ order_index: i + 1 }).eq('id', renewals[i].id);
    }
  } catch (error) {
    console.error('Error updating renewal order:', error);
    throw error;
  }
};

export const subscribeToRenewals = (callback: (renewals: RenewalRecord[]) => void) => {
  const channel = supabase
    .channel('renewals_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'renewals' }, async () => {
      const renewals = await fetchRenewals();
      callback(renewals);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
