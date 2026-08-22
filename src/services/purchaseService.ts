import { supabase } from '../lib/supabase';
import { PurchaseRecord } from '../types';
import { cleanData } from '../utils/cleanData';

export const fetchPurchases = async (): Promise<PurchaseRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as PurchaseRecord[];
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return [];
  }
};

export const savePurchaseRecord = async (record: Partial<PurchaseRecord>): Promise<string | undefined> => {
  try {
    const rec = {
      id: record.id || crypto.randomUUID(),
      ...cleanData(record),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('purchases').upsert(rec);
    if (error) throw error;
    return rec.id;
  } catch (error) {
    console.error('Error saving purchase record:', error);
    throw error;
  }
};

export const deletePurchaseRecord = async (recordId: string): Promise<void> => {
  try {
    const { error } = await supabase.from('purchases').delete().eq('id', recordId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting purchase record:', error);
    throw error;
  }
};

export const subscribeToPurchases = (callback: (purchases: PurchaseRecord[]) => void) => {
  const channel = supabase
    .channel('purchases_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, async () => {
      const purchases = await fetchPurchases();
      callback(purchases);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
