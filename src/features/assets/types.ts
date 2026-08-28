export type AssetAssignmentStatus = "Active" | "Returned" | "Cancelled";

export interface AssetPerson {
  id: string;
  employeeId?: string | null;
  fullName: string;
  position?: string | null;
  department?: string | null;
  branch?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  notes?: string | null;
  linkedUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  userId?: string | null;
  assetPersonId?: string | null;
  assignedDate: string;
  assignedBy?: string | null;
  returnDate?: string | null;
  returnReason?: string | null;
  status: AssetAssignmentStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetAssignedUser {
  uid: string;
  employeeId?: string | null;
  displayName?: string | null;
  email?: string | null;
  position?: string | null;
  role?: string | null;
  department?: string | null;
  branch?: string | null;
  photoURL?: string | null;
}

export interface ITAsset {
  displayOrder?: number;
  id: string;
  asset_code?: string;
  name?: string;
  branch?: string;
  category: "Computer" | "Printer" | "Network" | "Software" | "Mobile" | "Scanner" | "Keyboard" | "Mouse" | "Monitor" | "UPS" | "USB Hub" | "Fan" | "Peripherals" | "Other";
  model: string;
  serialNumber: string;
  purchaseDate: string;
  location: string;
  assignedTo: string;
  status: "Active" | "Maintenance" | "Under Repair" | "Retired" | "New" | "In Stock" | "Disposed" | "Pending / New Arrival" | "Standalone / Spare" | "Purged";
  brand?: string;
  specs?: string;
  remarks?: string;
  remark2?: string;
  department?: string;
  uom?: string;
  purchasePrice?: string;
  itemPrice?: number;
  parentId?: string | null;
  assignedToAssetId?: string | null;
  currency?: string;
  purchaseRecordId?: string;
  maintenanceDueDate?: string;
  addedBy?: string;
  supplier?: string;
  peripherals?: {
    keyboard?: string;
    mouse?: string;
    usb?: string;
    fan?: string;
  };
  isPurged?: boolean;
  purgedAt?: string;
  purgedBy?: string;
  purgeReason?: string;
  previousStatus?: string;
}
