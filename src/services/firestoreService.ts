import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  getDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
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
  MeetingMinute 
} from '../types';
import { 
  validateAsset, 
  validatePurchaseRecord, 
  validateITTicket, 
  validateMeetingMinute, 
  validateRenewalRecord 
} from '../schema/validation';

const PURCHASE_COLLECTION = 'purchase_records';
const ASSET_COLLECTION = 'it_assets';
const TICKET_COLLECTION = 'it_tickets';
const BACKUP_COLLECTION = 'backup_logs';
const CCTV_COLLECTION = 'cctv_requests';
const CONTENT_PLAN_COLLECTION = 'content_plans';
const RENEWAL_COLLECTION = 'renewals';
const DAILY_LOG_COLLECTION = 'daily_logs';
const WEEKLY_LOG_COLLECTION = 'weekly_logs';
const MONTHLY_LOG_COLLECTION = 'monthly_logs';
const ACTIVITY_COLLECTION = 'activities';
const EVIDENCE_COLLECTION = 'task_evidence';
const EMPLOYEE_COLLECTION = 'employees';
const USER_COLLECTION = 'app_users';
const SETTINGS_COLLECTION = 'system_config';
const ROLE_PERMISSIONS_COLLECTION = 'role_permissions';
const MEETING_MINUTES_COLLECTION = 'meeting_minutes';
const SETTINGS_DOC_ID = 'main';

// Helper to remove undefined fields recursively
export const cleanData = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanData);
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanData(value);
    }
  }
  return cleaned;
};

export const saveGenericRecord = async (collName: string, data: any) => {
  try {
    const sanitized = cleanData(data);
    let docRef;
    if (sanitized.id) {
      docRef = doc(db, collName, sanitized.id);
      await setDoc(docRef, { ...sanitized, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      docRef = doc(collection(db, collName));
      await setDoc(docRef, { ...sanitized, id: docRef.id, createdAt: serverTimestamp() });
    }
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, collName);
    throw err;
  }
};

export const deleteGenericRecord = async (collName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collName, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collName}/${id}`);
    throw err;
  }
};

// ----------------------------------------------------
// System Settings & Permissions
// ----------------------------------------------------

export const saveSettings = async (settings: SystemSettings) => {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), cleanData(settings), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SETTINGS_COLLECTION);
    throw error;
  }
};

export const getSettings = async (): Promise<SystemSettings | null> => {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, SETTINGS_COLLECTION);
    throw error;
  }
};

export const fetchRolePermissions = async (): Promise<RolePermission[]> => {
  try {
    const snap = await getDocs(collection(db, ROLE_PERMISSIONS_COLLECTION));
    return snap.docs.map(doc => doc.data() as RolePermission);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ROLE_PERMISSIONS_COLLECTION);
    throw error;
  }
};

export const saveRolePermission = async (rolePermission: RolePermission) => {
  try {
    await setDoc(doc(db, ROLE_PERMISSIONS_COLLECTION, rolePermission.role), cleanData(rolePermission), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ROLE_PERMISSIONS_COLLECTION);
    throw error;
  }
};

// ----------------------------------------------------
// User Profile & Authentication Synchronization
// ----------------------------------------------------

export const getSystemUser = async (uid: string): Promise<SystemUser | null> => {
  try {
    const docRef = doc(db, USER_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SystemUser;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USER_COLLECTION}/${uid}`);
    throw error;
  }
};

export const syncSystemUser = async (firebaseUser: any): Promise<SystemUser | null> => {
  if (!firebaseUser) return null;

  const isSuperAdminEmail = firebaseUser.email === "it.taunggyipharmacy@gmail.com";
  const userRef = doc(db, USER_COLLECTION, firebaseUser.uid);
  
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initialRole = isSuperAdminEmail ? UserRole.SUPER_ADMIN : UserRole.STAFF_VIEWER;
      const newUser: Partial<SystemUser> = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
        photoURL: firebaseUser.photoURL || "",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };

      // Create doc without forbidden role / isAdmin fields from client
      await setDoc(userRef, newUser, { merge: true });
      return {
        ...newUser,
        role: initialRole,
        isAdmin: initialRole === UserRole.SUPER_ADMIN
      } as SystemUser;
    } else {
      const userData = snap.data() as SystemUser;
      await setDoc(userRef, {
        displayName: firebaseUser.displayName || userData.displayName,
        photoURL: firebaseUser.photoURL || userData.photoURL
      }, { merge: true });

      return {
        ...userData,
        displayName: firebaseUser.displayName || userData.displayName,
        photoURL: firebaseUser.photoURL || userData.photoURL,
        isAdmin: userData.role === UserRole.SUPER_ADMIN || userData.role === UserRole.IT_SUPERVISOR || isSuperAdminEmail
      };
    }
  } catch (error) {
    console.warn("syncSystemUser encountered error, falling back safely:", error);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "User",
      role: isSuperAdminEmail ? UserRole.SUPER_ADMIN : UserRole.STAFF_VIEWER,
      photoURL: firebaseUser.photoURL || "",
      createdAt: new Date(),
      lastLogin: new Date(),
      isAdmin: isSuperAdminEmail
    };
  }
};

export const updateSystemUserRole = async (uid: string, role: UserRole) => {
  try {
    const authUser = auth.currentUser;
    if (!authUser) throw new Error("Not authenticated");
    const token = await authUser.getIdToken();
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ targetUid: uid, newRole: role })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText);
    }
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// ----------------------------------------------------
// Assets & Inventory
// ----------------------------------------------------

export const saveAsset = async (asset: Partial<ITAsset>) => {
  const isAssigned = Boolean(asset.assignedTo && asset.assignedTo.trim() !== "" && asset.assignedTo.trim() !== "Unassigned");
  const sanitized = cleanData({
    ...asset,
    category: asset.category || "Computer",
    model: (asset.model || "Unnamed Asset").trim(),
    serialNumber: (asset.serialNumber || "N/A").trim(),
    brand: (asset.brand || "").trim(),
    specs: (asset.specs || "").trim(),
    purchaseDate: asset.purchaseDate || new Date().toISOString().split("T")[0],
    maintenanceDueDate: asset.maintenanceDueDate || "",
    location: (asset.location || "Central Storage").trim(),
    department: (asset.department || "").trim(),
    uom: (asset.uom || "Unit").trim(),
    assignedTo: isAssigned ? (asset.assignedTo || "").trim() : "Unassigned",
    status: asset.status || "Active",
    purchasePrice: asset.purchasePrice ? String(asset.purchasePrice).trim() : "0",
    itemPrice: typeof asset.itemPrice === "number" ? asset.itemPrice : Number(asset.purchasePrice) || 0,
    parentId: asset.parentId || null,
    remarks: asset.remarks || "",
    remark2: asset.remark2 || "",
    peripherals: asset.peripherals || {},
    updatedAt: serverTimestamp()
  });

  const val = validateAsset(sanitized);
  if (!val.valid) {
    throw new Error(`Asset validation failed: ${val.errors.join(", ")}`);
  }

  // Server-side code generation for new assets
  if (!asset.id && !asset.asset_code) {
    try {
      const authUser = auth.currentUser;
      if (!authUser) throw new Error("Not authenticated");
      const token = await authUser.getIdToken();
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify(sanitized)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      const data = await res.json();
      
      saveActivity({
        action: "Asset Registered",
        details: `Registered asset (${asset.brand || ""} ${asset.model || ""})`
      }).catch(() => {});
      
      return data.assetId;
    } catch (error) {
      console.error("Error creating asset via API:", error);
      throw error;
    }
  } else {
    return saveGenericRecord(ASSET_COLLECTION, sanitized);
  }
};

export const deleteAsset = (id: string) => deleteGenericRecord(ASSET_COLLECTION, id);

// ----------------------------------------------------
// Meeting Minutes
// ----------------------------------------------------

export const saveMeetingMinute = async (data: Partial<MeetingMinute>) => {
  const authUser = auth.currentUser;
  if (!authUser) throw new Error("User must be authenticated to save meeting minutes");

  const sanitized = cleanData({
    ...data,
    createdByUid: data.createdByUid || authUser.uid,
    createdByEmail: data.createdByEmail || authUser.email || "",
    createdBy: data.createdBy || authUser.displayName || authUser.email || "User",
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const validation = validateMeetingMinute(sanitized);
  if (!validation.valid) {
    throw new Error(`Meeting validation failed: ${validation.errors.join(", ")}`);
  }

  return saveGenericRecord(MEETING_MINUTES_COLLECTION, sanitized);
};

export const deleteMeetingMinute = (id: string) => deleteGenericRecord(MEETING_MINUTES_COLLECTION, id);

// ----------------------------------------------------
// Other Business Collections
// ----------------------------------------------------

export const saveActivity = (data: any) => saveGenericRecord(ACTIVITY_COLLECTION, data);
export const saveRenewal = (data: any) => {
  const val = validateRenewalRecord(data);
  if (!val.valid) throw new Error(`Renewal validation failed: ${val.errors.join(", ")}`);
  return saveGenericRecord(RENEWAL_COLLECTION, data);
};
export const deleteRenewal = (id: string) => deleteGenericRecord(RENEWAL_COLLECTION, id);

export const updateRenewalOrder = async (items: any[]) => {
  const batch = writeBatch(db);
  items.forEach(item => {
    batch.update(doc(db, RENEWAL_COLLECTION, item.id), { orderIndex: item.orderIndex });
  });
  await batch.commit();
};

export const saveDailyLog = (data: any) => saveGenericRecord(DAILY_LOG_COLLECTION, data);
export const getDailyLog = async (id: string) => {
  const d = await getDoc(doc(db, DAILY_LOG_COLLECTION, id));
  return d.exists() ? d.data() as DailyLog : null;
};

export const saveMonthlyLog = (data: any) => saveGenericRecord(MONTHLY_LOG_COLLECTION, data);
export const getMonthlyLog = async (id: string) => {
  const d = await getDoc(doc(db, MONTHLY_LOG_COLLECTION, id));
  return d.exists() ? d.data() as MonthlyLog : null;
};

export const saveWeeklyLog = (data: any) => saveGenericRecord(WEEKLY_LOG_COLLECTION, data);
export const getWeeklyLog = async (id: string) => {
  const d = await getDoc(doc(db, WEEKLY_LOG_COLLECTION, id));
  return d.exists() ? d.data() as WeeklyLog : null;
};

export const saveEmployeeProfile = (data: any) => saveGenericRecord(EMPLOYEE_COLLECTION, data);
export const saveTaskEvidence = (data: any) => saveGenericRecord(EVIDENCE_COLLECTION, data);
export const getTaskEvidence = async (id: string) => {
  const d = await getDoc(doc(db, EVIDENCE_COLLECTION, id));
  return d.exists() ? d.data() as TaskEvidence : null;
};

export const saveBackupLog = (data: any) => saveGenericRecord(BACKUP_COLLECTION, data);
export const deleteBackupLog = (id: string) => deleteGenericRecord(BACKUP_COLLECTION, id);

export const saveCCTVRequest = (data: any) => saveGenericRecord(CCTV_COLLECTION, data);
export const deleteCCTVRequest = (id: string) => deleteGenericRecord(CCTV_COLLECTION, id);

export const saveContentPlan = (data: any) => saveGenericRecord(CONTENT_PLAN_COLLECTION, data);
export const deleteContentPlan = (id: string) => deleteGenericRecord(CONTENT_PLAN_COLLECTION, id);

export const saveITTicket = (data: any) => {
  const val = validateITTicket(data);
  if (!val.valid) throw new Error(`Ticket validation failed: ${val.errors.join(", ")}`);
  return saveGenericRecord(TICKET_COLLECTION, data);
};
export const deleteITTicket = (id: string) => deleteGenericRecord(TICKET_COLLECTION, id);

export const savePurchaseRecord = (data: any) => {
  const val = validatePurchaseRecord(data);
  if (!val.valid) throw new Error(`Purchase record validation failed: ${val.errors.join(", ")}`);
  return saveGenericRecord(PURCHASE_COLLECTION, data);
};
export const deletePurchaseRecord = (id: string) => deleteGenericRecord(PURCHASE_COLLECTION, id);

export const getAllSystemUsers = async () => {
  try {
    const snap = await getDocs(collection(db, USER_COLLECTION));
    return snap.docs.map(d => d.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, USER_COLLECTION);
    throw error;
  }
};

// Aliases
export const saveTicket = saveITTicket;
export const deleteTicket = deleteITTicket;
export const saveBackup = saveBackupLog;
export const saveEvidence = saveTaskEvidence;

// ----------------------------------------------------
// Google Drive API Client Helpers with Robust Handling
// ----------------------------------------------------

export const fetchStorageFiles = async (folderId?: string) => {
  const authUser = auth.currentUser;
  if (!authUser) throw new Error("Authentication required to access Drive files");
  const token = await authUser.getIdToken();
  const url = folderId ? `/api/drive/files?folderId=${encodeURIComponent(folderId)}` : '/api/drive/files';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive fetch failed (${res.status}): ${errText}`);
  }
  return res.json();
};

export const fetchStorageQuota = async () => {
  const authUser = auth.currentUser;
  if (!authUser) throw new Error("Authentication required to access Drive quota");
  const token = await authUser.getIdToken();
  const res = await fetch("/api/drive/quota", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive quota failed (${res.status}): ${errText}`);
  }
  return res.json();
};

export const deleteStorageFile = async (id: string) => {
  const authUser = auth.currentUser;
  if (!authUser) throw new Error("Not authenticated");
  const token = await authUser.getIdToken();
  const res = await fetch(`/api/drive/files/${encodeURIComponent(id)}`, { 
    method: 'DELETE', 
    headers: { Authorization: `Bearer ${token}` } 
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive delete failed (${res.status}): ${errText}`);
  }
  return res.json();
};

// ----------------------------------------------------
// Server-Side Resumable Batch Import & Admin Migration Helpers
// ----------------------------------------------------

export const importBatchToServer = async (
  records: any[], 
  targetCollection: string = "it_assets",
  sessionId: string = `import_${Date.now()}`,
  batchIndex: number = 0
) => {
  const authUser = auth.currentUser;
  if (!authUser) throw new Error("Not authenticated");
  const token = await authUser.getIdToken();
  const res = await fetch("/api/admin/import/excel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      sessionId,
      batchIndex,
      records,
      targetCollection
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Import failed: ${errText}`);
  }
  return res.json();
};

export const runAdminMigration = async (jobName: string, idempotencyKey: string, dryRun: boolean = false, payload?: any) => {
  const authUser = auth.currentUser;
  if (!authUser) throw new Error("Not authenticated");
  const token = await authUser.getIdToken();
  const res = await fetch("/api/admin/migrations/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      jobName,
      idempotencyKey,
      dryRun,
      payload
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Migration job failed: ${errText}`);
  }
  return res.json();
};

export const wipeDatabaseServer = async (confirmation: string, backupVerified: boolean) => {
  const authUser = auth.currentUser;
  if (!authUser) throw new Error("Not authenticated");
  const token = await authUser.getIdToken();
  const res = await fetch("/api/admin/wipe-database", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      confirmation,
      backupVerified
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Wipe failed: ${errText}`);
  }
  return res.json();
};
