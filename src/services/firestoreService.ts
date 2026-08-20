import { 
 collection, 
 getDocs, 
 addDoc, 
 setDoc, 
 doc, 
 query, 
 where, 
 onSnapshot,
 Timestamp,
 serverTimestamp,
 limit,
 orderBy,
 getDoc,
 deleteDoc,
 writeBatch,
 increment,
 runTransaction
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { db, auth, storage } from './firebase';
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
 MeetingMinute,
 MeetingActionItem,
 PasswordVaultEntry
} from '../types';

const PASSWORD_VAULT_COLLECTION = 'password_vault';
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

export const saveSettings = async (settings: SystemSettings) => {
 try {
 await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), cleanData(settings), { merge: true });
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, SETTINGS_COLLECTION);
 }
};

export const fetchRolePermissions = async (): Promise<RolePermission[]> => {
 try {
 const snap = await getDocs(collection(db, ROLE_PERMISSIONS_COLLECTION));
 return snap.docs.map(doc => doc.data() as RolePermission);
 } catch (error) {
 console.error("Error fetching role permissions", error);
 return [];
 }
};

export const saveRolePermission = async (rolePermission: RolePermission) => {
 try {
 await setDoc(doc(db, ROLE_PERMISSIONS_COLLECTION, rolePermission.role), cleanData(rolePermission), { merge: true });
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, ROLE_PERMISSIONS_COLLECTION);
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
    console.warn("Settings not yet created or offline, using defaults");
    return null;
  }
};

export const savePasswordEntry = async (entry: PasswordVaultEntry) => {
 try {
 await setDoc(doc(db, PASSWORD_VAULT_COLLECTION, entry.id), cleanData(entry), { merge: true });
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, PASSWORD_VAULT_COLLECTION);
 }
};

export const getPasswordEntries = async (): Promise<PasswordVaultEntry[]> => {
 try {
 const snap = await getDocs(collection(db, PASSWORD_VAULT_COLLECTION));
 return snap.docs.map(doc => doc.data() as PasswordVaultEntry);
 } catch (error) {
 handleFirestoreError(error, OperationType.GET, PASSWORD_VAULT_COLLECTION);
 return [];
 }
};

export const deletePasswordEntry = async (id: string) => {
 try {
 await deleteDoc(doc(db, PASSWORD_VAULT_COLLECTION, id));
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, PASSWORD_VAULT_COLLECTION);
 }
};

export const getSystemUser = async (uid: string): Promise<SystemUser | null> => {
 try {
 const docRef = doc(db, USER_COLLECTION, uid);
 const snap = await getDoc(docRef);
 if (snap.exists()) {
 return snap.data() as SystemUser;
 }
 return null;
 } catch (error) {
 console.error("Error fetching system user", error);
 return null;
 }
};

export const syncSystemUser = async (firebaseUser: any): Promise<SystemUser | null> => {
  if (!firebaseUser) return null;

  const elevatedRoles = [
    UserRole.ADMIN,
    UserRole.ADMIN_CAPS,
    UserRole.IT_SUPERVISOR,
    UserRole.IT_SUPERVISOR_CAPS,
    UserRole.MERCHANDISING_SUPERVISOR,
    UserRole.IT_DIGITAL_MARKETING
  ];

  const isSuperAdminEmail = firebaseUser.email === "it.taunggyipharmacy@gmail.com";
  const fallbackRole = isSuperAdminEmail ? UserRole.ADMIN : UserRole.STAFF;
  const isFallbackAdmin = elevatedRoles.includes(fallbackRole);

  try {
    const userRef = doc(db, USER_COLLECTION, firebaseUser.uid);
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (getErr) {
      console.warn("Could not read user doc from server, using local fallback state");
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
        role: fallbackRole,
        photoURL: firebaseUser.photoURL || "",
        createdAt: new Date(),
        lastLogin: new Date(),
        isAdmin: isFallbackAdmin
      };
    }

    if (!snap.exists()) {
      let isAdminDoc = false;
      try {
        isAdminDoc = await checkAdminStatus(firebaseUser.uid);
      } catch (_) {}

      const initialRole = (isAdminDoc || isSuperAdminEmail) ? UserRole.ADMIN : UserRole.STAFF;
      const isUserAdmin = elevatedRoles.includes(initialRole);

      const newUser: SystemUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
        role: initialRole,
        photoURL: firebaseUser.photoURL || "",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isAdmin: isUserAdmin
      };

      try {
        await setDoc(userRef, newUser, { merge: true });
        if (elevatedRoles.includes(newUser.role)) {
          await setDoc(doc(db, 'admins', firebaseUser.uid), {
            active: true,
            email: firebaseUser.email,
            role: newUser.role,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (writeErr) {
        console.warn("Could not persist new user doc immediately:", writeErr);
      }

      return newUser;
    } else {
      const userData = snap.data() as SystemUser;
      const isUserAdmin = elevatedRoles.includes(userData.role) || isSuperAdminEmail;

      try {
        await setDoc(userRef, {
          lastLogin: serverTimestamp(),
          displayName: firebaseUser.displayName || userData.displayName,
          photoURL: firebaseUser.photoURL || userData.photoURL,
          isAdmin: isUserAdmin
        }, { merge: true });

        if (isUserAdmin) {
          await setDoc(doc(db, 'admins', firebaseUser.uid), {
            active: true,
            email: firebaseUser.email,
            role: userData.role,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (writeErr) {
        console.warn("Could not update user lastLogin immediately:", writeErr);
      }

      return {
        ...userData,
        displayName: firebaseUser.displayName || userData.displayName,
        photoURL: firebaseUser.photoURL || userData.photoURL,
        isAdmin: isUserAdmin
      };
    }
  } catch (error) {
    console.error("Error in syncSystemUser:", error);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "User",
      role: fallbackRole,
      photoURL: firebaseUser.photoURL || "",
      createdAt: new Date(),
      lastLogin: new Date(),
      isAdmin: isFallbackAdmin
    };
  }
};

export const updateSystemUserRole = async (uid: string, role: UserRole) => {
 try {
 const userRef = doc(db, USER_COLLECTION, uid);
 
 // Also sync to 'admins' collection if they have an elevated role
 const elevatedRoles = [
 UserRole.ADMIN, 
 UserRole.ADMIN_CAPS,
 UserRole.IT_SUPERVISOR,
 UserRole.IT_SUPERVISOR_CAPS,
 UserRole.MERCHANDISING_SUPERVISOR,
 UserRole.IT_DIGITAL_MARKETING
 ];
 
 const isUserAdmin = elevatedRoles.includes(role);
 await setDoc(userRef, { role, isAdmin: isUserAdmin, updatedAt: serverTimestamp() }, { merge: true });
 
 if (elevatedRoles.includes(role)) {
 const userSnap = await getDoc(userRef);
 const userData = userSnap.data() as SystemUser;
 await setDoc(doc(db, 'admins', uid), { 
 active: true,
 email: userData?.email || "",
 role,
 updatedAt: serverTimestamp()
 }, { merge: true });
 } else {
 await deleteDoc(doc(db, 'admins', uid));
 }
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, USER_COLLECTION);
 }
};

export const getAllSystemUsers = async (): Promise<SystemUser[]> => {
 try {
 const snap = await getDocs(collection(db, USER_COLLECTION));
 return snap.docs.map(doc => doc.data() as SystemUser);
 } catch (error) {
 console.error("Error fetching all users", error);
 return [];
 }
};

export const saveEmployeeProfile = async (profile: Partial<EmployeeProfile>) => {
 try {
 const resolvedId = profile.id || doc(collection(db, EMPLOYEE_COLLECTION)).id;
 const docRef = doc(db, EMPLOYEE_COLLECTION, resolvedId);
 await setDoc(docRef, { ...profile, id: resolvedId }, { merge: true });
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, EMPLOYEE_COLLECTION);
 }
};

export const saveActivity = async (activity: Partial<ActivityEntry>) => {
 try {
 const user = auth.currentUser;
 const docRef = doc(collection(db, ACTIVITY_COLLECTION));
 await setDoc(docRef, {
 userId: user?.uid || "system",
 userName: user?.displayName || user?.email || "System",
 ...activity,
 id: docRef.id,
 timestamp: new Date().toISOString()
 });
 } catch (error) {
 console.error("Failed to log activity", error);
 }
};

const saveGenericRecord = async (collectionName: string, data: any) => {
 try {
 const docRef = data.id 
 ? doc(db, collectionName, data.id)
 : doc(collection(db, collectionName));
 
 const finalData = {
 ...data,
 id: docRef.id,
 updatedAt: serverTimestamp()
 };
 
 if (!data.id) {
 finalData.createdAt = serverTimestamp();
 }

 await setDoc(docRef, cleanData(finalData), { merge: true });
 return docRef.id;
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, collectionName);
 throw error;
 }
};

export const saveEvidence = async (evidence: Partial<TaskEvidence>) => saveGenericRecord(EVIDENCE_COLLECTION, evidence);

export const subscribeToSupervisorFeatures = ({
 onActivities,
 onEvidence,
 onAllDailyLogs,
 onEmployees
}: {
 onActivities: (a: ActivityEntry[]) => void,
 onEvidence: (e: TaskEvidence[]) => void,
 onAllDailyLogs: (l: DailyLog[]) => void,
 onEmployees: (e: EmployeeProfile[]) => void
}) => {
 const unsubActivities = onSnapshot(query(collection(db, ACTIVITY_COLLECTION), limit(50)), (snapshot) => {
 onActivities(snapshot.docs.map(doc => doc.data() as ActivityEntry).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
 }, (err) => handleFirestoreError(err, OperationType.LIST, ACTIVITY_COLLECTION));

 const unsubEvidence = onSnapshot(collection(db, EVIDENCE_COLLECTION), (snapshot) => {
 onEvidence(snapshot.docs.map(doc => doc.data() as TaskEvidence));
 }, (err) => handleFirestoreError(err, OperationType.LIST, EVIDENCE_COLLECTION));

 const unsubDailyLogs = onSnapshot(collection(db, DAILY_LOG_COLLECTION), (snapshot) => {
 onAllDailyLogs(snapshot.docs.map(doc => doc.data() as DailyLog));
 }, (err) => handleFirestoreError(err, OperationType.LIST, DAILY_LOG_COLLECTION));

 const unsubEmployees = onSnapshot(collection(db, EMPLOYEE_COLLECTION), (snapshot) => {
 onEmployees(snapshot.docs.map(doc => doc.data() as EmployeeProfile));
 }, (err) => handleFirestoreError(err, OperationType.LIST, EMPLOYEE_COLLECTION));

 return () => {
 unsubActivities();
 unsubEvidence();
 unsubDailyLogs();
 unsubEmployees();
 };
};

export const savePurchaseRecord = async (record: Partial<PurchaseRecord>) => {
 try {
 const recordRef = record.id 
 ? doc(db, PURCHASE_COLLECTION, record.id)
 : doc(collection(db, PURCHASE_COLLECTION));
 
 const recordId = recordRef.id;

 const finalData: any = {
 ...record,
 id: recordId,
 updatedAt: serverTimestamp()
 };

 if (!record.id) {
 finalData.createdAt = serverTimestamp();
 }

 await setDoc(recordRef, cleanData(finalData), { merge: true });

 const assetIds: string[] = [];

 // Automatically create entries in it_assets if sync is requested
 if (record.syncToInventory !== false) {
 const itemsToCreate: { model: string, category: string, isParent: boolean }[] = [];
 const itemDesc = (record.item || "").toLowerCase();
 
 // Heuristic parsing for bundles like "1 PC, 1 Keyboard, 1 Mouse" or "PC + Keyboard"
 if (itemDesc.includes(",") || itemDesc.includes("+")) {
 const parts = itemDesc.split(/[,\+]/).map(p => p.trim());
 parts.forEach((part, idx) => {
 let category = "Other";
 if (part.includes("pc") || part.includes("computer") || part.includes("laptop")) category = "Computer";
 else if (part.includes("kb") || part.includes("keyboard")) category = "Keyboard";
 else if (part.includes("mouse")) category = "Mouse";
 else if (part.includes("monitor")) category = "Monitor";
 else if (part.includes("ups")) category = "UPS";
 else if (part.includes("hub") || part.includes("usb")) category = "USB Hub";
 else if (part.includes("fan")) category = "Fan";
 else if (part.includes("printer")) category = "Printer";
 
 itemsToCreate.push({
 model: part.charAt(0).toUpperCase() + part.slice(1),
 category,
 isParent: idx === 0 || category === "Computer"
 });
 });
 } else {
 const quantity = Number(record.quantity) || 1;
 for (let i = 0; i < quantity; i++) {
 itemsToCreate.push({
 model: record.item,
 category: record.category || "Other",
 isParent: i === 0 && (record.category === "Computer" || record.item.toLowerCase().includes("pc"))
 });
 }
 }

 let parentAssetId: string | null = null;
 
 for (let i = 0; i < itemsToCreate.length; i++) {
 const itemInfo = itemsToCreate[i];
 const shadowAssetId = `ASSET-${recordId}-${String(i + 1).padStart(3, '0')}`;
 const assetRef = doc(db, ASSET_COLLECTION, shadowAssetId);
 
 const cat = itemInfo.category;
 const asset_code = await generateNextAssetCode(cat);

 const shadowAsset: Partial<ITAsset> = {
 id: shadowAssetId,
 asset_code,
 model: itemInfo.model,
 serialNumber: record.serialNumber || `SN-PENDING-${recordId}-${i+1}`,
 supplier: record.supplier,
 purchaseDate: record.date,
 status: "Pending / New Arrival",
 addedBy: "System Auto-Sync",
 purchaseRecordId: recordId,
 category: itemInfo.category as any,
 purchasePrice: String(record.price),
 itemPrice: itemsToCreate.length > 1 ? (record.price / itemsToCreate.length) : record.price,
 currency: record.currency || "MMK",
 assignedTo: "Unassigned",
 specs: `Automatic entry from Purchase Record ${recordId}. Part of bundle/group entry ${i+1}/${itemsToCreate.length}.`,
 parentId: (!itemInfo.isParent && parentAssetId) ? parentAssetId : null
 };


 if (itemInfo.isParent && !parentAssetId) {
 parentAssetId = shadowAssetId;
 }
 
 await setDoc(assetRef, cleanData({
 ...shadowAsset,
 createdAt: serverTimestamp(),
 updatedAt: serverTimestamp()
 }));
 
 assetIds.push(shadowAssetId);
 }
 }

 return { recordId, assetIds };
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, PURCHASE_COLLECTION);
 }
};

export const saveTicket = async (ticket: Partial<ITTicket>) => saveGenericRecord(TICKET_COLLECTION, ticket);

export const generateNextAssetCode = async (category: string, currentOffset: number = 0) => {
 return await runTransaction(db, async (transaction) => {
 const categoryKey = (category || "other").toLowerCase().replace(/\s+/g, '_');
 const counterRef = doc(db, "counters", `assetCode_${categoryKey}`);
 const counterSnap = await transaction.get(counterRef);
 
 let lastNumber = 0;
 if (counterSnap.exists()) {
 lastNumber = counterSnap.data().lastNumber || 0;
 }
 
 // We ignore currentOffset because transaction-based counters naturally advance sequentially,
 // but we support it just in case any caller requires it explicitly.
 const nextNumber = lastNumber + 1 + (currentOffset > 0 ? currentOffset : 0);
 
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

 const prefix = getPrefix(category);
 const code = `${prefix}${String(nextNumber).padStart(3, '0')}`;
 
 transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
 
 return code;
 });
};


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

  if (!asset.id && !asset.asset_code && asset.category) {
    const categoryKey = (asset.category || "other").toLowerCase().replace(/\s+/g, "_");
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

    try {
      return await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, "counters", `assetCode_${categoryKey}`);
        const counterSnap = await transaction.get(counterRef);
        
        let lastNumber = 0;
        if (counterSnap.exists()) {
          lastNumber = counterSnap.data().lastNumber || 0;
        }
        
        const nextNumber = lastNumber + 1;
        const prefix = getPrefix(asset.category);
        const code = `${prefix}${String(nextNumber).padStart(3, "0")}`;
        
        const assetRef = doc(collection(db, ASSET_COLLECTION));
        const finalAsset = {
          ...sanitized,
          id: assetRef.id,
          asset_code: code,
          createdAt: serverTimestamp()
        };
        
        transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
        transaction.set(assetRef, finalAsset);
        
        // Mutate original object
        asset.id = assetRef.id;
        asset.asset_code = code;
        
        return assetRef.id;
      });
    } catch (txError) {
      console.warn("Transaction failed, saving asset directly:", txError);
      
      const fallbackRef = doc(collection(db, ASSET_COLLECTION));
      const code = `${getPrefix(asset.category)}${Date.now().toString().slice(-4)}`;
      const finalAsset = {
        ...sanitized,
        id: fallbackRef.id,
        asset_code: code,
        createdAt: serverTimestamp()
      };
      
      await setDoc(fallbackRef, finalAsset);
      asset.id = fallbackRef.id;
      asset.asset_code = code;

      try {
        const counterRef = doc(db, "counters", `assetCode_${categoryKey}`);
        await setDoc(counterRef, { lastNumber: increment(1) }, { merge: true });
      } catch (_) {}

      return fallbackRef.id;
    } finally {
      saveActivity({
        action: "Asset Registered",
        details: `Registered asset ${asset.asset_code || ""} (${asset.brand || ""} ${asset.model || ""})`
      }).catch(() => {});
    }
  } else {
    return saveGenericRecord(ASSET_COLLECTION, sanitized);
  }
};

export const initializeAssetCodeCounters = async () => {
 try {
 const assetsSnap = await getDocs(collection(db, ASSET_COLLECTION));
 const maxNumbers: Record<string, number> = {};

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

 assetsSnap.docs.forEach(docSnap => {
 const data = docSnap.data();
 const code = data.asset_code;
 const category = (data.category || "").toLowerCase().replace(/\s+/g, '_');
 if (code && typeof code === 'string') {
 const prefix = getPrefix(data.category);
 if (code.startsWith(prefix)) {
 const parts = code.split("-");
 const numPart = parts[parts.length - 1];
 const num = parseInt(numPart || "0", 10);
 if (!isNaN(num)) {
 if (!maxNumbers[category] || num > maxNumbers[category]) {
 maxNumbers[category] = num;
 }
 }
 }
 }
 });

 const batch = writeBatch(db);
 // Seed default categories
 const defaultCategories = ["computer", "keyboard", "mouse", "fan", "usb_hub", "printer", "phone", "scanner", "other"];
 defaultCategories.forEach(cat => {
 if (maxNumbers[cat] === undefined) {
 maxNumbers[cat] = 0;
 }
 });

 for (const [category, maxNum] of Object.entries(maxNumbers)) {
 const counterRef = doc(db, "counters", `assetCode_${category}`);
 batch.set(counterRef, { lastNumber: maxNum }, { merge: true });
 }
 await batch.commit();

 return { success: true, counts: maxNumbers };
 } catch (error) {
 console.error("Failed to initialize asset counters:", error);
 throw error;
 }
};
export const saveBackup = async (backup: Partial<BackupLog>) => saveGenericRecord(BACKUP_COLLECTION, backup);
export const saveCCTVRequest = async (request: Partial<CCTVRequest>) => saveGenericRecord(CCTV_COLLECTION, request);
export const saveContentPlan = async (plan: Partial<ContentPlan>) => saveGenericRecord(CONTENT_PLAN_COLLECTION, plan);
export const saveRenewal = async (renewal: Partial<RenewalRecord>) => saveGenericRecord(RENEWAL_COLLECTION, renewal);

export const updateRenewalOrder = async (renewals: RenewalRecord[]) => {
 try {
 const batch = writeBatch(db);

 renewals.forEach((renewal, index) => {
 batch.set(
 doc(db, RENEWAL_COLLECTION, renewal.id),
 {
 orderIndex: index + 1,
 updatedAt: serverTimestamp()
 },
 { merge: true }
 );
 });

 await batch.commit();
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, RENEWAL_COLLECTION);
 throw error;
 }
};
export const saveMeetingMinute = async (meeting: Partial<MeetingMinute>) => saveGenericRecord(MEETING_MINUTES_COLLECTION, meeting);
export const saveDailyLog = async (log: Partial<DailyLog>) => {
 try {
 const docRef = doc(db, DAILY_LOG_COLLECTION, log.id!);
 await setDoc(docRef, cleanData({
 ...log,
 updatedAt: serverTimestamp()
 }), { merge: true });
 return log.id;
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, `${DAILY_LOG_COLLECTION}/${log.id}`);
 }
};

export const getDailyLog = async (id: string) => {
 try {
 const docRef = doc(db, DAILY_LOG_COLLECTION, id);
 const snap = await getDoc(docRef);
 if (snap.exists()) {
 return snap.data() as DailyLog;
 }
 return null;
 } catch (error) {
 handleFirestoreError(error, OperationType.GET, `${DAILY_LOG_COLLECTION}/${id}`);
 }
};

export const saveMonthlyLog = async (log: Partial<MonthlyLog>) => {
 try {
 const docRef = doc(db, MONTHLY_LOG_COLLECTION, log.id!);
 await setDoc(docRef, cleanData({
 ...log,
 updatedAt: serverTimestamp()
 }), { merge: true });
 return log.id;
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, `${MONTHLY_LOG_COLLECTION}/${log.id}`);
 }
};

export const getMonthlyLog = async (id: string) => {
 try {
 const docRef = doc(db, MONTHLY_LOG_COLLECTION, id);
 const snap = await getDoc(docRef);
 if (snap.exists()) {
 return snap.data() as MonthlyLog;
 }
 return null;
 } catch (error) {
 handleFirestoreError(error, OperationType.GET, `${MONTHLY_LOG_COLLECTION}/${id}`);
 }
};

export const saveWeeklyLog = async (log: Partial<WeeklyLog>) => {
 try {
 const docRef = doc(db, WEEKLY_LOG_COLLECTION, log.id!);
 await setDoc(docRef, cleanData({
 ...log,
 updatedAt: serverTimestamp()
 }), { merge: true });
 return log.id;
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, `${WEEKLY_LOG_COLLECTION}/${log.id}`);
 }
};

export const getWeeklyLog = async (id: string) => {
 try {
 const docRef = doc(db, WEEKLY_LOG_COLLECTION, id);
 const snap = await getDoc(docRef);
 if (snap.exists()) {
 return snap.data() as WeeklyLog;
 }
 return null;
 } catch (error) {
 handleFirestoreError(error, OperationType.GET, `${WEEKLY_LOG_COLLECTION}/${id}`);
 }
};

const cleanData = (data: any): any => {
 if (data === null || typeof data !== 'object') {
 return data;
 }
 
 if (data instanceof Date) {
 return data;
 }

 if (Array.isArray(data)) {
 return data.map(item => cleanData(item)).filter(item => item !== undefined);
 }

 const clean: any = {};
 Object.keys(data).forEach(key => {
 const value = data[key];
 if (value !== undefined) {
 clean[key] = cleanData(value);
 }
 });
 return clean;
};


const createOrUpdatePeripheral = async (
 batch: any, 
 category: string, 
 model: string, 
 serialNumber: string, 
 price: number, 
 parentAssetId: string, 
 categoryHighestCodes: Record<string, number>
) => {
 const cleanModel = (model || '').toString().trim();
 const cleanSerial = (serialNumber || 'N/A').toString().trim();
 const cleanPrice = Number(price) || 0;

 if (!cleanModel && (!cleanSerial || cleanSerial === 'N/A')) return;

 // Search by serial/model within this specific category to avoid collisions
 const q = query(
 collection(db, ASSET_COLLECTION), 
 where("category", "==", category),
 where("serialNumber", "==", cleanSerial)
 );
 
 const snap = await getDocs(q);
 
 if (!snap.empty) {
 // Update existing
 const docRef = snap.docs[0].ref;
 batch.update(docRef, cleanData({
 model: cleanModel,
 purchasePrice: String(cleanPrice),
 parentId: parentAssetId,
 updatedAt: serverTimestamp()
 }));
 } else {
 // Insert new
 const newAssetCode = await generateNextAssetCode(category);
 
 const assetRef = doc(collection(db, ASSET_COLLECTION));
 batch.set(assetRef, cleanData({
 id: assetRef.id,
 asset_code: newAssetCode,
 category,
 model: cleanModel,
 serialNumber: cleanSerial,
 parentId: parentAssetId,
 status: 'Active',
 purchasePrice: String(cleanPrice),
 createdAt: serverTimestamp(),
 updatedAt: serverTimestamp()
 }));
 }
};

export const importLegacyExcelData = async (excelRows: any[]) => {
 try {
 const batch = writeBatch(db);
 const assetsRef = collection(db, ASSET_COLLECTION);
 
 // Helper to get prefix
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

 // Helper to get pure max number for a category
 const getMaxNumber = async (category: string, prefix: string): Promise<number> => {
 try {
 const q = query(
 collection(db, ASSET_COLLECTION),
 where('category', '==', category),
 orderBy('asset_code', 'desc'),
 limit(1)
 );
 const snap = await getDocs(q);
 if (!snap.empty) {
 const code = snap.docs[0].data().asset_code || "";
 const parts = code.split("-");
 const numPart = parts[parts.length - 1];
 return parseInt(numPart || "0", 10) || 0;
 }
 } catch (e) {
 // Fallback if index missing
 const q = query(collection(db, ASSET_COLLECTION), where('category', '==', category));
 const snap = await getDocs(q);
 let max = 0;
 snap.docs.forEach(d => {
 const code = d.data().asset_code || "";
 if (code.startsWith(prefix)) {
 const num = parseInt(code.split("-").pop() || "0", 10);
 if (num > max) max = num;
 }
 });
 return max;
 }
 return 0;
 };

 // Dynamically fetch and cache counters for categories seen in the data
 const categoryCounters: Record<string, number> = {};
 const categoryPrefixes: Record<string, string> = {};

 const processedAssets: any[] = [];

 for (const row of excelRows) {
 const assetCode = (row['Asset Code'] || '').toString().trim();
 const category = (row['Category'] || '').toString().trim();
 if (!category) continue;

 // Determine Code
 let finalCode = assetCode;
 if (!finalCode) {
 if (categoryCounters[category] === undefined) {
 const prefix = getPrefix(category);
 categoryPrefixes[category] = prefix;
 categoryCounters[category] = await getMaxNumber(category, prefix);
 }
 
 categoryCounters[category]++;
 const countStr = String(categoryCounters[category]).padStart(3, '0');
 finalCode = categoryPrefixes[category] + countStr;
 }

 const docRef = doc(assetsRef, finalCode);
 const assetData = cleanData({
 asset_code: finalCode,
 category: category,
 model: (row['Brand/Model'] || '').toString().trim() || "N/A",
 serialNumber: (row['Serial Number'] || '').toString().trim(),
 specs: (row['Specs'] || '').toString().trim(),
 purchaseDate: (row['Purchase Date'] || '').toString().trim(),
 purchasePrice: String(Number(row['Price'] || 0)),
 status: (row['Status'] || 'Active').toString().trim(),
 parentId: (row['Parent Asset Code'] || '').toString().trim(),
 assignedTo: (row['Assigned User'] || '').toString().trim(),
 department: (row['Department'] || '').toString().trim(),
 location: (row['Location'] || '').toString().trim(),
 section: (row['Section'] || '').toString().trim(),
 uom: (row['UOM'] || 'Set').toString().trim(),
 maintenanceDueDate: (row['Maintenance Due'] || 'Not set').toString().trim(),
 updatedAt: serverTimestamp()
 });

 batch.set(docRef, assetData, { merge: true });
 processedAssets.push({ id: finalCode, ...assetData });
 }

 await batch.commit();
 try {
 await initializeAssetCodeCounters();
 } catch (err) {
 console.error("Failed to auto-reinitialize asset counters after bulk import:", err);
 }
 return { success: true, message: "Import completed successfully.", assets: processedAssets };
 } catch (error) {
 console.error("Bulk upsert failed:", error);
 handleFirestoreError(error, OperationType.WRITE, ASSET_COLLECTION);
 throw error;
 }
};


export const migrateAssetsToSequentialCodes = async (dryRun: boolean = false) => {
 try {
 const snap = await getDocs(collection(db, ASSET_COLLECTION));
 const allAssets = snap.docs.map(doc => doc.data() as ITAsset);
 
 // Group assets by category
 const groupedAssets: Record<string, ITAsset[]> = {};
 for (const asset of allAssets) {
 const cat = asset.category || "Other";
 if (!groupedAssets[cat]) {
 groupedAssets[cat] = [];
 }
 groupedAssets[cat].push(asset);
 }
 
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

 const batchSize = 400; // Firestore batch limit is 500
 let processedCount = 0;
 const logs: string[] = [];
 
 for (const category in groupedAssets) {
 const categoryAssets = groupedAssets[category];
 
 // Sort assets. Try to extract numbers from existing asset_code to preserve sequence order.
 // E.g., 'TG-PC-003', 'TG001', 'PH-TG002', 'SCN-TG020'
 categoryAssets.sort((a, b) => {
 const getNum = (code: string | undefined): number => {
 if (!code) return 0;
 const match = code.match(/(\d+)$/);
 return match ? parseInt(match[1], 10) : 0;
 };
 const numA = getNum(a.asset_code);
 const numB = getNum(b.asset_code);
 if (numA !== numB) return numA - numB;
 // Fallback to ID alphabetical
 return a.id.localeCompare(b.id);
 });
 
 const prefix = getPrefix(category);
 let count = 1;
 
 for (let i = 0; i < categoryAssets.length; i += batchSize) {
 const batch = writeBatch(db);
 const chunk = categoryAssets.slice(i, i + batchSize);
 let chunkHasChanges = false;
 
 for (const asset of chunk) {
 const formattedCode = `${prefix}${String(count).padStart(3, '0')}`;
 
 if (asset.asset_code !== formattedCode) {
 const logStr = `[${category}] ${asset.id} | Old: ${asset.asset_code || 'none'} -> New: ${formattedCode}`;
 logs.push(logStr);
 console.log(logStr);
 if (!dryRun) {
 const docRef = doc(db, ASSET_COLLECTION, asset.id);
 batch.update(docRef, { asset_code: formattedCode });
 }
 processedCount++;
 chunkHasChanges = true;
 }
 count++;
 }
 
 if (!dryRun && chunkHasChanges) {
 await batch.commit();
 }
 }
 }
 
 if (dryRun) {
 console.log(`[DRY RUN] Would have updated ${processedCount} records.`);
 } else {
 console.log(`[LIVE RUN] Successfully updated ${processedCount} records.`);
 try {
 await initializeAssetCodeCounters();
 } catch (e) {
 console.error("Failed to automatically re-initialize counters after sequential code standardizer:", e);
 }
 }
 
 return { success: true, processedCount, logs };
 } catch (error) {
 console.error("Migration failed", error);
 throw error;
 }
};

export const importKeyboardsMigration = async () => {
 try {
 const keyboardData = [
 { brand: "Delux", serialNumber: "SN KOM-0221F000027", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "M33250U SN K600523J001400", quantity: 1, price: 27000, date: "28/07/2025" },
 { brand: "Delux", serialNumber: "SN K6810 SN K681023J001508", quantity: 1, price: 29000, date: "14/08/2025" },
 { brand: "Delux", serialNumber: "SN K601121F007421", quantity: 1, price: 29000, date: "28/07/2025" },
 { brand: "Crome", serialNumber: "SN CK150U20G000194", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "SN KA15022A002918", quantity: 1, price: 13000, date: "28/07/2022" },
 { brand: "Logitech", serialNumber: "SN K1202038SC31S7C8", quantity: 1, price: 0, date: "01/06/2021" },
 { brand: "Logicom", serialNumber: "SN KA15021L001442", quantity: 1, price: 20000, date: "19/02/2024" },
 { brand: "Delux", serialNumber: "SN KA15022A002504", quantity: 1, price: 20000, date: "21/07/2023" },
 { brand: "Delux", serialNumber: "SN K601122A002041", quantity: 1, price: 15000, date: "07/05/2023" },
 { brand: "Logicom", serialNumber: "SN KA15021L000054", quantity: 1, price: 0, date: "" },
 { brand: "Logicom", serialNumber: "SN KA150211000057", quantity: 1, price: 0, date: "" },
 { brand: "Crome", serialNumber: "SN CK1901123C001339", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "SN KA15020K002605", quantity: 1, price: 20000, date: "19/02/2024" },
 { brand: "Logicom", serialNumber: "SN KA15021L001443", quantity: 1, price: 20000, date: "19/02/2024" },
 { brand: "Delux", serialNumber: "SN KA15022A003188", quantity: 1, price: 15500, date: "28/06/2023" },
 { brand: "Delux", serialNumber: "SN KA15021F003269", quantity: 1, price: 12000, date: "21/07/2022" },
 { brand: "Logicom", serialNumber: "SN KA15021L000055", quantity: 1, price: 19000, date: "18/12/2023" },
 { brand: "Logicom", serialNumber: "SN KA15021L000042", quantity: 1, price: 19000, date: "02/12/2023" },
 { brand: "Delux", serialNumber: "SN KA15022A003187", quantity: 1, price: 15500, date: "28/06/2023" },
 { brand: "Delux", serialNumber: "SN KA15021F007897", quantity: 1, price: 0, date: "" },
 { brand: "Crome", serialNumber: "SN CK 150020B001040", quantity: 1, price: 0, date: "" },
 { brand: "Logicom", serialNumber: "SN KA15021L000605", quantity: 1, price: 0, date: "" },
 { brand: "Artwork", serialNumber: "SN KM988", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "SN KA15020K002214", quantity: 1, price: 0, date: "" },
 { brand: "Logicom", serialNumber: "SN KA15021L000050", quantity: 1, price: 0, date: "" },
 { brand: "Logicom", serialNumber: "SN K15021L000046", quantity: 1, price: 19000, date: "11/12/2023" },
 { brand: "Delux", serialNumber: "SN KA15021F002689", quantity: 1, price: 0, date: "" },
 { brand: "A4 Tech", serialNumber: "SN 22LIU00", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "KA 15021F002689", quantity: 1, price: 0, date: "" },
 { brand: "A4 Tech", serialNumber: "SN MS1702KRS850", quantity: 1, price: 0, date: "" },
 { brand: "Prolink", serialNumber: "SN 627801193101777", quantity: 1, price: 0, date: "00/01/1900" },
 { brand: "Crome", serialNumber: "SN CK150U22L000587", quantity: 1, price: 44000, date: "28/08/2024" },
 { brand: "Delux", serialNumber: "SN KA15022A001296", quantity: 1, price: 15500, date: "05/06/2023" },
 { brand: "Delux", serialNumber: "SN KA15022A001293", quantity: 1, price: 15500, date: "05/06/2023" },
 { brand: "Delux", serialNumber: "SN KA15022A001292", quantity: 1, price: 15500, date: "05/06/2023" },
 { brand: "Delux", serialNumber: "SN KA15022A007417", quantity: 1, price: 0, date: "" },
 { brand: "Other", serialNumber: "FOC", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "SN K630020K001453", quantity: 1, price: 0, date: "" },
 { brand: "Crome", serialNumber: "SN CK150U20B001048", quantity: 1, price: 0, date: "" },
 { brand: "Crome", serialNumber: "SN CK150U20B000158", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "KA15022A010003", quantity: 1, price: 11500, date: "05/05/2022" },
 { brand: "Logicom", serialNumber: "SN AK15021L000053", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "SN KA150022B000075", quantity: 1, price: 0, date: "" },
 { brand: "Delux", serialNumber: "SN KA15022A003181", quantity: 1, price: 15500, date: "18/06/2023" },
 { brand: "Delux", serialNumber: "SN KA15020K004450", quantity: 1, price: 11500, date: "10/07/2022" },
 { brand: "Prolink", serialNumber: "SN 6121401235103292", quantity: 1, price: 37000, date: "23/08/2024" },
 { brand: "Delux", serialNumber: "SN K701023100030", quantity: 1, price: 30000, date: "28/08/2024" },
 { brand: "Logicom", serialNumber: "SN KA15021L0002375", quantity: 1, price: 32000, date: "15/09/2024" },
 { brand: "DM", serialNumber: "SN K 6810 SN K681023J001512", quantity: 1, price: 29000, date: "14/08/2025" },
 { brand: "Delux", serialNumber: "SN K681023J001746", quantity: 1, price: 29000, date: "16/12/2024" },
 { brand: "Delux", serialNumber: "SN K600523J001824", quantity: 1, price: 25000, date: "15/01/2025" },
 { brand: "Delux", serialNumber: "SN K681023J001855", quantity: 1, price: 29000, date: "09/08/2025" },
 { brand: "Delux", serialNumber: "SN K681023J000591", quantity: 1, price: 29000, date: "09/08/2025" },
 { brand: "Delux", serialNumber: "SN K601121F007422", quantity: 1, price: 0, date: "28/07/2025" },
 { brand: "Delux", serialNumber: "SN CK150U2L000586", quantity: 1, price: 44000, date: "28/08/2024" }
 ];

 let importedCount = 0;
 
 // We fetch one by one to ensure sequence generation runs properly.
 for (let i = 0; i < keyboardData.length; i++) {
 const kb = keyboardData[i];
 let formattedDate = "";
 if (kb.date && kb.date.includes("/")) {
 const parts = kb.date.split("/");
 if (parts.length === 3) {
 formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
 }
 }
 
 const newAsset: Partial<ITAsset> = {
 category: "Keyboard",
 brand: kb.brand,
 model: "Keyboard",
 serialNumber: kb.serialNumber,
 purchasePrice: String(kb.price),
 itemPrice: kb.price,
 purchaseDate: formattedDate || "",
 currency: "MMK",
 status: "Standalone / Spare",
 location: "Taunggyi Pharmacy",
 department: "IT",
 addedBy: "Keyboard Bulk Import Script",
 };
 
 await saveAsset(newAsset);
 importedCount++;
 }
 
 return { success: true, importedCount };
 } catch (error) {
 console.error("Keyboard import failed", error);
 throw error;
 }
};

export const updateAssetAssignment = async (assetId: string, assignedUser: string, location: string, department: string, status: string, additionalFields: Partial<ITAsset> = {}) => {
 try {
 const assetRef = doc(db, ASSET_COLLECTION, assetId);
 await setDoc(assetRef, cleanData({
 assignedTo: assignedUser,
 status: status,
 department: department || "",
 location: location || "",
 ...additionalFields,
 updatedAt: serverTimestamp()
 }), { merge: true });

 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, ASSET_COLLECTION);
 }
};

export const checkAdminStatus = async (uid: string): Promise<boolean> => {
 try {
 const adminRef = doc(db, 'admins', uid);
 const snap = await getDoc(adminRef);
 return snap.exists();
 } catch (error) {
 console.error("Error checking admin status", error);
 return false;
 }
};

export const deleteAsset = async (assetId: string) => {
 try {
 // Unlink any children first
 const assetRef = doc(db, ASSET_COLLECTION, assetId);
 const childrenQuery = query(collection(db, ASSET_COLLECTION), where("parentId", "==", assetId));
 const childrenSnap = await getDocs(childrenQuery);
 
 for (const childDoc of childrenSnap.docs) {
 await setDoc(doc(db, ASSET_COLLECTION, childDoc.id), { 
 parentId: null, 
 status: "Standalone / Spare",
 updatedAt: serverTimestamp() 
 }, { merge: true });
 }

 await deleteDoc(assetRef);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, ASSET_COLLECTION);
 }
};

export const clearAllAssets = async () => {
 try {
 const querySnapshot = await getDocs(collection(db, ASSET_COLLECTION));
 if (querySnapshot.empty) return;

 let batch = writeBatch(db);
 let count = 0;

 for (const docSnapshot of querySnapshot.docs) {
 batch.delete(docSnapshot.ref);
 count++;
 if (count === 500) {
 await batch.commit();
 batch = writeBatch(db);
 count = 0;
 }
 }
 
 if (count > 0) {
 await batch.commit();
 }
 } catch (error) {
 handleFirestoreError(error, OperationType.WRITE, ASSET_COLLECTION);
 throw error;
 }
};

export const deletePurchaseRecord = async (recordId: string) => {
 try {
 const recordRef = doc(db, PURCHASE_COLLECTION, recordId);
 await deleteDoc(recordRef);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, PURCHASE_COLLECTION);
 }
};

export const deleteTicket = async (ticketId: string) => {
 try {
 const recordRef = doc(db, TICKET_COLLECTION, ticketId);
 await deleteDoc(recordRef);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, TICKET_COLLECTION);
 }
};

export const deleteMeetingMinute = async (meetingId: string) => {
 try {
 const recordRef = doc(db, MEETING_MINUTES_COLLECTION, meetingId);
 await deleteDoc(recordRef);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, MEETING_MINUTES_COLLECTION);
 }
};

export const deleteRenewal = async (id: string) => {
 try {
 const recordRef = doc(db, RENEWAL_COLLECTION, id);
 await deleteDoc(recordRef);
 } catch (error) {
 handleFirestoreError(error, OperationType.DELETE, RENEWAL_COLLECTION);
 }
};

export const fetchAllRecords = async () => {
 try {
 const purchaseSnap = await getDocs(collection(db, PURCHASE_COLLECTION));
 const assetSnap = await getDocs(collection(db, ASSET_COLLECTION));
 const ticketSnap = await getDocs(collection(db, TICKET_COLLECTION));

 const purchases = purchaseSnap.docs.map(doc => doc.data() as PurchaseRecord);
 const assets = assetSnap.docs.map(doc => doc.data() as ITAsset);
 const tickets = ticketSnap.docs.map(doc => doc.data() as ITTicket);

 return { purchases, assets, tickets };
 } catch (error) {
 handleFirestoreError(error, OperationType.LIST, 'Multiple');
 }
};

export const subscribeToSync = ({
 onPurchases,
 onAssets,
 onTickets,
 onBackups,
 onCCTV,
 onPlans,
 onRenewals
}: {
 onPurchases: (p: PurchaseRecord[]) => void, 
 onAssets: (a: ITAsset[]) => void,
 onTickets: (t: ITTicket[]) => void,
 onBackups: (b: BackupLog[]) => void,
 onCCTV: (c: CCTVRequest[]) => void,
 onPlans: (p: ContentPlan[]) => void,
 onRenewals: (r: RenewalRecord[]) => void
}) => {
 const unsubPurchases = onSnapshot(collection(db, PURCHASE_COLLECTION), (snapshot) => {
 onPurchases(snapshot.docs.map(doc => doc.data() as PurchaseRecord));
 }, (error) => {
 handleFirestoreError(error, OperationType.GET, PURCHASE_COLLECTION);
 });

 const unsubAssets = onSnapshot(collection(db, ASSET_COLLECTION), (snapshot) => {
 onAssets(snapshot.docs.map(doc => doc.data() as ITAsset));
 }, (error) => {
 handleFirestoreError(error, OperationType.GET, ASSET_COLLECTION);
 });

 const unsubTickets = onSnapshot(collection(db, TICKET_COLLECTION), (snapshot) => {
 onTickets(snapshot.docs.map(doc => doc.data() as ITTicket));
 }, (error) => {
 handleFirestoreError(error, OperationType.GET, TICKET_COLLECTION);
 });

 const unsubBackups = onSnapshot(collection(db, BACKUP_COLLECTION), (snapshot) => {
 onBackups(snapshot.docs.map(doc => doc.data() as BackupLog));
 }, (error) => {
 handleFirestoreError(error, OperationType.GET, BACKUP_COLLECTION);
 });

 const unsubCCTV = onSnapshot(collection(db, CCTV_COLLECTION), (snapshot) => {
 onCCTV(snapshot.docs.map(doc => doc.data() as CCTVRequest));
 }, (error) => {
 handleFirestoreError(error, OperationType.GET, CCTV_COLLECTION);
 });

 const unsubPlans = onSnapshot(collection(db, CONTENT_PLAN_COLLECTION), (snapshot) => {
 onPlans(snapshot.docs.map(doc => doc.data() as ContentPlan));
 }, (error) => {
 handleFirestoreError(error, OperationType.GET, CONTENT_PLAN_COLLECTION);
 });

 const unsubRenewals = onSnapshot(collection(db, RENEWAL_COLLECTION), (snapshot) => {
 onRenewals(snapshot.docs.map(doc => doc.data() as RenewalRecord));
 }, (error) => {
 handleFirestoreError(error, OperationType.GET, RENEWAL_COLLECTION);
 });

 return () => {
 unsubPurchases();
 unsubAssets();
 unsubTickets();
 unsubBackups();
 unsubCCTV();
 unsubPlans();
 unsubRenewals();
 };
};

export const fetchStorageFiles = async (folderId?: string) => {
 try {
 let url = '/api/drive/files';
 if (folderId) {
 url = `/api/drive/files?folderId=${encodeURIComponent(folderId)}`;
 }
 const user = auth.currentUser;
 const token = user ? await user.getIdToken() : "";
 const response = await fetch(url, {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });
 if (!response.ok) {
 throw new Error(`API returned ${response.status}`);
 }
 const data = await response.json();
 return data;
 } catch (error) {
 console.error("Storage fetch failed", error);
 return [];
 }
};

export const fetchStorageQuota = async () => {
 try {
 const user = auth.currentUser;
 const token = user ? await user.getIdToken() : "";
 const response = await fetch('/api/drive/quota', {
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });
 if (!response.ok) {
 throw new Error(`API returned ${response.status}`);
 }
 return await response.json();
 } catch (error) {
 console.error("Quota fetch failed", error);
 return { limit: "2199023255552", usage: "0" }; // Fallback to 2TB (Matches user account)
 }
};

export const deleteStorageFile = async (fileId: string) => {
 try {
 const user = auth.currentUser;
 const token = user ? await user.getIdToken() : "";
 const response = await fetch(`/api/drive/files/${encodeURIComponent(fileId)}`, {
 method: "DELETE",
 headers: {
 'Authorization': `Bearer ${token}`
 }
 });
 if (!response.ok) {
 throw new Error(`API returned ${response.status}`);
 }
 } catch (error) {
 console.error("Storage delete failed", error);
 throw error;
 }
};

export const migrateExistingUsersToAdmins = async (): Promise<{ success: boolean; count: number; error?: string }> => {
 try {
 const snap = await getDocs(collection(db, USER_COLLECTION));
 const elevatedRoles = [
 "IT Supervisor",
 "IT SUPERVISOR",
 "System Admin",
 "SYSTEM ADMIN",
 "Admin",
 "ADMIN",
 "Merchandising Supervisor",
 "IT Digital Marketing"
 ];
 let count = 0;
 
 // Use writeBatch for safety and performance
 const batch = writeBatch(db);
 
 snap.docs.forEach((userDoc) => {
 const data = userDoc.data();
 const role = data.role;
 const computedIsAdmin = elevatedRoles.includes(role);
 
 // Update only if isAdmin is unset or has incorrect value
 if (data.isAdmin !== computedIsAdmin) {
 batch.set(userDoc.ref, { isAdmin: computedIsAdmin }, { merge: true });
 count++;
 }
 });
 
 if (count > 0) {
 await batch.commit();
 }
 
 return { success: true, count };
 } catch (error: any) {
 console.error("Migration error:", error);
 return { success: false, count: 0, error: error.message || String(error) };
 }
};

