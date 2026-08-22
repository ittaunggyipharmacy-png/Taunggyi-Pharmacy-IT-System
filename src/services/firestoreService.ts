import { supabase } from '../lib/supabase';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { 
  PurchaseRecord, 
  ITAsset, 
  ITTicket, 
  BackupLog, 
  CCTVRequest, 
  ContentPlan, 
  RenewalRecord, 
  DailyLog, 
  MonthlyLog, 
  WeeklyLog, 
  ActivityEntry, 
  TaskEvidence,
  EmployeeProfile,
  SystemUser,
  UserRole,
  RolePermission,
  SystemSettings,
  MeetingMinute,
  PasswordVaultEntry
} from '../types';

const cleanData = (obj: any) => {
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

export const saveSettings = async (settings: SystemSettings) => {
  try {
    await supabase.from('system_config').upsert({ id: 'main', ...cleanData(settings), updated_at: new Date().toISOString() });
  } catch (error) {
    console.error("Error saving settings:", error);
  }
};

export const getSettings = async (): Promise<SystemSettings | null> => {
  try {
    const { data, error } = await supabase.from('system_config').select('*').eq('id', 'main').single();
    if (error || !data) return null;
    return data as SystemSettings;
  } catch (error) {
    console.error("Error fetching settings", error);
    return null;
  }
};

export const fetchRolePermissions = async (): Promise<RolePermission[]> => {
  try {
    const { data, error } = await supabase.from('role_permissions').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching role permissions", error);
    return [];
  }
};

export const saveRolePermission = async (rolePermission: RolePermission) => {
  try {
    await supabase.from('role_permissions').upsert({
      role: rolePermission.role,
      allowed_menus: rolePermission.allowed_menus,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error saving role permission", error);
  }
};

export const getPasswordEntries = async (): Promise<PasswordVaultEntry[]> => {
  try {
    const { data } = await supabase.from('password_vault').select('*').order('created_at', { ascending: false });
    return data || [];
  } catch (error) {
    console.error("Error fetching password entries", error);
    return [];
  }
};

export const savePasswordEntry = async (entry: PasswordVaultEntry) => {
  try {
    const record = {
      id: entry.id || crypto.randomUUID(),
      label: entry.label,
      account: entry.account,
      value: entry.value,
      branch: entry.branch,
      updated_at: new Date().toISOString()
    };
    await supabase.from('password_vault').upsert(record);
    return record.id;
  } catch (error) {
    console.error("Error saving password entry", error);
  }
};

export const deletePasswordEntry = async (id: string) => {
  try {
    await supabase.from('password_vault').delete().eq('id', id);
  } catch (error) {
    console.error("Error deleting password entry", error);
  }
};

export const getSystemUser = async (uid: string): Promise<SystemUser | null> => {
  try {
    const { data } = await supabase.from('app_users').select('*').eq('uid', uid).single();
    return data ? { ...data, isAdmin: data.is_admin } as SystemUser : null;
  } catch (error) {
    return null;
  }
};

export const syncSystemUser = async (supabaseUser: any) => {
  try {
    const uid = supabaseUser.id || supabaseUser.uid;
    const email = supabaseUser.email || '';
    const displayName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.displayName || email.split('@')[0];
    const photoURL = supabaseUser.user_metadata?.avatar_url || supabaseUser.photoURL || '';
    const isSuperAdminEmail = email.toLowerCase() === "it.taunggyipharmacy@gmail.com";

    const { data: existing } = await supabase.from('app_users').select('*').eq('uid', uid).single();

    const elevatedRoles = [
      UserRole.ADMIN, 
      UserRole.ADMIN_CAPS,
      UserRole.IT_SUPERVISOR,
      UserRole.IT_SUPERVISOR_CAPS,
      UserRole.MERCHANDISING_SUPERVISOR,
      UserRole.IT_DIGITAL_MARKETING
    ];

    if (!existing) {
      const initialRole = isSuperAdminEmail ? UserRole.ADMIN : UserRole.STAFF;
      const is_admin = elevatedRoles.includes(initialRole);
      const newUser = {
        uid,
        email,
        display_name: displayName,
        photo_url: photoURL,
        role: initialRole,
        is_admin,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      await supabase.from('app_users').insert(newUser);
      return { ...newUser, isAdmin: is_admin };
    } else {
      let updatedRole = existing.role;
      if (isSuperAdminEmail && !elevatedRoles.includes(updatedRole)) {
        updatedRole = UserRole.ADMIN;
      }
      const is_admin = elevatedRoles.includes(updatedRole);
      await supabase.from('app_users').update({
        last_login: new Date().toISOString(),
        display_name: displayName || existing.display_name,
        photo_url: photoURL || existing.photo_url,
        role: updatedRole,
        is_admin
      }).eq('uid', uid);

      const { data: refreshed } = await supabase.from('app_users').select('*').eq('uid', uid).single();
      return refreshed ? { ...refreshed, isAdmin: refreshed.is_admin } : null;
    }
  } catch (error) {
    console.error("Error syncing system user", error);
    return null;
  }
};

export const updateSystemUserRole = async (uid: string, role: UserRole) => {
  try {
    const elevatedRoles = [
      UserRole.ADMIN, 
      UserRole.ADMIN_CAPS,
      UserRole.IT_SUPERVISOR,
      UserRole.IT_SUPERVISOR_CAPS,
      UserRole.MERCHANDISING_SUPERVISOR,
      UserRole.IT_DIGITAL_MARKETING
    ];
    const is_admin = elevatedRoles.includes(role);
    await supabase.from('app_users').update({ role, is_admin }).eq('uid', uid);
  } catch (error) {
    console.error("Error updating user role", error);
  }
};

export const getAllSystemUsers = async (): Promise<SystemUser[]> => {
  try {
    const { data } = await supabase.from('app_users').select('*');
    return (data || []).map(u => ({ ...u, isAdmin: u.is_admin }));
  } catch (error) {
    console.error("Error fetching all system users", error);
    return [];
  }
};

export const saveEmployeeProfile = async (profile: Partial<EmployeeProfile>) => {
  try {
    const record = { id: profile.id || crypto.randomUUID(), ...cleanData(profile), updated_at: new Date().toISOString() };
    await supabase.from('employees').upsert(record);
    return record.id;
  } catch (error) {
    console.error("Error saving employee profile", error);
  }
};

export const saveActivity = async (activity: Partial<ActivityEntry>) => {
  try {
    const record = { id: activity.id || crypto.randomUUID(), ...cleanData(activity), timestamp: activity.timestamp || new Date().toISOString() };
    await supabase.from('activities').insert(record);
  } catch (error) {
    console.error("Error saving activity", error);
  }
};

export const saveEvidence = async (evidence: Partial<TaskEvidence>) => {
  try {
    const record = { id: evidence.id || crypto.randomUUID(), ...cleanData(evidence), updated_at: new Date().toISOString() };
    await supabase.from('task_evidence').upsert(record);
  } catch (error) {
    console.error("Error saving evidence", error);
  }
};

export const savePurchaseRecord = async (record: Partial<PurchaseRecord>) => {
  try {
    const rec = { id: record.id || crypto.randomUUID(), ...cleanData(record), updated_at: new Date().toISOString() };
    await supabase.from('purchases').upsert(rec);
    return rec.id;
  } catch (error) {
    console.error("Error saving purchase record", error);
  }
};

export const deletePurchaseRecord = async (recordId: string) => {
  try {
    await supabase.from('purchases').delete().eq('id', recordId);
  } catch (error) {
    console.error("Error deleting purchase record", error);
  }
};

export const saveTicket = async (ticket: Partial<ITTicket>) => {
  try {
    const rec = { id: ticket.id || crypto.randomUUID(), ...cleanData(ticket), updated_at: new Date().toISOString() };
    await supabase.from('tickets').upsert(rec);
    return rec.id;
  } catch (error) {
    console.error("Error saving ticket", error);
  }
};

export const deleteTicket = async (ticketId: string) => {
  try {
    await supabase.from('tickets').delete().eq('id', ticketId);
  } catch (error) {
    console.error("Error deleting ticket", error);
  }
};

export const generateNextAssetCode = async (category: string, currentOffset: number = 0) => {
  const catKey = (category || 'other').toLowerCase().replace(/\s+/g, '_');
  try {
    const { data } = await supabase.from('asset_counters').select('count').eq('id', `assetCode_${catKey}`).single();
    let lastNum = data?.count || 0;
    const nextNum = lastNum + 1 + currentOffset;
    await supabase.from('asset_counters').upsert({ id: `assetCode_${catKey}`, count: nextNum, updated_at: new Date().toISOString() });
    
    const getPrefix = (cat: string) => {
      const c = (cat || "").toLowerCase();
      if (c === "computer") return "TG-PC-";
      if (c === "keyboard") return "TG-KB-";
      if (c === "mouse") return "TG-MS-";
      if (c === "fan") return "TG-FN-";
      if (c === "usb hub" || c === "usb") return "TG-UB-";
      if (c === "printer") return "TG-PR-";
      if (c === "phone" || c === "mobile") return "TG-PH-";
      if (c === "scanner") return "TG-SC-";
      return "TG-ACC-";
    };
    return `${getPrefix(category)}${String(nextNum).padStart(3, '0')}`;
  } catch (error) {
    return `TG-ACC-${Math.floor(Math.random() * 900 + 100)}`;
  }
};

export const saveAsset = async (asset: Partial<ITAsset>) => {
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
    console.error("Error saving asset", error);
  }
};

export const deleteAsset = async (assetId: string) => {
  try {
    await supabase.from('assets').delete().eq('id', assetId);
  } catch (error) {
    console.error("Error deleting asset", error);
  }
};

export const clearAllAssets = async () => {
  try {
    await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (error) {
    console.error("Error clearing assets", error);
  }
};

export const initializeAssetCodeCounters = async () => {
  return { success: true };
};

export const updateAssetAssignment = async (assetId: string, assignedUser: string, location: string, department: string, status: string, additionalFields: Partial<ITAsset> = {}) => {
  try {
    await supabase.from('assets').update({
      assignee: assignedUser,
      location,
      department,
      status,
      ...cleanData(additionalFields),
      updated_at: new Date().toISOString()
    }).eq('id', assetId);
  } catch (error) {
    console.error("Error updating asset assignment", error);
  }
};

export const saveBackup = async (backup: Partial<BackupLog>) => {
  const rec = { id: backup.id || crypto.randomUUID(), ...cleanData(backup), updated_at: new Date().toISOString() };
  await supabase.from('backups').upsert(rec);
  return rec.id;
};

export const saveCCTVRequest = async (request: Partial<CCTVRequest>) => {
  const rec = { id: request.id || crypto.randomUUID(), ...cleanData(request), updated_at: new Date().toISOString() };
  await supabase.from('cctv_requests').upsert(rec);
  return rec.id;
};

export const saveContentPlan = async (plan: Partial<ContentPlan>) => {
  const rec = { id: plan.id || crypto.randomUUID(), ...cleanData(plan), updated_at: new Date().toISOString() };
  await supabase.from('content_plans').upsert(rec);
  return rec.id;
};

export const saveRenewal = async (renewal: Partial<RenewalRecord>) => {
  const rec = { id: renewal.id || crypto.randomUUID(), ...cleanData(renewal), updated_at: new Date().toISOString() };
  await supabase.from('renewals').upsert(rec);
  return rec.id;
};

export const deleteRenewal = async (id: string) => {
  await supabase.from('renewals').delete().eq('id', id);
};

export const updateRenewalOrder = async (renewals: RenewalRecord[]) => {
  for (let i = 0; i < renewals.length; i++) {
    await supabase.from('renewals').update({ order_index: i + 1 }).eq('id', renewals[i].id);
  }
};

export const saveMeetingMinute = async (meeting: Partial<MeetingMinute>) => {
  const rec = { id: meeting.id || crypto.randomUUID(), ...cleanData(meeting), updated_at: new Date().toISOString() };
  await supabase.from('meeting_minutes').upsert(rec);
  return rec.id;
};

export const deleteMeetingMinute = async (meetingId: string) => {
  await supabase.from('meeting_minutes').delete().eq('id', meetingId);
};

export const saveDailyLog = async (log: Partial<DailyLog>) => {
  const rec = { id: log.id || crypto.randomUUID(), ...cleanData(log), updated_at: new Date().toISOString() };
  await supabase.from('daily_logs').upsert(rec);
  return rec.id;
};

export const getDailyLog = async (id: string) => {
  const { data } = await supabase.from('daily_logs').select('*').eq('id', id).single();
  return data || null;
};

export const saveWeeklyLog = async (log: Partial<WeeklyLog>) => {
  const rec = { id: log.id || crypto.randomUUID(), ...cleanData(log), updated_at: new Date().toISOString() };
  await supabase.from('weekly_logs').upsert(rec);
  return rec.id;
};

export const getWeeklyLog = async (id: string) => {
  const { data } = await supabase.from('weekly_logs').select('*').eq('id', id).single();
  return data || null;
};

export const saveMonthlyLog = async (log: Partial<MonthlyLog>) => {
  const rec = { id: log.id || crypto.randomUUID(), ...cleanData(log), updated_at: new Date().toISOString() };
  await supabase.from('monthly_logs').upsert(rec);
  return rec.id;
};

export const getMonthlyLog = async (id: string) => {
  const { data } = await supabase.from('monthly_logs').select('*').eq('id', id).single();
  return data || null;
};

export const fetchStorageFiles = async (folderId?: string) => {
  try {
    const { data } = await supabase.storage.from('uploads').list(folderId || '');
    return data || [];
  } catch (e) {
    return [];
  }
};

export const fetchStorageQuota = async () => {
  return { limit: '10 GB', usage: '1.2 GB' };
};

export const deleteStorageFile = async (fileId: string) => {
  await supabase.storage.from('uploads').remove([fileId]);
};

export const checkAdminStatus = async (uid: string): Promise<boolean> => {
  const { data } = await supabase.from('app_users').select('is_admin').eq('uid', uid).single();
  return !!data?.is_admin;
};

export const importLegacyExcelData = async (rows: any[]) => { return { success: true }; };
export const migrateAssetsToSequentialCodes = async (dryRun = false) => { return { success: true }; };
export const importKeyboardsMigration = async () => { return { success: true }; };
export const fetchAllRecords = async () => { return {}; };
export const subscribeToSync = () => () => {};
export const subscribeToSupervisorFeatures = () => () => {};
export const migrateExistingUsersToAdmins = async () => {
  try {
    const collectionsToMigrate = [
      { firestore: 'users', supabase: 'app_users' },
      { firestore: 'app_users', supabase: 'app_users' },
      { firestore: 'system_config', supabase: 'system_config' },
      { firestore: 'role_permissions', supabase: 'role_permissions' },
      { firestore: 'password_vault', supabase: 'password_vault' },
      { firestore: 'tickets', supabase: 'tickets' },
      { firestore: 'assets', supabase: 'assets' },
      { firestore: 'asset_counters', supabase: 'asset_counters' },
      { firestore: 'backups', supabase: 'backups' },
      { firestore: 'cctv_requests', supabase: 'cctv_requests' },
      { firestore: 'content_plans', supabase: 'content_plans' },
      { firestore: 'renewals', supabase: 'renewals' },
      { firestore: 'purchases', supabase: 'purchases' },
      { firestore: 'meeting_minutes', supabase: 'meeting_minutes' },
      { firestore: 'daily_logs', supabase: 'daily_logs' },
      { firestore: 'weekly_logs', supabase: 'weekly_logs' },
      { firestore: 'monthly_logs', supabase: 'monthly_logs' },
      { firestore: 'employees', supabase: 'employees' },
      { firestore: 'activities', supabase: 'activities' },
      { firestore: 'task_evidence', supabase: 'task_evidence' }
    ];

    let totalMigrated = 0;

    for (const mapping of collectionsToMigrate) {
      try {
        const querySnapshot = await getDocs(collection(db, mapping.firestore));
        if (!querySnapshot.empty) {
          const records = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const cleaned: any = {};
            for (const key of Object.keys(data)) {
              let val = data[key];
              if (val && typeof val.toDate === 'function') {
                val = val.toDate().toISOString();
              } else if (val && val.seconds && typeof val.seconds === 'number') {
                val = new Date(val.seconds * 1000).toISOString();
              }
              cleaned[key] = val;
            }
            if (!cleaned.id) {
              cleaned.id = docSnap.id;
            }
            if (mapping.supabase === 'app_users' && !cleaned.uid) {
              cleaned.uid = docSnap.id;
            }
            if (mapping.supabase === 'system_config' && !cleaned.id) {
              cleaned.id = 'main';
            }
            return cleaned;
          });

          if (records.length > 0) {
            const { error } = await supabase.from(mapping.supabase).upsert(records);
            if (!error) {
              totalMigrated += records.length;
            }
          }
        }
      } catch (colErr) {
        // ignore missing collections
      }
    }

    return { success: true, count: totalMigrated };
  } catch (error: any) {
    console.error("Migration error:", error);
    return { success: false, count: 0, error: error.message || String(error) };
  }
};
