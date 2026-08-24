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
    } catch (e) {}
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

  const validPurchaseDate = sanitizeDateForDb(purchaseDate);
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
    rawPurchaseDate: purchaseDate || undefined,
  };

  // Preserve the current database shape so existing data and UI behavior are not changed.
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

/**
 * Generate an asset code atomically in Postgres.
 * This replaces the old read-then-upsert counter logic, which could issue
 * duplicate codes when two users created assets at the same time.
 */
export const generateNextAssetCode = async (category: string, currentOffset: number = 0): Promise<string> => {
  const calls = Math.max(1, Math.floor(currentOffset) + 1);
  let code = '';

  for (let i = 0; i < calls; i += 1) {
    const { data, error } = await supabase.rpc('next_asset_code', {
      p_category: category || 'other'
    });

    if (error) {
      console.error('Error generating asset code:', error);
      throw error;
    }

    if (!data || typeof data !== 'string') {
      throw new Error('Asset code generator returned an invalid value.');
    }

    code = data;
  }

  return code;
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

// Kept as explicit no-op compatibility functions so existing imports do not break.
// Actual migration/import workflows should be implemented only when their source data contract is defined.
export const initializeAssetCodeCounters = async () => ({ success: true });

export const importLegacyExcelData = async (_rows: any[]) => ({
  success: false,
  count: 0,
  assets: [] as any[],
  message: 'Legacy Excel import is not implemented in this build.'
});

export const migrateAssetsToSequentialCodes = async (_dryRun = false) => ({
  success: false,
  message: 'Sequential asset-code migration is not implemented in this build.'
});

export const importKeyboardsMigration = async () => ({
  success: false,
  message: 'Keyboard migration is not implemented in this build.'
});

export const subscribeToAssets = (callback: (assets: ITAsset[]) => void) => {
  const channel = supabase
    .channel('assets_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, async () => {
      try {
        const assets = await fetchAssets();
        callback(assets);
      } catch (err) {
        console.error('Failed to refresh assets on change', err);
      }
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};
