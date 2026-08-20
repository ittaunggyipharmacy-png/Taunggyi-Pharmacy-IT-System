
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
  SUPER_ADMIN = "super_admin",
  IT_SUPERVISOR = "it_supervisor",
  ASSET_EDITOR = "asset_editor",
  DOCUMENT_MANAGER = "document_manager",
  CONTENT_MANAGER = "content_manager",
  STAFF_VIEWER = "staff_viewer",
  DISABLED = "disabled"
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

export interface AssetAssignmentHistory {
  id: string;
  assetId: string;
  action: 'Issue' | 'Transfer' | 'Return' | 'Repair' | 'Disposed';
  previousAssignee?: string;
  newAssignee: string;
  previousDepartment?: string;
  newDepartment: string;
  previousLocation?: string;
  newLocation: string;
  handoverCondition: 'Brand New' | 'Good' | 'Fair' | 'Needs Repair' | 'Damaged' | 'Retired';
  returnCondition?: 'Good' | 'Fair' | 'Needs Repair' | 'Damaged' | 'Retired';
  reason?: string;
  accessoriesReturned?: string[];
  issuedByUid: string;
  issuedByName: string;
  timestamp: string;
}

export interface AssetRepairRecord {
  id: string;
  assetId: string;
  reportedDate: string;
  issueDescription: string;
  vendorName: string;
  repairCost: number; // in MMK
  currency: string;
  status: 'Reported' | 'In Progress' | 'Completed' | 'Unrepairable';
  resolutionNotes?: string;
  downtimeHours?: number;
  evidenceUrl?: string;
  reportedBy: string;
  completedDate?: string;
}

export interface AssetDocument {
  id: string;
  assetId: string;
  name: string;
  type: 'Invoice' | 'Warranty Certificate' | 'Handover Form' | 'Asset Photo' | 'Maintenance Evidence' | 'Other';
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface AssetActivityEvent {
  id: string;
  assetId: string;
  timestamp: string;
  actorUid: string;
  actorName: string;
  action: string;
  details?: string;
  previousState?: any;
  newState?: any;
}

export interface AssetSpecifications {
  cpu?: string;
  ram?: string;
  storage?: string;
  os?: string;
  screenSize?: string;
  hostname?: string;
  macAddress?: string;
  imei1?: string;
  imei2?: string;
  simNumber?: string;
  phoneNumber?: string;
  printerType?: string;
  networkIp?: string;
  tonerModel?: string;
  meterCount?: number;
  rackLocation?: string;
  backupRef?: string;
  cctvLocation?: string;
  dvrReference?: string;
  channelsCount?: number;
  retentionDays?: number;
  parentAssetId?: string;
}

export interface ITAsset {
  id: string;
  asset_code?: string;
  category: "Computer" | "Printer" | "Network" | "Software" | "Mobile" | "Scanner" | "Keyboard" | "Mouse" | "Monitor" | "UPS" | "USB Hub" | "Fan" | "Peripherals" | "CCTV" | "Other";
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  location: string;
  assignedTo: string;
  status: "New" | "In Stock" | "Assigned" | "Active" | "Maintenance" | "Under Repair" | "Returned" | "Retired" | "Disposed" | "Lost";
  condition: "Brand New" | "Good" | "Fair" | "Needs Repair" | "Damaged" | "Retired";
  brand?: string;
  specs?: string;
  detailedSpecs?: AssetSpecifications;
  remarks?: string;
  remark2?: string;
  department?: string;
  uom?: string;
  purchasePrice?: number; // in MMK
  itemPrice?: number;
  currency?: string;
  purchaseRecordId?: string;
  invoiceNumber?: string;
  maintenanceDueDate?: string;
  addedBy?: string;
  supplier?: string;
  totalRepairCost?: number;
  assignmentHistory?: AssetAssignmentHistory[];
  repairRecords?: AssetRepairRecord[];
  documents?: AssetDocument[];
  activityTimeline?: AssetActivityEvent[];
  parentId?: string | null;
  assignedToAssetId?: string | null;
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
 orderIndex?: number;
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

export type DataState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; data: T }
  | { status: 'offline'; error: string }
  | { status: 'unauthorized'; error: string }
  | { status: 'retryable_failure'; error: string; retry: () => Promise<void> }
  | { status: 'configuration_failure'; error: string };

export interface BranchNote {
  id: string;
  name: string; // e.g. Branch Name
  location: string;
  phone: string;
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
  createdAt: any;
  updatedAt?: any;
  createdBy?: string;
  createdByUid: string;
  createdByEmail?: string;
  designatedEditors?: string[];
}

// ----------------------------------------------------
// Enterprise IT Access Management Types
// ----------------------------------------------------

export type DataSensitivity = 'Low' | 'Medium' | 'High' | 'Restricted';
export type AccessLevel = 'Read Only' | 'Standard User' | 'Power User' | 'Admin / Privileged' | 'Security Audit';
export type AccessStatus = 
  | 'Draft' 
  | 'Submitted' 
  | 'Pending Approval' 
  | 'Approved' 
  | 'Provisioning' 
  | 'Active' 
  | 'Expiring' 
  | 'Revoked' 
  | 'Expired' 
  | 'Rejected' 
  | 'Cancelled';

export type ResourceCategory = 
  | 'POS' 
  | 'Inventory' 
  | 'Finance / ERP' 
  | 'Email (Google Workspace)' 
  | 'Google Drive' 
  | 'CCTV Footage' 
  | 'Wi-Fi Enterprise' 
  | 'Shared Printer' 
  | 'Network Devices' 
  | 'Software License' 
  | 'Database' 
  | 'Custom';

export interface AccessApprovalStep {
  stepId: string;
  stepName: string;
  requiredRole: string;
  approverUid?: string;
  approverName?: string;
  approverEmail?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Bypassed';
  decisionDate?: string;
  comments?: string;
}

export interface AuditTimelineEvent {
  id: string;
  timestamp: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  beforeValue?: any;
  afterValue?: any;
  comments?: string;
  decision?: string;
}

export interface SecretReference {
  referenceId: string;
  vaultName: string; // e.g. "Bitwarden / 1Password Vault Reference"
  ownerUid: string;
  ownerName: string;
  rotationIntervalDays: number;
  lastRotatedDate?: string;
  nextRotationDate?: string;
  notes?: string;
}

export interface AccessRequest {
  id: string;
  requestNumber: string; // e.g. "REQ-2026-001"
  requesterUid: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  reportingManager: string;
  resourceCategory: ResourceCategory;
  resourceName: string;
  requestedAccessLevel: AccessLevel;
  businessReason: string;
  startDate: string;
  expiryDate?: string;
  isPermanent: boolean;
  dataSensitivity: DataSensitivity;
  status: AccessStatus;
  evidenceUrl?: string;
  secretRef?: SecretReference;
  approvals: AccessApprovalStep[];
  auditTimeline: AuditTimelineEvent[];
  provisionedByUid?: string;
  provisionedByName?: string;
  provisionedAt?: string;
  revokedByUid?: string;
  revokedByName?: string;
  revokedAt?: string;
  revocationReason?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface EmployeeLifecycleChecklist {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: 'Onboarding' | 'Transfer' | 'Offboarding';
  effectiveDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  targetDepartment?: string;
  items: {
    id: string;
    task: string;
    resource?: string;
    required: boolean;
    completed: boolean;
    completedBy?: string;
    completedAt?: string;
  }[];
  revokedAccessRequestIds?: string[];
  notes?: string;
  createdAt: any;
}

// ----------------------------------------------------
// Enterprise Procurement Management Types
// ----------------------------------------------------

export type PRStatus = 
  | 'Draft' 
  | 'Submitted' 
  | 'Manager Review' 
  | 'Finance Review' 
  | 'Approved' 
  | 'PO Issued' 
  | 'Ordered' 
  | 'Partially Received' 
  | 'Fully Received' 
  | 'Invoice Matched' 
  | 'Payment Pending' 
  | 'Paid' 
  | 'Closed' 
  | 'Returned for Revision' 
  | 'Rejected' 
  | 'Cancelled' 
  | 'Supplier Return';

export interface PRLineItem {
  id: string;
  item: string;
  category: string; // Hardware, Software, Network, Consumable, Peripheral, Service
  description: string;
  quantity: number;
  unit: string; // Pcs, Sets, Boxes, Meters, Licenses
  unitPrice: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  shippingShare: number;
  currency: string;
  warrantyMonths: number;
  lineTotal: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  targetCollection: string;
  targetDocId: string;
  details?: string;
  ipAddress?: string;
  previousState?: any;
  newState?: any;
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string; // e.g. "PR-2026-001"
  requesterUid: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  costCenter: string;
  projectCode?: string;
  businessJustification: string;
  preferredSupplier: string;
  deliveryLocation?: string;
  requiredDate: string;
  attachments?: string[];
  lineItems: PRLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  currency: string;
  status: PRStatus;
  approvalHistory: AuditTimelineEvent[];
  budgetReserved?: boolean;
  poId?: string;
  poNumber?: string;
  rejectionReason?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  categories: string[];
  vendorScore: number; // 1 to 5
  leadTimeDays: number;
  averageLeadTimeDays?: number;
  warrantyTerms?: string;
  paymentTerms?: string;
  historicalQuotes?: {
    date: string;
    item: string;
    unitPrice: number;
    currency: string;
  }[];
  active: boolean;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. "PO-2026-001"
  prId: string;
  prNumber: string;
  department: string;
  supplierId?: string;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  currency: string;
  lineItems: PRLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  status: 'Issued' | 'Acknowledged' | 'In Transit' | 'Partially Received' | 'Fully Received' | 'Cancelled';
  approvalHistory: AuditTimelineEvent[];
  supplierCommunicationLog: {
    date: string;
    channel: string;
    message: string;
    author: string;
  }[];
  pdfUrl?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string; // e.g. "GRN-2026-001"
  poId: string;
  poNumber: string;
  prId: string;
  receivedDate: string;
  receivedByUid: string;
  receivedByName: string;
  items: {
    poLineItemId: string;
    item: string;
    category?: string;
    orderedQty: number;
    previousReceivedQty: number;
    newlyReceivedQty: number;
    remainingQty: number;
    serialNumbers: string[];
    qualityCheckPassed: boolean;
    discrepancyReason?: string;
  }[];
  isFinalReceipt: boolean;
  assetsCreated?: boolean;
  remarks?: string;
  createdAt: any;
}

export interface DepartmentBudget {
  id: string;
  department: string;
  fiscalYear: string;
  totalBudget: number; // in MMK
  reservedBudget: number; // in MMK
  spentBudget: number; // in MMK
  remainingBudget: number; // in MMK
  currency?: string;
  warningThresholdPercent?: number; // default 80%
  notes?: string;
}

export interface InvoiceMatchRecord {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  currency: string;
  poId: string;
  poNumber: string;
  grnIds: string[];
  prId: string;
  department: string;
  lineItemsMatch: boolean;
  quantityMatch: boolean;
  amountMatch: boolean;
  tolerancePercent: number; // e.g. 0% or 1%
  matchStatus: 'Matched' | 'Discrepancy' | 'Pending';
  discrepancyDetails?: string;
  paymentApproved: boolean;
  paymentApprovedBy?: string;
  paymentApprovedAt?: string;
  paymentReference?: string;
  createdAt: any;
}

