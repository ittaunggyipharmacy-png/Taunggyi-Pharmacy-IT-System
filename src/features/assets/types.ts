export interface ITAsset {
  id: string;
  asset_code?: string;
  category: "Computer" | "Printer" | "Network" | "Software" | "Mobile" | "Scanner" | "Keyboard" | "Mouse" | "Monitor" | "UPS" | "USB Hub" | "Fan" | "Peripherals" | "Other";
  model: string;
  serialNumber: string;
  purchaseDate: string;
  location: string;
  assignedTo: string;
  status: "Active" | "Maintenance" | "Under Repair" | "Retired" | "New" | "In Stock" | "Disposed" | "Pending / New Arrival" | "Standalone / Spare";
  brand?: string;
  specs?: string;
  remarks?: string;
  remark2?: string;
  department?: string;
  uom?: string;
  purchasePrice?: string;
  itemPrice?: number;
  parentId?: string | null;
  assignedToAssetId?: string | null; // Keep for legacy migration if needed
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
}
