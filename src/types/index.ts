// Shared Core System Types & Enums
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
  employeeId?: string | null;
  position?: string | null;
  department?: string | null;
  branch?: string | null;
}

// Re-export domain-specific types for convenience and backwards compatibility
export * from '../features/tickets/types';
export * from '../features/assets/types';
export * from '../features/purchases/types';
export * from '../features/renewals/types';
export * from '../features/marketing/types';
export * from '../features/file-manager/types';
export * from '../features/kpi/types';
export * from '../features/meetings/types';
export * from '../features/dashboard/types';
export * from '../features/security/types';
export * from '../features/skills/types';
export * from '../features/settings/types';
export * from '../features/user-management/types';
export * from '../features/id-layout/types';
