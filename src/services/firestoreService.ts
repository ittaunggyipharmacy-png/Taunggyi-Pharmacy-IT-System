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
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { PurchaseRecord, ITAsset, ITTicket, BackupLog, CCTVRequest, ContentPlan, RenewalRecord, DailyLog, MonthlyLog, WeeklyLog, ActivityEntry, TaskEvidence } from '../types';

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

import { EmployeeProfile, SystemUser, UserRole } from '../types';

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

export const syncSystemUser = async (firebaseUser: any) => {
  try {
    const userRef = doc(db, USER_COLLECTION, firebaseUser.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      // Check if they are in the admins collection to bootstrap
      const isAdmin = await checkAdminStatus(firebaseUser.uid);
      const newUser: SystemUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "",
        role: isAdmin ? UserRole.ADMIN : UserRole.STAFF,
        photoURL: firebaseUser.photoURL || "",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      await setDoc(userRef, newUser);
      return newUser;
    } else {
      await setDoc(userRef, { 
        lastLogin: serverTimestamp(),
        displayName: firebaseUser.displayName || snap.data().displayName,
        photoURL: firebaseUser.photoURL || snap.data().photoURL
      }, { merge: true });
      return snap.data() as SystemUser;
    }
  } catch (error) {
    console.error("Error syncing system user", error);
    return null;
  }
};

export const updateSystemUserRole = async (uid: string, role: UserRole) => {
  try {
    const userRef = doc(db, USER_COLLECTION, uid);
    await setDoc(userRef, { role, updatedAt: serverTimestamp() }, { merge: true });
    
    // Also sync to 'admins' collection if they have an elevated role
    const elevatedRoles = [
      UserRole.ADMIN, 
      UserRole.IT_SUPERVISOR, 
      UserRole.MERCHANDISING_SUPERVISOR, 
      UserRole.IT_DIGITAL_MARKETING
    ];
    
    if (elevatedRoles.includes(role)) {
      await setDoc(doc(db, 'admins', uid), { active: true });
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
    const docRef = doc(db, EMPLOYEE_COLLECTION, profile.id || "new");
    if (!profile.id) {
       profile.id = docRef.id;
    }
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, EMPLOYEE_COLLECTION);
  }
};

export const saveActivity = async (activity: Partial<ActivityEntry>) => {
  try {
    const docRef = doc(collection(db, ACTIVITY_COLLECTION));
    await setDoc(docRef, {
      ...activity,
      id: docRef.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log activity", error);
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

    await setDoc(recordRef, {
      ...record,
      id: recordId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Automatically create a shadow entry in it_assets
    const shadowAssetId = `ASSET-SHADOW-${recordId}`;
    const assetRef = doc(db, ASSET_COLLECTION, shadowAssetId);
    const shadowAsset: Partial<ITAsset> = {
      id: shadowAssetId,
      model: record.item,
      category: (record.category as any) || "Other",
      purchaseDate: record.date,
      purchasePrice: String(record.price),
      currency: record.currency || "MMK",
      status: "In Stock" as any,
      assignedTo: "Unassigned",
      purchaseRecordId: recordId,
      specs: `Automatic entry from Purchase Record ${recordId}. Supplier: ${record.supplier}`,
    };
    
    await setDoc(assetRef, {
      ...shadowAsset,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { recordId, assetId: shadowAssetId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PURCHASE_COLLECTION);
  }
};

export const saveTicket = async (ticket: Partial<ITTicket>) => saveGenericRecord(TICKET_COLLECTION, ticket);
export const saveAsset = async (asset: Partial<ITAsset>) => saveGenericRecord(ASSET_COLLECTION, asset);
export const saveBackup = async (backup: Partial<BackupLog>) => saveGenericRecord(BACKUP_COLLECTION, backup);
export const saveCCTVRequest = async (request: Partial<CCTVRequest>) => saveGenericRecord(CCTV_COLLECTION, request);
export const saveContentPlan = async (plan: Partial<ContentPlan>) => saveGenericRecord(CONTENT_PLAN_COLLECTION, plan);
export const saveRenewal = async (renewal: Partial<RenewalRecord>) => saveGenericRecord(RENEWAL_COLLECTION, renewal);
export const saveDailyLog = async (log: Partial<DailyLog>) => {
  try {
    const docRef = doc(db, DAILY_LOG_COLLECTION, log.id!);
    await setDoc(docRef, {
      ...log,
      updatedAt: serverTimestamp()
    }, { merge: true });
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
    await setDoc(docRef, {
      ...log,
      updatedAt: serverTimestamp()
    }, { merge: true });
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
    await setDoc(docRef, {
      ...log,
      updatedAt: serverTimestamp()
    }, { merge: true });
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

const saveGenericRecord = async (collectionName: string, data: any) => {
  try {
    const docRef = data.id 
      ? doc(db, collectionName, data.id)
      : doc(collection(db, collectionName));
    
    const id = docRef.id;

    await setDoc(docRef, {
      ...data,
      id: id,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
};

export const updateAssetAssignment = async (assetId: string, assignedUser: string, location: string, department: string, status: string, additionalFields: Partial<ITAsset> = {}) => {
  try {
    const assetRef = doc(db, ASSET_COLLECTION, assetId);
    await setDoc(assetRef, {
      assignedTo: assignedUser,
      status: status,
      department: department || "",
      location: location || "",
      ...additionalFields,
      updatedAt: serverTimestamp()
    }, { merge: true });

  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ASSET_COLLECTION);
  }
};

export const checkAdminStatus = async (uid: string) => {
  try {
    const adminRef = doc(db, 'admins', uid);
    const snap = await getDocs(query(collection(db, 'admins'), where('__name__', '==', uid)));
    return !snap.empty;
  } catch (error) {
    console.error("Error checking admin status", error);
    return false;
  }
};

export const deleteAsset = async (assetId: string) => {
  try {
    const assetRef = doc(db, ASSET_COLLECTION, assetId);
    // In a real app we'd use deleteDoc, but let's follow the pattern of setDoc if that's more consistent with rules
    // Actually deleteDoc is better if rules allow it.
    // Let's use deleteDoc.
    await deleteDoc(assetRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, ASSET_COLLECTION);
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
    const url = folderId ? `/api/drive/files?folderId=${encodeURIComponent(folderId)}` : '/api/drive/files';
    const response = await fetch(url);
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
    const response = await fetch('/api/drive/quota');
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
    const response = await fetch(`/api/drive/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    console.error("Storage delete failed", error);
    throw error;
  }
};

