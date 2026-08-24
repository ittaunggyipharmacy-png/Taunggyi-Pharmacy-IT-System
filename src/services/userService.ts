import { supabase } from '../lib/supabase';
import { SystemUser, UserRole, EmployeeProfile, Employee } from '../types';
import { cleanData } from '../utils/cleanData';

const ELEVATED_ROLES = [
  UserRole.ADMIN,
  UserRole.ADMIN_CAPS,
  UserRole.IT_SUPERVISOR,
  UserRole.IT_SUPERVISOR_CAPS,
  UserRole.MERCHANDISING_SUPERVISOR,
  UserRole.IT_DIGITAL_MARKETING
];

const mapSystemUser = (data: any): SystemUser => ({
  uid: data.uid,
  email: data.email || '',
  displayName: data.display_name || data.email?.split('@')[0] || 'User',
  role: data.role as UserRole,
  photoURL: data.photo_url || undefined,
  createdAt: data.created_at,
  lastLogin: data.last_login,
  isAdmin: !!data.is_admin,
  employeeId: data.employee_id || null,
  position: data.position || null,
  department: data.department || null,
  branch: data.branch || null,
});

export const getSystemUser = async (uid: string): Promise<SystemUser | null> => {
  try {
    const { data } = await supabase.from('app_users').select('*').eq('uid', uid).single();
    return data ? mapSystemUser(data) : null;
  } catch { return null; }
};

export const syncSystemUser = async (supabaseUser: any): Promise<SystemUser | null> => {
  try {
    const uid = supabaseUser.id || supabaseUser.uid;
    const email = supabaseUser.email || '';
    const metadataName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.displayName || email.split('@')[0];
    const photoURL = supabaseUser.user_metadata?.avatar_url || supabaseUser.photoURL || '';
    const isSuperAdminEmail = email.toLowerCase() === 'it.taunggyipharmacy@gmail.com';
    const { data: existing } = await supabase.from('app_users').select('*').eq('uid', uid).single();

    if (!existing) {
      const initialRole = isSuperAdminEmail ? UserRole.ADMIN : UserRole.STAFF;
      const newUser = { uid, email, display_name: metadataName, photo_url: photoURL, role: initialRole, is_admin: ELEVATED_ROLES.includes(initialRole), created_at: new Date().toISOString(), last_login: new Date().toISOString() };
      const { error } = await supabase.from('app_users').insert(newUser);
      if (error) throw error;
      return mapSystemUser(newUser);
    }

    // Keep the administrator-edited name. Login/provider metadata must not overwrite it.
    let updatedRole = existing.role;
    if (isSuperAdminEmail && !ELEVATED_ROLES.includes(updatedRole)) updatedRole = UserRole.ADMIN;
    const { error } = await supabase.from('app_users').update({ last_login: new Date().toISOString(), photo_url: photoURL || existing.photo_url, role: updatedRole, is_admin: ELEVATED_ROLES.includes(updatedRole) }).eq('uid', uid);
    if (error) throw error;
    const { data: refreshed } = await supabase.from('app_users').select('*').eq('uid', uid).single();
    return refreshed ? mapSystemUser(refreshed) : null;
  } catch (error) { console.error('Error syncing system user:', error); return null; }
};

export const updateSystemUserRole = async (uid: string, role: UserRole): Promise<void> => {
  const is_admin = ELEVATED_ROLES.includes(role);
  const { error } = await supabase.from('app_users').update({ role, is_admin }).eq('uid', uid);
  if (error) throw error;
};

/**
 * Update a login user's display name from the app.
 * The database RPC enforces administrator permission and updates app_users.
 * The Supabase trigger then synchronizes linked asset_people/assets records.
 */
export const updateSystemUserDisplayName = async (uid: string, displayName: string): Promise<void> => {
  const name = displayName.trim();
  if (!name) throw new Error('User name cannot be empty.');

  const { data, error } = await supabase.rpc('admin_update_user_display_name', {
    target_uid: uid,
    new_display_name: name,
  });

  if (error) throw error;
  if (!data?.uid) throw new Error('User name update did not return an updated user.');
};

export const updateSystemUserProfile = async (uid: string, profile: Partial<Pick<SystemUser, 'employeeId' | 'position' | 'department' | 'branch'>>): Promise<void> => {
  const { error } = await supabase.from('app_users').update({ employee_id: profile.employeeId || null, position: profile.position || null, department: profile.department || null, branch: profile.branch || null }).eq('uid', uid);
  if (error) throw error;
};

export const getAllSystemUsers = async (): Promise<SystemUser[]> => {
  try { const { data, error } = await supabase.from('app_users').select('*').order('display_name', { ascending: true }); if (error) throw error; return (data || []).map(mapSystemUser); }
  catch (error) { console.error('Error fetching all system users:', error); return []; }
};

export const checkAdminStatus = async (uid: string): Promise<boolean> => { try { const { data } = await supabase.from('app_users').select('is_admin').eq('uid', uid).single(); return !!data?.is_admin; } catch { return false; } };
export const fetchEmployees = async (): Promise<Employee[]> => { try { const { data, error } = await supabase.from('employees').select('*'); if (error) { console.warn('Employees table not available or error:', error.message); return []; } return (data || []) as unknown as Employee[]; } catch (error) { console.warn('Failed to load employees:', error); return []; } };
export const saveEmployeeProfile = async (profile: Partial<EmployeeProfile>): Promise<string | undefined> => { try { const record = { id: profile.id || crypto.randomUUID(), ...cleanData(profile), updated_at: new Date().toISOString() }; const { error } = await supabase.from('employees').upsert(record); if (error) throw error; return record.id; } catch (error) { console.error('Error saving employee profile:', error); throw error; } };
export const subscribeToUsers = (callback: (users: SystemUser[]) => void) => { const channel = supabase.channel('app_users_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, async () => callback(await getAllSystemUsers())).subscribe(); return () => { supabase.removeChannel(channel); }; };
