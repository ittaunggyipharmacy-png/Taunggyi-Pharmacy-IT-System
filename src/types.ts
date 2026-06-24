
export enum Priority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical",
}

export enum Status {
  PENDING = "Pending",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
}

export interface ActionEntry {
  timestamp: string;
  action: string;
  performer: string;
}

export interface ITTicket {
  id: string;
  problemType: string;
  priority: Priority;
  requestTime: string;
  requesterName: string;
  requesterBranch?: string;
  department?: string;
  assignedTo?: string;
  assignedToName?: string;
  responseTime?: number; // in minutes
  actions: ActionEntry[];
  status: Status;
  completedAt?: string;
  description?: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  department: string;
  details?: string;
}

export interface TaskEvidence {
  id: string;
  taskId: string;
  logId: string;
  imageUrl: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface SkillEntry {
  category: string; // e.g., Hardware, Networking, Graphic Design, Video Editing
  level: number; // 1 to 5
}

export enum UserRole {
  IT_SUPERVISOR = "IT Supervisor",
  IT_SUPERVISOR_CAPS = "IT SUPERVISOR",
  MERCHANDISING_SUPERVISOR = "Merchandising Supervisor",
  IT_DIGITAL_MARKETING = "IT Digital Marketing",
  ADMIN = "System Admin",
  ADMIN_CAPS = "SYSTEM ADMIN",
  STAFF = "Staff"
}

export interface SystemUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: any;
  lastLogin: any;
  isAdmin?: boolean;
}

export interface EmployeeProfile {
  id: string; // userId
  name: string;
  department: "IT" | "Merchandising" | "Digital Marketing" | "Management";
  skills: SkillEntry[];
}

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

export interface ContentPlan {
  id: string;
  platform: "Facebook" | "Viber" | "TikTok";
  productName: string;
  price: string;
  promotionPeriod: string;
  content: string;
  status: "Draft" | "Pending Approval" | "Approved" | "Posted";
  reviewer?: string;
}

export interface CCTVRequest {
  id: string;
  requester: string;
  dateOfFootage: string;
  reason: string;
  approvalStatus: "Pending" | "Approved" | "Denied";
  approvedBy?: string;
}

export interface RenewalRecord {
  id: string;
  serviceName: string;
  shopName: string;
  expireDate: string;
  price: number;
  currency: string;
  billingCycle: "Monthly" | "Quarterly" | "Yearly";
  status: "Active" | "Expiring Soon" | "Expired";
  provider?: string;
  renewalMethod?: string;
  contactPerson?: string;
  contactPhone?: string;
  websiteLink?: string;
  requiredDocuments?: string[];
  wifiId?: string;
  mb?: string;
  ispName?: string;
  phoneNumber?: string;
  credentials?: string;
  location?: string;
  twelveMonthPrice?: number;
  remarks?: string;
}

export interface PurchaseRecord {
  id: string;
  item: string;
  category: string;
  price: number;
  currency: string;
  quantity: number;
  date: string;
  supplier: string;
  supplierContact?: string;
  status: "Ordered" | "Transit" | "Received";
  remarks?: string;
  serialNumber?: string;
  syncToInventory?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
  mimeType: string;
  size?: string;
  createdAt: string;
  thumbnailLink?: string;
}

export interface KPIModule {
  id: string;
  label: string;
  tasks: KPITask[];
}

export interface KPITask {
  id: string;
  text: string;
  completed: boolean;
}

export interface KPI {
  id: string;
  role: string;
  title: string;
  scoreType: "Higher is Better";
  unit: string;
  weight: number; // as percentage, e.g., 25.00
  target: number;
  actual: number;
}

export interface Skill {
  id: number;
  name: string;
  myanmarName: string;
}

export interface EmployeeSkillLevel {
  skillId: number;
  level: 1 | 2 | 3 | 4 | 0; // 0 for no level yet
}

export interface Employee {
  id: string;
  name: string;
  skills: EmployeeSkillLevel[];
}

export interface DailyLog {
  id: string; // yyyy-mm-dd_userId
  date: string; // yyyy-mm-dd
  userId: string;
  tasks: Record<string, any>; // taskId -> completed
  customTasks?: { id: string; text: string; category: string }[];
  updatedAt: any;
}

export interface MonthlyLog {
  id: string; // yyyy-mm_userId
  month: string; // yyyy-mm
  userId: string;
  tasks: Record<string, boolean | number>; // taskId -> completed or count
  customTasks?: { id: string; text: string; category: string }[];
  updatedAt: any;
}

export interface WeeklyLog {
  id: string; // yyyy-Www_userId (e.g., 2026-W19_userId)
  week: string; // yyyy-Www
  userId: string;
  tasks: Record<string, boolean | number>; // taskId -> completed or count
  customTasks?: { id: string; text: string; category: string }[];
  updatedAt: any;
}

export interface BranchNote {
  id: string;
  name: string; // e.g. Branch Name
  location: string;
  phone: string;
}

export interface PasswordNote {
  id: string;
  label: string; // e.g. "Gmail", "Router PPPoE"
  account: string;
  password: string;
}

export interface PasswordVaultEntry {
  id: string;
  label: string;
  account: string;
  password: string;
}

export interface SystemSettings {
  departments: string[];
  locations: string[];
  itContacts: { name: string; role: string; phone: string }[];
  branchNotes?: BranchNote[];
  menuPermissions?: {
    [role: string]: string[];
  };
}

export interface RolePermission {
  role: string;
  allowed_menus: Record<string, boolean>;
}

export interface MeetingActionItem {
  id: string;
  task: string;
  assignedTo: string;
  department?: string;
  dueDate: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  remarks?: string;
  completedAt?: string;
}

export interface MeetingMinute {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  tags?: string[];
  attendees: string[];
  content: string;
  actionItems: MeetingActionItem[];
  createdAt: string;
  createdBy: string;
  createdByEmail?: string;
}
