import { supabase } from '../lib/supabase';
import { ITAsset } from '../types';
import { cleanData } from '../utils/cleanData';
import { sanitizeDateForDb } from '../utils/date';

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
    } catch (e) {
      // Keep the original specs string when legacy JSON cannot be parsed.
    }
  }
  return {
    id: dbAsset.id,
    asset_code: dbAsset.code || undefined,
    category: dbAsset.category as any || 'Other',
    model: dbAsset.name || 'Unknown',
    serialNumber: (specsObj as any).serialNumber || '',
    purchaseDate: dbAsset.purchase_date || (specsObj as any).rawPurchaseDate || '',
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
    id, asset_code, category, model, serialNumber, purchaseDate, location,
    assignedTo, status, brand, specs, remarks, remark2, department, uom,
    purchasePrice, itemPrice, parentId, assignedToAssetId, currency,
    purchaseRecordId, maintenanceDueDate, addedBy, supplier, peripherals,
  } = asset;

  const validPurchaseDate = sanitizeDateForDb(purchaseDate);
  const extraFields = {
    serialNumber, brand, specs, remarks, remark2, uom, purchasePrice, itemPrice,
    assignedToAssetId, currency, purchaseRecordId, maintenanceDueDate, addedBy,
    supplier, peripherals, rawPurchaseDate: purchaseDate || undefined,
  };

  // Preserve the existing schema and legacy data format. Extra UI fields remain
  // embedded in specs until the database schema is intentionally migrated.
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
    purchase_date: validPurchaseDate,
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

const getAssetPrefix = (category: string) => {
  const c = (category || '').toLowerCase();
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

export const generateNextAssetCode = async (category: string, currentOffset = 0): Promise<string> => {
  const catKey = (category || 'other').toLowerCase().replace(/\s+/g, '_');
  const prefix = getAssetPrefix(category);

  // Preferred path: atomic Postgres function. This prevents two users creating
  // the same asset number at the same time.
  const { data: rpcData, error: rpcError } = await supabase.rpc('next_asset_counter', {
    p_counter_id: `assetCode_${catKey}`,
    p_offset: currentOffset,
  });

  if (!rpcError && typeof rpcData === 'number') {
    return `${prefix}${String(rpcData).padStart(3, '0')}`;
  }

  // Backward-compatible fallback for environments where the migration has not
  // been applied yet. Existing installations continue to work while the SQL
  // migration is deployed.
  if (rpcError) {
    console.warn('[Assets] Atomic counter RPC unavailable; using legacy counter fallback.', rpcError.message);
  }

  const { data, error: fetchError } = await supabase
    .from('asset_counters')
    .select('count')
    .eq('id', `assetCode_${catKey}`)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

  const nextNum = (data?.count || 0) + 1 + currentOffset;
  const { error: upsertError } = await supabase
    .from('asset_counters')
    .upsert({
      id: `assetCode_${catKey}`,
      count: nextNum,
      updated_at: new Date().toISOString(),
    });

  if (upsertError) throw upsertError;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

export const saveAsset = async (asset: Partial<ITAsset>): Promise<string | undefined> => {
  let code = asset.asset_code;
  if (!asset.id && !code && asset.category) {
    code = await generateNextAssetCode(asset.category);
  }

  const payload = mapAssetToDatabase({
    ...asset,
    id: asset.id || crypto.randomUUID(),
    asset_code: code,
  });

  const { error } = await supabase.from('assets').upsert({
    ...cleanData(payload),
    updated_at: new Date().toISOString(),
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
  status: ITAsset['status'],
  additionalFields: Partial<ITAsset> = {}
): Promise<void> => {
  const { data: existingData, error: fetchErr } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();
  if (fetchErr) throw fetchErr;

  const existingAsset = mapAssetFromDatabase(existingData);
  const updatedAsset = {
    ...existingAsset,
    assignedTo: assignedUser,
    location,
    department,
    status,
    ...additionalFields,
  };
  const payload = mapAssetToDatabase(updatedAsset);

  const { error } = await supabase
    .from('assets')
    .update({ ...cleanData(payload), updated_at: new Date().toISOString() })
    .eq('id', assetId);

  if (error) {
    console.error('Error updating asset assignment:', error);
    throw error;
  }
};

// These migration hooks are intentionally explicit instead of silently claiming
// success. The UI can surface the error and prevent operators from believing a
// migration completed when no migration actually ran.
export const initializeAssetCodeCounters = async () => {
  throw new Error('Asset counter initialization is managed by the Supabase migration.');
};

export const importLegacyExcelData = async (_rows: any[]) => {
  throw new Error('Legacy Excel import is not implemented in the current Supabase-only build.');
};

export const migrateAssetsToSequentialCodes = async (_dryRun = false) => {
  throw new Error('Asset code migration is managed by the Supabase migration.');
};

export const importKeyboardsMigration = async () => {
  throw new Error('Keyboard migration is not implemented in the current Supabase-only build.');
};

export const subscribeToAssets = (callback: (assets: ITAsset[]) => void) => {
  const channel = supabase
    .channel('assets_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, async () => {
      try {
        callback(await fetchAssets());
      } catch (err) {
        console.error('Failed to refresh assets on change', err);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
