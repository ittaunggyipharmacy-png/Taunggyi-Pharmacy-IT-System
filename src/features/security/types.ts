export interface BackupSchedule {
  id: string;
  time: string; // HH:mm
  type: "External Drive" | "Cloud Storage";
  label: string;
}

export interface BackupLog {
  id: string;
  date: string;
  storageType: "External Drive" | "Cloud Storage";
  status: "Success" | "Failed";
  performer: string;
}

export interface CCTVRequest {
  id: string;
  requester: string;
  dateOfFootage: string;
  reason: string;
  approvalStatus: "Pending" | "Approved" | "Denied";
  approvedBy?: string;
}

export interface PasswordNote {
  id: string;
  label: string; // e.g. "Gmail", "Router PPPoE"
  account: string;
  password?: string;
  value?: string;
}

export interface PasswordVaultEntry {
  id: string;
  label: string;
  account: string;
  password?: string;
  value?: string;
  branch?: string;
  updated_at?: string;
}
