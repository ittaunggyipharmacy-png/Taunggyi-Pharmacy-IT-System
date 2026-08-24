import { supabase } from '../lib/supabase';
import { ITAsset } from '../types';
import { cleanData } from '../utils/cleanData';

export const mapAssetFromDatabase = (dbAsset: any): ITAsset => {
  let specsObj = {};
  let specsStr = dbAsset.specs || '';
  if (specsStr.startsWith('{')) {
    try {
      const parsed = JSON.parse(specsStr);
      if (parsed && typeof parsed === 'object') {
        specsObj = parsed;
        specsStr = parsed.specs || '';
      }
    } catch(e) {}
  }
  return {
    id: dbAsset.id,
    asset_code: dbAsset.code || undefined,
    category: dbAsset.category as any || 'Other',
    model: dbAsset.name || 'Unknown',
    serialNumber: (specsObj as any).serialNumber || '',
    purchaseDate: dbAsset.purchase_date || '',
    location: dbAsset.location || '',
    assignedTo: dbAsset.assignee || 'Unassigned',
    status: dbAsset.status as any || 'Active',
    brand: (specsObj as any).brand || '',
    specs: specsStr,
    remarks: (specsObj as any).remarks || '',
    remark2: (specsObj as any).remark2 || '',
    department: dbAsset.department || '',
    uom: (specsObj as any).uom || '',
    purchasePrice: (specsObj as any).purchasePrice || '',
    itemPrice: (specsObj as any).itemPrice || 0,
    parentId: dbAsset.parent_id || null,
    assignedToAssetId: (specsObj as any).assignedToAssetId || null,
    currency: (specsObj as any).currency || '',
    purchaseRecordId: (specsObj as any).purchaseRecordId || '',
    maintenanceDueDate: (specsObj as any).maintenanceDueDate || '',
    addedBy: (specsObj as any).addedBy || '',
    supplier: (specsObj as any).supplier || '',
    peripherals: (specsObj as any).peripherals || undefined,
  };
};

export const mapAssetToDatabase = (asset: Partial<ITAsset>): any => {
  const {
    id,
    asset_code,
    category,
    model,
    serialNumber,
    purchaseDate,
    location,
    assignedTo,
    status,
    brand,
    specs,
    remarks,
    remark2,
    department,
    uom,
    purchasePrice,
    itemPrice,
    parentId,
    assignedToAssetId,
    currency,
    purchaseRecordId,
    maintenanceDueDate,
    addedBy,
    supplier,
    peripherals,
  } = asset;

  const extraFields = {
    serialNumber,
    brand,
    specs,
    remarks,
    remark2,
    uom,
    purchasePrice,
    itemPrice,
    assignedToAssetId,
    currency,
    purchaseRecordId,
    maintenanceDueDate,
    addedBy,
    supplier,
    peripherals,
  };
  
  // NOTE: For now, we stringify extraFields into specs to prevent data loss without altering schema.
  // The UI expects 'specs' to be the original string, so we embed it inside the JSON.
  const specsPayload = JSON.stringify(cleanData(extraFields));

  return {
    id,
    code: asset_code,
    name: model,
    category,
    status,
    department,
    location,
    assignee: assignedTo,
    purchase_date: purchaseDate || null,
    specs: specsPayload,
    parent_id: parentId || null,
  };
};

export const fetchAssets = async (): Promise<ITAsset[]> => {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }
  return (data || []).map(mapAssetFromDatabase);
};

export const generateNextAssetCode = async (category: string, currentOffset: number = 0): Promise<string> => {
  const catKey = (category || 'other').toLowerCase().replace(/\s+/g, '_');
  const { data, error: fetchError } = await supabase
    .from('asset_counters')
    .select('count')
    .eq('id', `assetCode_${catKey}`)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  const lastNum = data?.count || 0;
  const nextNum = lastNum + 1 + currentOffset;

  const { error: upsertError } = await supabase
    .from('asset_counters')
    .upsert({ id: `assetCode_${catKey}`, count: nextNum, updated_at: new Date().toISOString() });

  if (upsertError) {
    throw upsertError;
  }

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
};

export const saveAsset = async (asset: Partial<ITAsset>): Promise<string | undefined> => {
  let code = asset.asset_code;
  if (!asset.id && !code && asset.category) {
    code = await generateNextAssetCode(asset.category);
  }
  
  const payload = mapAssetToDatabase({
    ...asset,
    id: asset.id || crypto.randomUUID(),
    asset_code: code
  });

  const { error } = await supabase.from('assets').upsert({
    ...cleanData(payload),
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error('Error saving asset:', error);
    throw error;
  }

  asset.id = payload.id;
  if (code) asset.asset_code = code;
  return payload.id;
};

export const deleteAsset = async (assetId: string): Promise<void> => {
  const { error } = await supabase.from('assets').delete().eq('id', assetId);
  if (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
};

export const clearAllAssets = async (): Promise<void> => {
  const { error } = await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Error clearing assets:', error);
    throw error;
  }
};

export const updateAssetAssignment = async (
  assetId: string,
  assignedUser: string,
  location: string,
  department: string,
  status: ITAsset["status"],
  additionalFields: Partial<ITAsset> = {}
): Promise<void> => {
  // First, fetch the existing asset so we can map it properly without losing extraFields
  const { data: existingData, error: fetchErr } = await supabase.from('assets').select('*').eq('id', assetId).single();
  if (fetchErr) throw fetchErr;

  const existingAsset = mapAssetFromDatabase(existingData);
  
  const updatedAsset = {
    ...existingAsset,
    assignedTo: assignedUser,
    location,
    department,
    status,
    ...additionalFields
  };

  const payload = mapAssetToDatabase(updatedAsset);

  const { error } = await supabase
    .from('assets')
    .update({
      ...cleanData(payload),
      updated_at: new Date().toISOString()
    })
    .eq('id', assetId);

  if (error) {
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
      try {
        const assets = await fetchAssets();
        callback(assets);
      } catch (err) {
        console.error("Failed to refresh assets on change", err);
      }
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};
