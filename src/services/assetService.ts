import { supabase } from '../lib/supabase';
import { ITAsset } from '../types';
import { cleanData } from '../utils/cleanData';

export const fetchAssets = async (): Promise<ITAsset[]> => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as ITAsset[];
  } catch (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
};

export const generateNextAssetCode = async (category: string, currentOffset: number = 0): Promise<string> => {
  const catKey = (category || 'other').toLowerCase().replace(/\s+/g, '_');
  try {
    const { data } = await supabase
      .from('asset_counters')
      .select('count')
      .eq('id', `assetCode_${catKey}`)
      .single();

    let lastNum = data?.count || 0;
    const nextNum = lastNum + 1 + currentOffset;

    await supabase
      .from('asset_counters')
      .upsert({ id: `assetCode_${catKey}`, count: nextNum, updated_at: new Date().toISOString() });

    const getPrefix = (cat: string) => {
      const c = (cat || '').toLowerCase();
      if (c === 'computer') return 'TG-PC-';
      if (c === 'keyboard') return 'TG-KB-';
      if (c === 'mouse') return 'TG-MS-';
      if (c === 'fan') return 'TG-FN-';
      if (c === 'usb hub' || c === 'usb') return 'TG-UB-';
      if (c === 'printer') return 'TG-PR-';
      if (c === 'phone' || c === 'mobile') return 'TG-PH-';
      if (c === 'scanner') return 'TG-SC-';
      return 'TG-ACC-';
    };

    return `${getPrefix(category)}${String(nextNum).padStart(3, '0')}`;
  } catch (error) {
    return `TG-ACC-${Math.floor(Math.random() * 900 + 100)}`;
  }
};

export const saveAsset = async (asset: Partial<ITAsset>): Promise<string | undefined> => {
  try {
    let code = asset.asset_code;
    if (!asset.id && !code && asset.category) {
      code = await generateNextAssetCode(asset.category);
    }
    const rec = {
      id: asset.id || crypto.randomUUID(),
      asset_code: code,
      ...cleanData(asset),
      updated_at: new Date().toISOString()
    };
    await supabase.from('assets').upsert(rec);
    asset.id = rec.id;
    if (code) asset.asset_code = code;
    return rec.id;
  } catch (error) {
    console.error('Error saving asset:', error);
    throw error;
  }
};

export const deleteAsset = async (assetId: string): Promise<void> => {
  try {
    const { error } = await supabase.from('assets').delete().eq('id', assetId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
};

export const clearAllAssets = async (): Promise<void> => {
  try {
    await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (error) {
    console.error('Error clearing assets:', error);
    throw error;
  }
};

export const updateAssetAssignment = async (
  assetId: string,
  assignedUser: string,
  location: string,
  department: string,
  status: string,
  additionalFields: Partial<ITAsset> = {}
): Promise<void> => {
  try {
    await supabase
      .from('assets')
      .update({
        assignee: assignedUser,
        location,
        department,
        status,
        ...cleanData(additionalFields),
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);
  } catch (error) {
    console.error('Error updating asset assignment:', error);
    throw error;
  }
};

export const initializeAssetCodeCounters = async () => {
  return { success: true };
};

export const importLegacyExcelData = async (_rows: any[]) => {
  return { success: true, count: 0, assets: [] as any[], message: '' };
};

export const migrateAssetsToSequentialCodes = async (_dryRun = false) => {
  return { success: true };
};

export const importKeyboardsMigration = async () => {
  return { success: true };
};

export const subscribeToAssets = (callback: (assets: ITAsset[]) => void) => {
  const channel = supabase
    .channel('assets_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, async () => {
      const assets = await fetchAssets();
      callback(assets);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
