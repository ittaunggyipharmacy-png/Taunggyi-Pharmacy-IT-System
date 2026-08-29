import { supabase } from '../lib/supabase';
import { AssetAssignment, AssetAssignedUser, AssetPerson, ITAsset } from '../types';

/** Asset ownership is intentionally independent from app_users. */
export interface AssetAssignmentRecord extends AssetAssignment {
  user: AssetAssignedUser | null;
  assetPerson: AssetPerson | null;
  asset: ITAsset | null;
}

const mapAssetPerson = (row: any): AssetPerson | null => row ? ({
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
  // Kept only for legacy TypeScript compatibility; Asset logic never uses it.
  linkedUserId: null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
}) : null;

const mapAssignment = (row: any): AssetAssignmentRecord => ({
  id: row.id,
  assetId: row.asset_id,
  userId: null,
  assetPersonId: row.asset_person_id,
  assignedDate: row.assigned_date,
  assignedBy: row.assigned_by,
  returnDate: row.return_date,
  returnReason: row.return_reason,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  user: null,
  assetPerson: mapAssetPerson(row.asset_person),
  asset: row.asset ? {
    ...row.asset,
    asset_code: row.asset.code,
    model: row.asset.name,
    assignedTo: row.asset.assignee || 'Unassigned',
    purchaseDate: row.asset.purchase_date || '',
    parentId: row.asset.parent_id || null,
    serialNumber: '',
  } : null,
});

const assignmentSelect = `
  *,
  asset_person:asset_people!asset_assignments_asset_person_id_fkey(
    id, employee_id, full_name, position, department, branch, phone, email, status, notes, created_at, updated_at
  ),
  asset:assets!asset_assignments_asset_id_fkey(
    id, code, name, category, status, department, location, assignee, purchase_date, specs, parent_id
  )
`;

const assetPersonAssignmentSelect = assignmentSelect;

export const getActiveAssetAssignment = async (assetId: string): Promise<AssetAssignmentRecord | null> => {
  const { data, error } = await supabase.from('asset_assignments').select(assignmentSelect)
    .eq('asset_id', assetId).eq('status', 'Active').maybeSingle();
  if (error) throw error;
  return data ? mapAssignment(data) : null;
};

export const getAssetAssignmentHistory = async (assetId: string): Promise<AssetAssignmentRecord[]> => {
  const { data, error } = await supabase.from('asset_assignments').select(assignmentSelect)
    .eq('asset_id', assetId).order('assigned_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAssignment);
};

/** Deprecated compatibility export. Asset pages must use asset_people instead. */
export const getUserAssetAssignments = async (_userId: string): Promise<AssetAssignmentRecord[]> => [];
/** Deprecated compatibility export. Asset pages must use asset_people instead. */
export const getUserAssignmentHistory = async (_userId: string): Promise<AssetAssignmentRecord[]> => [];

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

export const cleanupDuplicateAssetPeople = async (): Promise<void> => {
  const { data: people, error } = await supabase.from('asset_people').select('*');
  if (error || !people) return;
  const grouped = new Map<string, any[]>();
  for (const person of people) {
    const key = String(person.full_name || '').trim().toLowerCase();
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(person);
  }
  for (const list of grouped.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const canonical = list[0];
    for (const duplicate of list.slice(1)) {
      await supabase.from('asset_assignments').update({ asset_person_id: canonical.id }).eq('asset_person_id', duplicate.id);
      await supabase.from('asset_people').delete().eq('id', duplicate.id);
    }
  }
};

export const createAssetPerson = async (person: Omit<AssetPerson, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetPerson> => {
  const fullName = person.fullName.trim();
  if (!fullName) throw new Error('Person name is required');

  const { data: existing } = await supabase.from('asset_people').select('*').ilike('full_name', fullName);
  if (existing?.length) return mapAssetPerson(existing[0])!;

  const { data, error } = await supabase.from('asset_people').insert({
    employee_id: person.employeeId || null,
    full_name: fullName,
    position: person.position || null,
    department: person.department || null,
    branch: person.branch || null,
    phone: person.phone || null,
    email: person.email || null,
    status: person.status || 'Active',
    notes: person.notes || null,
  }).select('*').single();
  if (error) throw error;
  return mapAssetPerson(data)!;
};

export const updateAssetPerson = async (person: AssetPerson): Promise<void> => {
  const { error } = await supabase.from('asset_people').update({
    employee_id: person.employeeId || null,
    full_name: person.fullName.trim(),
    position: person.position || null,
    department: person.department || null,
    branch: person.branch || null,
    phone: person.phone || null,
    email: person.email || null,
    status: person.status || 'Active',
    notes: person.notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', person.id);
  if (error) throw error;
};

export const deleteAssetPerson = async (id: string): Promise<void> => {
  const { data: activeAssignments, error } = await supabase.from('asset_assignments').select('id')
    .eq('asset_person_id', id).eq('status', 'Active');
  if (error) throw error;
  if (activeAssignments?.length) throw new Error('This user has active asset assignments. Please return or reassign them before deleting.');

  const { error: historyError } = await supabase.from('asset_assignments').delete().eq('asset_person_id', id);
  if (historyError) throw historyError;
  const { error: deleteError } = await supabase.from('asset_people').delete().eq('id', id);
  if (deleteError) throw deleteError;
};

export const updateAssetHolderName = async (holder: { kind: 'person'; id: string }, displayName: string): Promise<void> => {
  const name = displayName.trim();
  if (!name) throw new Error('User name cannot be empty.');
  const { error } = await supabase.from('asset_people').update({ full_name: name, updated_at: new Date().toISOString() }).eq('id', holder.id);
  if (error) throw error;

  const { data: assignments, error: assignmentError } = await supabase.from('asset_assignments')
    .select('asset_id').eq('asset_person_id', holder.id).eq('status', 'Active');
  if (assignmentError) throw assignmentError;
  const assetIds = (assignments || []).map(a => a.asset_id);
  if (assetIds.length) {
    const { error: assetError } = await supabase.from('assets').update({ assignee: name, updated_at: new Date().toISOString() }).in('id', assetIds);
    if (assetError) throw assetError;
  }
};

export const getAssetPersonAssignments = async (assetPersonId: string, includeHistory = false): Promise<AssetAssignmentRecord[]> => {
  let query = supabase.from('asset_assignments').select(assetPersonAssignmentSelect)
    .eq('asset_person_id', assetPersonId).order('assigned_date', { ascending: false });
  if (!includeHistory) query = query.eq('status', 'Active');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const assignAssetToPerson = async ({
  assetId, assetPersonId, assignedDate, assignedBy, notes,
}: { assetId: string; assetPersonId: string; assignedDate?: string; assignedBy?: string; notes?: string }): Promise<string> => {
  const { data: person, error: personError } = await supabase.from('asset_people').select('*').eq('id', assetPersonId).single();
  if (personError) throw personError;
  const { data: asset, error: assetError } = await supabase.from('assets').select('id, status').eq('id', assetId).single();
  if (assetError) throw assetError;
  if (!['Active', 'In Stock', 'New'].includes(asset.status)) throw new Error(`Asset status '${asset.status}' cannot be assigned.`);

  const { data: existing } = await supabase.from('asset_assignments').select('id').eq('asset_id', assetId).eq('status', 'Active').maybeSingle();
  if (existing) throw new Error('This asset is already assigned. Return or reassign it first.');

  const safeAssignedBy = assignedBy && assignedBy !== '00000000-0000-0000-0000-000000000000' ? assignedBy : null;
  const { data, error } = await supabase.from('asset_assignments').insert({
    asset_id: assetId,
    asset_person_id: assetPersonId,
    assigned_date: assignedDate || new Date().toISOString().slice(0, 10),
    assigned_by: safeAssignedBy,
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

/** Deprecated compatibility export. Login users are not asset holders. */
export const assignAssetToUser = async (_args: { assetId: string; userId: string; assignedDate?: string; assignedBy?: string; notes?: string }): Promise<string> => {
  throw new Error('Asset assignment must target an Asset Person, not an app login user.');
};

export const returnAsset = async ({ assignmentId, returnDate, returnReason, notes }: { assignmentId: string; returnDate?: string; returnReason?: string; notes?: string }): Promise<void> => {
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

const inFlightPersonMap = new Map<string, Promise<AssetPerson | null>>();

const getOrCreatePersonByName = async (targetName: string, department?: string | null, branch?: string | null): Promise<AssetPerson | null> => {
  const key = targetName.trim().toLowerCase();
  if (!key) return null;
  const existingPromise = inFlightPersonMap.get(key);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    try {
      const { data: people } = await supabase.from('asset_people').select('*').ilike('full_name', targetName);
      if (people?.length) return mapAssetPerson(people[0]);
      return createAssetPerson({ fullName: targetName, department: department || null, branch: branch || null, status: 'Active' });
    } finally {
      setTimeout(() => inFlightPersonMap.delete(key), 2000);
    }
  })();
  inFlightPersonMap.set(key, promise);
  return promise;
};

/** Sync Asset Inventory assignee text into the independent Asset People system. */
export const syncAssetAssignmentByName = async ({
  assetId, assignedTo, department, branch, assignedDate, assignedBy,
}: { assetId: string; assignedTo?: string | null; department?: string | null; branch?: string | null; assignedDate?: string | null; assignedBy?: string | null }): Promise<void> => {
  if (!assetId) return;
  const targetName = (assignedTo || '').trim();

  const { data: activeAssignments } = await supabase.from('asset_assignments').select('id, asset_person_id')
    .eq('asset_id', assetId).eq('status', 'Active');

  if (!targetName || targetName.toLowerCase() === 'unassigned') {
    for (const assignment of activeAssignments || []) {
      await supabase.from('asset_assignments').update({
        status: 'Returned',
        return_date: new Date().toISOString().slice(0, 10),
        return_reason: 'Unassigned from Asset Inventory',
        updated_at: new Date().toISOString(),
      }).eq('id', assignment.id);
    }
    return;
  }

  const person = await getOrCreatePersonByName(targetName, department, branch);
  if (!person) return;
  const alreadyAssigned = (activeAssignments || []).some(a => a.asset_person_id === person.id);
  if (alreadyAssigned) return;

  for (const assignment of activeAssignments || []) {
    await supabase.from('asset_assignments').update({
      status: 'Returned',
      return_date: new Date().toISOString().slice(0, 10),
      return_reason: `Reassigned to ${targetName}`,
      updated_at: new Date().toISOString(),
    }).eq('id', assignment.id);
  }

  const safeAssignedBy = assignedBy && assignedBy !== '00000000-0000-0000-0000-000000000000' ? assignedBy : null;
  const { error } = await supabase.from('asset_assignments').insert({
    asset_id: assetId,
    asset_person_id: person.id,
    assigned_date: assignedDate || new Date().toISOString().slice(0, 10),
    assigned_by: safeAssignedBy,
    status: 'Active',
  });
  if (error) throw error;
};

export const subscribeToAssetAssignments = (callback: () => void) => {
  const channel = supabase.channel('asset_assignments_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_assignments' }, callback).subscribe();
  return () => { supabase.removeChannel(channel); };
};
