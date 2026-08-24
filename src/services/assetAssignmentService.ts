import { supabase } from '../lib/supabase';
import { AssetAssignment, AssetAssignedUser, ITAsset } from '../types';

export interface AssetAssignmentRecord extends AssetAssignment {
  user: AssetAssignedUser | null;
  asset: ITAsset | null;
}

const mapAssignment = (row: any): AssetAssignmentRecord => ({
  id: row.id,
  assetId: row.asset_id,
  userId: row.user_id,
  assignedDate: row.assigned_date,
  assignedBy: row.assigned_by,
  returnDate: row.return_date,
  returnReason: row.return_reason,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  user: row.user
    ? {
        uid: row.user.uid,
        employeeId: row.user.employee_id,
        displayName: row.user.display_name,
        email: row.user.email,
        position: row.user.position,
        role: row.user.role,
        department: row.user.department,
        branch: row.user.branch,
        photoURL: row.user.photo_url,
      }
    : null,
  asset: row.asset
    ? {
        ...row.asset,
        asset_code: row.asset.code,
        model: row.asset.name,
        assignedTo: row.asset.assignee || 'Unassigned',
        purchaseDate: row.asset.purchase_date || '',
        parentId: row.asset.parent_id || null,
        serialNumber: '',
      }
    : null,
});

const assignmentSelect = `
  *,
  user:app_users(
    uid,
    employee_id,
    display_name,
    email,
    position,
    role,
    department,
    branch,
    photo_url
  ),
  asset:assets(
    id,
    code,
    name,
    category,
    status,
    department,
    location,
    assignee,
    purchase_date,
    specs,
    parent_id
  )
`;

export const getActiveAssetAssignment = async (assetId: string): Promise<AssetAssignmentRecord | null> => {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select(assignmentSelect)
    .eq('asset_id', assetId)
    .eq('status', 'Active')
    .maybeSingle();

  if (error) throw error;
  return data ? mapAssignment(data) : null;
};

export const getAssetAssignmentHistory = async (assetId: string): Promise<AssetAssignmentRecord[]> => {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select(assignmentSelect)
    .eq('asset_id', assetId)
    .order('assigned_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const getUserAssetAssignments = async (userId: string): Promise<AssetAssignmentRecord[]> => {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select(assignmentSelect)
    .eq('user_id', userId)
    .eq('status', 'Active')
    .order('assigned_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const getUserAssignmentHistory = async (userId: string): Promise<AssetAssignmentRecord[]> => {
  const { data, error } = await supabase
    .from('asset_assignments')
    .select(assignmentSelect)
    .eq('user_id', userId)
    .order('assigned_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const assignAssetToUser = async ({
  assetId,
  userId,
  assignedDate,
  assignedBy,
  notes,
}: {
  assetId: string;
  userId: string;
  assignedDate?: string;
  assignedBy?: string;
  notes?: string;
}): Promise<string> => {
  const { data: user, error: userError } = await supabase
    .from('app_users')
    .select('uid, display_name, department, branch')
    .eq('uid', userId)
    .single();

  if (userError) throw userError;

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('id, status, location')
    .eq('id', assetId)
    .single();

  if (assetError) throw assetError;

  const allowedStatuses = ['Active', 'In Stock', 'New'];
  if (!allowedStatuses.includes(asset.status)) {
    throw new Error(`Asset status '${asset.status}' cannot be assigned.`);
  }

  const { data, error } = await supabase
    .from('asset_assignments')
    .insert({
      asset_id: assetId,
      user_id: userId,
      assigned_date: assignedDate || new Date().toISOString().slice(0, 10),
      assigned_by: assignedBy || null,
      notes: notes || null,
      status: 'Active',
    })
    .select('id')
    .single();

  if (error) throw error;

  const { error: assetUpdateError } = await supabase
    .from('assets')
    .update({
      assignee: user.display_name || 'Unassigned',
      department: user.department || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId);

  if (assetUpdateError) throw assetUpdateError;
  return data.id;
};

export const returnAsset = async ({
  assignmentId,
  returnDate,
  returnReason,
  notes,
}: {
  assignmentId: string;
  returnDate?: string;
  returnReason?: string;
  notes?: string;
}): Promise<void> => {
  const { data: assignment, error: assignmentError } = await supabase
    .from('asset_assignments')
    .select('asset_id')
    .eq('id', assignmentId)
    .single();

  if (assignmentError) throw assignmentError;

  const { error } = await supabase
    .from('asset_assignments')
    .update({
      status: 'Returned',
      return_date: returnDate || new Date().toISOString().slice(0, 10),
      return_reason: returnReason || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId);

  if (error) throw error;

  const { error: assetError } = await supabase
    .from('assets')
    .update({
      assignee: 'Unassigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignment.asset_id);

  if (assetError) throw assetError;
};

export const subscribeToAssetAssignments = (callback: () => void) => {
  const channel = supabase
    .channel('asset_assignments_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_assignments' }, callback)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
