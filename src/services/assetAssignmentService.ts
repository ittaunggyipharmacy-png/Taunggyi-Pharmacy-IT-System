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
  user: row.user ? {
    uid: row.user.uid,
    employeeId: row.user.employee_id,
    displayName: row.user.display_name,
    email: row.user.email,
    position: row.user.position,
    role: row.user.role,
    department: row.user.department,
    branch: row.user.branch,
    photoURL: row.user.photo_url,
  } : null,
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
  user:app_users!asset_assignments_user_id_fkey(uid, employee_id, display_name, email, position, role, department, branch, photo_url),
  asset_person:asset_people!asset_assignments_asset_person_id_fkey(id, employee_id, full_name, position, department, branch, phone, email, status, notes, linked_user_id, created_at, updated_at),
  asset:assets!asset_assignments_asset_id_fkey(id, code, name, category, status, department, location, assignee, purchase_date, specs, parent_id)
`;

const assetPersonAssignmentSelect = `
  *,
  asset_person:asset_people!asset_assignments_asset_person_id_fkey(id, employee_id, full_name, position, department, branch, phone, email, status, notes, linked_user_id, created_at, updated_at),
  asset:assets!asset_assignments_asset_id_fkey(id, code, name, category, status, department, location, assignee, purchase_date, specs, parent_id)
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
  
  const mapped = (data || []).map(mapAssetPerson).filter(Boolean) as AssetPerson[];
  
  // Deduplicate by normalized fullName
  const seenNames = new Map<string, AssetPerson>();
  let hasDuplicates = false;
  for (const person of mapped) {
    const key = person.fullName.trim().toLowerCase();
    if (!seenNames.has(key)) {
      seenNames.set(key, person);
    } else {
      hasDuplicates = true;
      const existing = seenNames.get(key)!;
      // Prefer record with linkedUserId or more details
      if ((!existing.linkedUserId && person.linkedUserId) || (!existing.department && person.department)) {
        seenNames.set(key, person);
      }
    }
  }

  // Trigger background cleanup if duplicates detected in DB
  if (hasDuplicates) {
    cleanupDuplicateAssetPeople().catch(err => console.warn('Background cleanup error:', err));
  }

  return Array.from(seenNames.values());
};

/** Clean up any historical duplicate rows in asset_people */
export const cleanupDuplicateAssetPeople = async (): Promise<void> => {
  try {
    const { data: people, error } = await supabase.from('asset_people').select('*');
    if (error || !people || people.length === 0) return;

    const grouped = new Map<string, any[]>();
    for (const p of people) {
      const norm = (p.full_name || '').trim().toLowerCase();
      if (!norm) continue;
      if (!grouped.has(norm)) grouped.set(norm, []);
      grouped.get(norm)!.push(p);
    }

    for (const [, list] of grouped.entries()) {
      if (list.length > 1) {
        list.sort((a, b) => {
          if (a.linked_user_id && !b.linked_user_id) return -1;
          if (!a.linked_user_id && b.linked_user_id) return 1;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        const canonical = list[0];
        const duplicates = list.slice(1);
        for (const dup of duplicates) {
          await supabase.from('asset_assignments').update({ asset_person_id: canonical.id }).eq('asset_person_id', dup.id);
          await supabase.from('asset_people').delete().eq('id', dup.id);
        }
      }
    }
  } catch (err) {
    console.warn('cleanupDuplicateAssetPeople exception:', err);
  }
};

export const createAssetPerson = async (person: Omit<AssetPerson, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetPerson> => {
  const targetName = person.fullName.trim();
  if (!targetName) throw new Error('Person name is required');

  // Check if person with same name already exists
  const { data: existing } = await supabase
    .from('asset_people')
    .select('*')
    .ilike('full_name', targetName);

  if (existing && existing.length > 0) {
    const matched = existing[0];
    // Update missing fields if needed
    const updates: any = {};
    if (!matched.employee_id && person.employeeId) updates.employee_id = person.employeeId;
    if (!matched.department && person.department) updates.department = person.department;
    if (!matched.branch && person.branch) updates.branch = person.branch;
    if (!matched.position && person.position) updates.position = person.position;
    if (!matched.phone && person.phone) updates.phone = person.phone;
    if (!matched.email && person.email) updates.email = person.email;
    if (!matched.linked_user_id && person.linkedUserId) updates.linked_user_id = person.linkedUserId;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase.from('asset_people').update(updates).eq('id', matched.id);
    }
    return mapAssetPerson({ ...matched, ...updates })!;
  }

  const { data, error } = await supabase.from('asset_people').insert({
    employee_id: person.employeeId || null,
    full_name: targetName,
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
    employee_id: person.employeeId || null, full_name: person.fullName, position: person.position || null,
    department: person.department || null, branch: person.branch || null, phone: person.phone || null,
    email: person.email || null, status: person.status || 'Active', notes: person.notes || null,
    linked_user_id: person.linkedUserId || null, updated_at: new Date().toISOString(),
  }).eq('id', person.id);
  if (error) throw error;
};

export const deleteAssetPerson = async (id: string): Promise<void> => {
  const { data: activeAssignments, error: assignmentsError } = await supabase
    .from('asset_assignments')
    .select('id')
    .eq('asset_person_id', id)
    .eq('status', 'Active');
    
  if (assignmentsError) throw assignmentsError;
  if (activeAssignments && activeAssignments.length > 0) {
    throw new Error('This user has active asset assignments. Please return or reassign them before deleting.');
  }

  // Delete historical assignments to satisfy foreign key constraints
  const { error: delAssignmentsError } = await supabase.from('asset_assignments').delete().eq('asset_person_id', id);
  if (delAssignmentsError) throw delAssignmentsError;

  const { error } = await supabase.from('asset_people').delete().eq('id', id);
  if (error) throw error;
};

/** Update the name shown by Asset by User. Linked login users are updated through the admin RPC. */
export const updateAssetHolderName = async (holder: { kind: 'person'; id: string } | { kind: 'login'; uid: string }, displayName: string): Promise<void> => {
  const name = displayName.trim();
  if (!name) throw new Error('User name cannot be empty.');

  // Helper function to update the assignee name in the assets table for active assignments
  const updateAssetsAssigneeName = async (personId: string, newName: string) => {
    const { data: assignments } = await supabase
      .from('asset_assignments')
      .select('asset_id')
      .eq('asset_person_id', personId)
      .eq('status', 'Active');
      
    if (assignments && assignments.length > 0) {
      const assetIds = assignments.map(a => a.asset_id);
      await supabase.from('assets').update({ assignee: newName }).in('id', assetIds);
    }
  };

  if (holder.kind === 'login') {
    const { error } = await supabase.rpc('admin_update_user_display_name', {
      target_uid: holder.uid,
      new_display_name: name,
    });
    if (error) throw error;

    // Check if this login user has an associated asset_person record and update it + assets too
    const { data: linkedPerson } = await supabase.from('asset_people').select('id, full_name').eq('linked_user_id', holder.uid).maybeSingle();
    if (linkedPerson) {
      if (linkedPerson.full_name !== name) {
        await supabase.from('asset_people').update({ full_name: name, updated_at: new Date().toISOString() }).eq('id', linkedPerson.id);
      }
      await updateAssetsAssigneeName(linkedPerson.id, name);
    }
    return;
  }

  const { data: person, error: personError } = await supabase.from('asset_people').select('id, linked_user_id').eq('id', holder.id).single();
  if (personError) throw personError;

  if (person.linked_user_id) {
    const { error } = await supabase.rpc('admin_update_user_display_name', {
      target_uid: person.linked_user_id,
      new_display_name: name,
    });
    if (error) throw error;
  }

  const { error } = await supabase.from('asset_people').update({ full_name: name, updated_at: new Date().toISOString() }).eq('id', holder.id);
  if (error) throw error;
  
  // Sync the new name to the active assets so it doesn't create a "virtual" duplicate user in AssetUsersPage
  await updateAssetsAssigneeName(holder.id, name);
};

export const getAssetPersonAssignments = async (assetPersonId: string, includeHistory = false): Promise<AssetAssignmentRecord[]> => {
  let query = supabase.from('asset_assignments').select(assetPersonAssignmentSelect).eq('asset_person_id', assetPersonId).order('assigned_date', { ascending: false });
  if (!includeHistory) query = query.eq('status', 'Active');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAssignment);
};

export const assignAssetToPerson = async ({ assetId, assetPersonId, assignedDate, assignedBy, notes }: { assetId: string; assetPersonId: string; assignedDate?: string; assignedBy?: string; notes?: string; }): Promise<string> => {
  const { data: person, error: personError } = await supabase.from('asset_people').select('*').eq('id', assetPersonId).single();
  if (personError) throw personError;
  const { data: asset, error: assetError } = await supabase.from('assets').select('id, status').eq('id', assetId).single();
  if (assetError) throw assetError;
  if (!['Active', 'In Stock', 'New'].includes(asset.status)) throw new Error(`Asset status '${asset.status}' cannot be assigned.`);

  const safeAssignedBy = (assignedBy && assignedBy !== '00000000-0000-0000-0000-000000000000') ? assignedBy : null;

  const { data, error } = await supabase.from('asset_assignments').insert({
    asset_id: assetId, asset_person_id: assetPersonId, user_id: person.linked_user_id || null,
    assigned_date: assignedDate || new Date().toISOString().slice(0, 10), assigned_by: safeAssignedBy,
    notes: notes || null, status: 'Active',
  }).select('id').single();
  if (error) throw error;

  const { error: assetUpdateError } = await supabase.from('assets').update({
    assignee: person.full_name, department: person.department || null, branch: person.branch || undefined,
    updated_at: new Date().toISOString(),
  }).eq('id', assetId);
  if (assetUpdateError) throw assetUpdateError;
  return data.id;
};

export const assignAssetToUser = async ({ assetId, userId, assignedDate, assignedBy, notes }: { assetId: string; userId: string; assignedDate?: string; assignedBy?: string; notes?: string; }): Promise<string> => {
  const { data: user, error: userError } = await supabase.from('app_users').select('uid, display_name, department, branch').eq('uid', userId).single();
  if (userError) throw userError;
  const { data: asset, error: assetError } = await supabase.from('assets').select('id, status').eq('id', assetId).single();
  if (assetError) throw assetError;
  if (!['Active', 'In Stock', 'New'].includes(asset.status)) throw new Error(`Asset status '${asset.status}' cannot be assigned.`);

  const { data: existingPerson } = await supabase.from('asset_people').select('id').eq('linked_user_id', userId).maybeSingle();
  let assetPersonId = existingPerson?.id;
  if (!assetPersonId) {
    const { data: person, error: personError } = await supabase.from('asset_people').insert({
      employee_id: null, full_name: user.display_name || 'Unknown User', department: user.department || null,
      branch: user.branch || null, linked_user_id: userId, status: 'Active',
    }).select('id').single();
    if (personError) throw personError;
    assetPersonId = person.id;
  }
  return assignAssetToPerson({ assetId, assetPersonId, assignedDate, assignedBy, notes });
};

export const returnAsset = async ({ assignmentId, returnDate, returnReason, notes }: { assignmentId: string; returnDate?: string; returnReason?: string; notes?: string; }): Promise<void> => {
  const { data: assignment, error: assignmentError } = await supabase.from('asset_assignments').select('asset_id').eq('id', assignmentId).single();
  if (assignmentError) throw assignmentError;
  const { error } = await supabase.from('asset_assignments').update({ status: 'Returned', return_date: returnDate || new Date().toISOString().slice(0, 10), return_reason: returnReason || null, notes: notes || null, updated_at: new Date().toISOString() }).eq('id', assignmentId);
  if (error) throw error;
  const { error: assetError } = await supabase.from('assets').update({ assignee: 'Unassigned', updated_at: new Date().toISOString() }).eq('id', assignment.asset_id);
  if (assetError) throw assetError;
};

// In-flight mutex/cache to prevent concurrent sync operations from creating duplicate person rows
const inFlightPersonMap = new Map<string, Promise<AssetPerson | null>>();

const getOrCreatePersonByName = async (targetName: string, department?: string | null, branch?: string | null): Promise<AssetPerson | null> => {
  const normKey = targetName.trim().toLowerCase();
  if (inFlightPersonMap.has(normKey)) {
    return inFlightPersonMap.get(normKey)!;
  }

  const promise = (async () => {
    try {
      // 1. Find matching app_users or asset_people
      const { data: matchedUsers } = await supabase
        .from('app_users')
        .select('uid, display_name, department, branch')
        .ilike('display_name', targetName);

      const matchedUser = matchedUsers && matchedUsers.length > 0 ? matchedUsers[0] : null;

      const { data: matchedPeople } = await supabase
        .from('asset_people')
        .select('*')
        .ilike('full_name', targetName);

      let targetPerson: AssetPerson | null = (matchedPeople && matchedPeople.length > 0 ? mapAssetPerson(matchedPeople[0]) : null);

      // If user found but no person, find or create asset_people linked to that user
      if (matchedUser && !targetPerson) {
        const { data: linkedPerson } = await supabase
          .from('asset_people')
          .select('*')
          .eq('linked_user_id', matchedUser.uid)
          .maybeSingle();

        if (linkedPerson) {
          targetPerson = mapAssetPerson(linkedPerson);
        } else {
          targetPerson = await createAssetPerson({
            fullName: matchedUser.display_name || targetName,
            department: matchedUser.department || department || null,
            branch: matchedUser.branch || branch || null,
            linkedUserId: matchedUser.uid,
            status: 'Active',
          });
        }
      }

      // If no user and no person found, create a new asset_people record with this name
      if (!targetPerson) {
        targetPerson = await createAssetPerson({
          fullName: targetName,
          department: department || null,
          branch: branch || null,
          status: 'Active',
        });
      }

      return targetPerson;
    } finally {
      // Remove from in-flight cache after a short delay
      setTimeout(() => inFlightPersonMap.delete(normKey), 2000);
    }
  })();

  inFlightPersonMap.set(normKey, promise);
  return promise;
};

/**
 * Automatically synchronize an asset assignment when set in Asset Inventory
 */
export const syncAssetAssignmentByName = async ({
  assetId,
  assignedTo,
  department,
  branch,
  assignedDate,
  assignedBy,
}: {
  assetId: string;
  assignedTo?: string | null;
  department?: string | null;
  branch?: string | null;
  assignedDate?: string | null;
  assignedBy?: string | null;
}): Promise<void> => {
  if (!assetId) return;
  const targetName = (assignedTo || '').trim();

  // 1. If assignedTo is empty or "Unassigned", close any active assignment for this asset
  if (!targetName || targetName.toLowerCase() === 'unassigned') {
    const { data: activeAssignments } = await supabase
      .from('asset_assignments')
      .select('id')
      .eq('asset_id', assetId)
      .eq('status', 'Active');

    if (activeAssignments && activeAssignments.length > 0) {
      for (const a of activeAssignments) {
        await supabase
          .from('asset_assignments')
          .update({
            status: 'Returned',
            return_date: new Date().toISOString().slice(0, 10),
            return_reason: 'Unassigned from Asset Inventory',
            updated_at: new Date().toISOString(),
          })
          .eq('id', a.id);
      }
    }
    return;
  }

  // 2. Find or create matching targetPerson (concurrency safe)
  const targetPerson = await getOrCreatePersonByName(targetName, department, branch);
  if (!targetPerson) return;

  // Check active assignment for this asset
  const { data: currentActive } = await supabase
    .from('asset_assignments')
    .select('*')
    .eq('asset_id', assetId)
    .eq('status', 'Active');

  // If already actively assigned to this person/user, do nothing
  const alreadyAssigned = currentActive?.some(
    a => a.asset_person_id === targetPerson.id || (targetPerson.linkedUserId && a.user_id === targetPerson.linkedUserId)
  );

  if (alreadyAssigned) return;

  // Close previous active assignments
  if (currentActive && currentActive.length > 0) {
    for (const a of currentActive) {
      await supabase
        .from('asset_assignments')
        .update({
          status: 'Returned',
          return_date: new Date().toISOString().slice(0, 10),
          return_reason: `Reassigned to ${targetName}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', a.id);
    }
  }

  const safeAssignedBy = (assignedBy && assignedBy !== '00000000-0000-0000-0000-000000000000') ? assignedBy : null;

  // Create new active assignment
  await supabase.from('asset_assignments').insert({
    asset_id: assetId,
    asset_person_id: targetPerson.id,
    user_id: targetPerson.linkedUserId || null,
    assigned_date: assignedDate || new Date().toISOString().slice(0, 10),
    assigned_by: safeAssignedBy,
    status: 'Active',
  });
};

export const subscribeToAssetAssignments = (callback: () => void) => {
  const channel = supabase.channel('asset_assignments_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'asset_assignments' }, callback).subscribe();
  return () => { supabase.removeChannel(channel); };
};
