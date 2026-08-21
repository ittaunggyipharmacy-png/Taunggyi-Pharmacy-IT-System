import { SystemSettings, UserRole } from '../types';

/**
 * Shared settings for the Taunggyi Pharmacy IT Management System.
 *
 * Keep business-wide values here rather than duplicating them across screens,
 * data services, and server routes. Firebase security rules must still be
 * updated separately because they cannot import TypeScript modules.
 */
export const PRIMARY_ADMINISTRATOR_EMAIL = 'it.taunggyipharmacy@gmail.com';

/**
 * This exact phrase is required before permanently deleting application data.
 * The same value is used by the settings screen and the server endpoint.
 */
export const DATABASE_WIPE_CONFIRMATION = 'DELETE ALL DATA CONFIRMED';

/** Default values used before an administrator saves system settings. */
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  departments: [
    'IT',
    'Merchandising',
    'Digital Marketing',
    'Accounts',
    'Management',
    'Sales',
    'Warehouse',
  ],
  locations: [
    'Central Storage',
    'Branch 1',
    'Branch 2',
    'Branch 3',
    'HQ Server Room',
    'Warehouse',
  ],
  itContacts: [
    {
      name: 'IT Support Team',
      role: 'Helpdesk',
      phone: '09-940-931-313',
    },
  ],
  branchNotes: [],
};

/** Returns true only for the protected primary administrator email address. */
export function isPrimaryAdministrator(email?: string | null): boolean {
  return email?.trim().toLowerCase() === PRIMARY_ADMINISTRATOR_EMAIL;
}

/**
 * Identifies roles that can administer the system. This is a UI convenience
 * helper; server endpoints and Firebase rules remain the enforcement layer.
 */
export function hasAdministratorAccess(
  role?: UserRole | string | null,
  email?: string | null,
): boolean {
  return (
    isPrimaryAdministrator(email) ||
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.IT_SUPERVISOR
  );
}

/** Identifies the top-level administrator used for super-admin-only actions. */
export function hasSuperAdministratorAccess(
  role?: UserRole | string | null,
  email?: string | null,
): boolean {
  return isPrimaryAdministrator(email) || role === UserRole.SUPER_ADMIN;
}
