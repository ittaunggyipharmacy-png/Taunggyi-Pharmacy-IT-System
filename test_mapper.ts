import { ITAsset } from './src/types';

export const mapAssetFromDatabase = (dbAsset: any): ITAsset => {
  return {
    id: dbAsset.id,
    asset_code: dbAsset.code || undefined,
    category: dbAsset.category as any || 'Other',
    model: dbAsset.name || 'Unknown', // mapped to name
    serialNumber: '', // Missing in DB
    purchaseDate: dbAsset.purchase_date || '',
    location: dbAsset.location || '',
    assignedTo: dbAsset.assignee || 'Unassigned',
    status: dbAsset.status as any || 'Active',
    brand: '', // Missing in DB
    specs: dbAsset.specs || '',
    department: dbAsset.department || '',
    parentId: dbAsset.parent_id || null,
  };
};

export const mapAssetToDatabase = (asset: Partial<ITAsset>): any => {
  return {
    id: asset.id,
    code: asset.asset_code,
    name: asset.model, // mapped to model
    category: asset.category,
    status: asset.status,
    department: asset.department,
    location: asset.location,
    assignee: asset.assignedTo,
    purchase_date: asset.purchaseDate || null,
    specs: asset.specs,
    parent_id: asset.parentId || null,
    // Omitting fields not in DB to prevent schema errors
  };
};
