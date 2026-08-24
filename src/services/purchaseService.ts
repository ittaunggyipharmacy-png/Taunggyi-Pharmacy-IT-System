import { supabase } from '../lib/supabase';
import { PurchaseRecord } from '../types';
import { cleanData } from '../utils/cleanData';
import { sanitizeDateForDb } from '../utils/date';

export const fetchPurchases = async (): Promise<PurchaseRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Error fetching purchases from Supabase:', error.message);
      return [];
    }
    return (data || []).map((p: any) => ({
      id: p.id,
      item: p.item || '',
      category: p.category || 'General',
      price: Number(p.price ?? p.estimated_cost ?? 0),
      currency: p.currency || 'MMK',
      quantity: Number(p.quantity ?? 1),
      date: p.date || p.request_date || (p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      supplier: p.supplier || p.requester || '',
      supplierContact: p.supplierContact || p.supplier_contact || '',
      status: p.status || 'Ordered',
      remarks: p.remarks || p.reason || '',
      serialNumber: p.serialNumber || p.serial_number || '',
      syncToInventory: !!p.syncToInventory
    })) as PurchaseRecord[];
  } catch (error) {
    console.warn('Error fetching purchases:', error);
    return [];
  }
};

export const savePurchaseRecord = async (record: Partial<PurchaseRecord>): Promise<string | undefined> => {
  try {
    const validDate = sanitizeDateForDb(record.date) || new Date().toISOString().split('T')[0];
    const rec = {
      id: record.id || crypto.randomUUID(),
      ...cleanData(record),
      date: validDate,
      request_date: validDate,
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
