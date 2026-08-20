const fs = require('fs');

const missingFunctions = `

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
    console.error("Save failed for " + collName, err);
    throw err;
  }
};

export const deleteGenericRecord = async (collName: string, id: string) => {
  try {
    await deleteDoc(doc(db, collName, id));
  } catch (err) {
    console.error("Delete failed for " + collName, err);
    throw err;
  }
};

export const saveActivity = (data: any) => saveGenericRecord("activities", data);
export const clearAllAssets = async () => {};
export const saveMeetingMinute = (data: any) => saveGenericRecord("meeting_minutes", data);
export const deleteMeetingMinute = (id: string) => deleteGenericRecord("meeting_minutes", id);
export const saveRenewal = (data: any) => saveGenericRecord("renewals", data);
export const deleteRenewal = (id: string) => deleteGenericRecord("renewals", id);
export const updateRenewalOrder = async (items: any[]) => {
  const batch = writeBatch(db);
  items.forEach(item => {
    batch.update(doc(db, "renewals", item.id), { orderIndex: item.orderIndex });
  });
  await batch.commit();
};
export const saveDailyLog = (data: any) => saveGenericRecord("daily_logs", data);
export const getDailyLog = async (id: string) => {
  const d = await getDoc(doc(db, "daily_logs", id));
  return d.exists() ? d.data() : null;
};
export const saveMonthlyLog = (data: any) => saveGenericRecord("monthly_logs", data);
export const getMonthlyLog = async (id: string) => {
  const d = await getDoc(doc(db, "monthly_logs", id));
  return d.exists() ? d.data() : null;
};
export const saveWeeklyLog = (data: any) => saveGenericRecord("weekly_logs", data);
export const getWeeklyLog = async (id: string) => {
  const d = await getDoc(doc(db, "weekly_logs", id));
  return d.exists() ? d.data() : null;
};
export const saveEmployeeProfile = (data: any) => saveGenericRecord("employees", data);
export const fetchStorageFiles = async () => [];
export const fetchStorageQuota = async () => ({ limit: 0, usage: 0 });
export const deleteStorageFile = async (id: string) => {};
export const importLegacyExcelData = async () => {};
export const importKeyboardsMigration = async () => {};
export const saveTaskEvidence = (data: any) => saveGenericRecord("task_evidence", data);
export const getTaskEvidence = async (id: string) => {
  const d = await getDoc(doc(db, "task_evidence", id));
  return d.exists() ? d.data() : null;
};

// Add missing deleteBackupLog just in case
export const deleteBackupLog = (id: string) => deleteGenericRecord("backup_logs", id);
export const deleteCCTVRequest = (id: string) => deleteGenericRecord("cctv_requests", id);
export const deleteContentPlan = (id: string) => deleteGenericRecord("content_plans", id);
export const deleteITTicket = (id: string) => deleteGenericRecord("it_tickets", id);
export const saveBackupLog = (data: any) => saveGenericRecord("backup_logs", data);
export const saveCCTVRequest = (data: any) => saveGenericRecord("cctv_requests", data);
export const saveContentPlan = (data: any) => saveGenericRecord("content_plans", data);
export const saveITTicket = (data: any) => saveGenericRecord("it_tickets", data);
export const savePurchaseRecord = (data: any) => saveGenericRecord("purchase_records", data);
export const deletePurchaseRecord = (id: string) => deleteGenericRecord("purchase_records", id);
export const getAllSystemUsers = async () => {
  const snap = await getDocs(collection(db, "app_users"));
  return snap.docs.map(d => d.data());
};
`;

let content = fs.readFileSync("src/services/firestoreService.ts", "utf8");
content += missingFunctions;
fs.writeFileSync("src/services/firestoreService.ts", content);
