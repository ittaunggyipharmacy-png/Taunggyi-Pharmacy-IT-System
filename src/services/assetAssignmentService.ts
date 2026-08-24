import { supabase } from '../lib/supabase';
import { AssetAssignment, AssetAssignedUser, AssetPerson, ITAsset } from '../types';

export interface AssetAssignmentRecord extends AssetAssignment {
  user: AssetAssignedUser | null;
  assetPerson: AssetPerson | null;
  asset: ITAsset | null;
}

const mapAssetPerson = (row: any): AssetPerson | null => {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    fullName: row.full_name,
    position: row.position,
    department: row.department,
    branch: row.branch,
    phone: row.phone,
    email: row.email,
    status: row.status,
    notes: row.notes,
    linkedUserId: row.linked_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapAssignment = (row: any): AssetAssignmentRecord => ({
  id: row.id,
  assetId: row.asset_id,
  userId: row.user_id,
  assetPersonId: row.asset_person_id,
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
  assetPerson: mapAssetPerson(row.asset_person),
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

// asset_assignments has two foreign keys to app_users (user_id and assigned_by).
// The explicit FK name is required so PostgREST does not report an ambiguous relationship.
const assignmentSelect = `
  *,
  user:app_users!asset_assignments_user_id_fkey(
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
  asset_person:asset_people!asset_assignments_asset_person_id_fkey(
    id,
    employee_id,
    full_name,
    position,
    department,
    branch,
    phone,
    email,
    status,
    notes,
    linked_user_id,
    created_at,
    updated_at
  ),
  asset:assets!asset_assignments_asset_id_fkey(
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
  const { data, error } = await supabase.from('asset_assignments').select(assignmentSelect).eq('asset_id', assetId).eq('status', 'Active').maybeSingle();
  if (error) throw error;
  return data ? mapAssignment(data) : null;
};

export const getAssetAssignmentHistory = async (assetId: string): Promise<AssetAssignmentRecord[]> => {
  const { data, error } = await supabase.from('asset_assignments').select(assignmentSelect).eq('asset_id', assetId).order('assigned_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const getUserAssetAssignments = async (userId: string): Promise<AssetAssignmentRecord[]> => {
  const { data, error } = await supabase.from('asset_assignments').select(assignmentSelect).eq('user_id', userId).eq('status', 'Active').order('assigned_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const getUserAssignmentHistory = async (userId: string): Promise<AssetAssignmentRecord[]> => {
  const { data, error } = await supabase.from('asset_assignments').select(assignmentSelect).eq('user_id', userId).order('assigned_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const getAssetPeople = async (search = ''): Promise<AssetPerson[]> => {
  let query = supabase.from('asset_people').select('*').order('full_name', { ascending: true });
  if (search.trim()) {
    const value = search.trim();
    query = query.or(`full_name.ilike.%${value}%,employee_id.ilike.%${value}%,department.ilike.%${value}%,branch.ilike.%${value}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAssetPerson).filter(Boolean) as AssetPerson[];
};

export const createAssetPerson = async (person: Omit<AssetPerson, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetPerson> => {
  const { data, error } = await supabase.from('asset_people').insert({
    employee_id: person.employeeId || null,
    full_name: person.fullName,
    position: person.position || null,
    department: person.department || null,
    branch: person.branch || null,
    phone: person.phone || null,
    email: person.email || null,
    status: person.status || 'Active',
    notes: person.notes || null,
    linked_user_id: person.linkedUserId || null,
  }).select('*').single();
  if (error) throw error;
  return mapAssetPerson(data)!;
};

export const updateAssetPerson = async (person: AssetPerson): Promise<void> => {
  const { error } = await supabase.from('asset_people').update({
    employee_id: person.employeeId || null,
    full_name: person.fullName,
    position: person.position || null,
    department: person.department || null,
    branch: person.branch || null,
    phone: person.phone || null,
    email: person.email || null,
    status: person.status || 'Active',
    notes: person.notes || null,
    linked_user_id: person.linkedUserId || null,
    updated_at: new Date().toISOString(),
  }).eq('id', person.id);
  if (error) throw error;
};

export const getAssetPersonAssignments = async (assetPersonId: string, includeHistory = false): Promise<AssetAssignmentRecord[]> => {
  let query = supabase.from('asset_assignments').select(assignmentSelect).eq('asset_person_id', assetPersonId).order('assigned_date', { ascending: false });
  if (!includeHistory) query = query.eq('status', 'Active');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const assignAssetToPerson = async ({
  assetId,
  assetPersonId,
  assignedDate,
  assignedBy,
  notes,
}: {
  assetId: string;
  assetPersonId: string;
  assignedDate?: string;
  assignedBy?: string;
  notes?: string;
}): Promise<string> => {
  const { data: person, error: personError } = await supabase.from('asset_people').select('*').eq('id', assetPersonId).single();
  if (personError) throw personError;

  const { data: asset, error: assetError } = await supabase.from('assets').select('id, status').eq('id', assetId).single();
  if (assetError) throw assetError;

  if (!['Active', 'In Stock', 'New'].includes(asset.status)) {
    throw new Error(`Asset status '${asset.status}' cannot be assigned.`);
  }

  const { data, error } = await supabase.from('asset_assignments').insert({
    asset_id: assetId,
    asset_person_id: assetPersonId,
    user_id: person.linked_user_id || null,
    assigned_date: assignedDate || new Date().toISOString().slice(0, 10),
    assigned_by: assignedBy || null,
    notes: notes || null,
    status: 'Active',
  }).select('id').single();
  if (error) throw error;

  const { error: assetUpdateError } = await supabase.from('assets').update({
    assignee: person.full_name,
    department: person.department || null,
    branch: person.branch || undefined,
    updated_at: new Date().toISOString(),
  }).eq('id', assetId);
  if (assetUpdateError) throw assetUpdateError;
  return data.id;
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
  const { data: user, error: userError } = await supabase.from('app_users').select('uid, display_name, department, branch').eq('uid', userId).single();
  if (userError) throw userError;

  const { data: asset, error: assetError } = await supabase.from('assets').select('id, status').eq('id', assetId).single();
  if (assetError) throw assetError;
  if (!['Active', 'In Stock', 'New'].includes(asset.status)) throw new Error(`Asset status '${asset.status}' cannot be assigned.`);

  const { data: existingPerson } = await supabase.from('asset_people').select('id').eq('linked_user_id', userId).maybeSingle();
  let assetPersonId = existingPerson?.id;
  if (!assetPersonId) {
    const { data: person, error: personError } = await supabase.from('asset_people').insert({
      employee_id: null,
      full_name: user.display_name || 'Unknown User',
      department: user.department || null,
      branch: user.branch || null,
      linked_user_id: userId,
      status: 'Active',
    }).select('id').single();
    if (personError) throw personError;
    assetPersonId = person.id;
  }

  return assignAssetToPerson({ assetId, assetPersonId, assignedDate, assignedBy, notes });
};

export const returnAsset = async ({ assignmentId, returnDate, returnReason, notes }: { assignmentId: string; returnDate?: string; returnReason?: string; notes?: string; }): Promise<void> => {
  const { data: assignment, error: assignmentError } = await supabase.from('asset_assignments').select('asset_id').eq('id', assignmentId).single();
  if (assignmentError) throw assignmentError;

  const { error } = await supabase.from('asset_assignments').update({
    status: 'Returned',
    return_date: returnDate || new Date().toISOString().slice(0, 10),
    return_reason: returnReason || null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', assignmentId);
  if (error) throw error;

  const { error: assetError } = await supabase.from('assets').update({ assignee: 'Unassigned', updated_at: new Date().toISOString() }).eq('id', assignment.asset_id);
  if (assetError) throw assetError;
};

export const subscribeToAssetAssignments = (callback: () => void) => {
  const channel = supabase.channel('asset_assignments_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'asset_assignments' }, callback).subscribe();
  return () => { supabase.removeChannel(channel); };
};
