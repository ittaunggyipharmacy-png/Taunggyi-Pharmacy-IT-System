import { 
  ITAsset, 
  PurchaseRecord, 
  ITTicket, 
  MeetingMinute, 
  MeetingActionItem, 
  RenewalRecord, 
  DailyLog, 
  WeeklyLog, 
  MonthlyLog, 
  SystemUser,
  Priority,
  Status,
  UserRole
} from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const ALLOWED_ASSET_STATUSES = [
  'Active',
  'Maintenance',
  'Under Repair',
  'Retired',
  'New',
  'In Stock',
  'Disposed',
  'Pending / New Arrival',
  'Standalone / Spare'
] as const;

export const ALLOWED_ASSET_CATEGORIES = [
  'Computer',
  'Printer',
  'Network',
  'Software',
  'Mobile',
  'Scanner',
  'Keyboard',
  'Mouse',
  'Monitor',
  'UPS',
  'USB Hub',
  'Fan',
  'Peripherals',
  'Other'
] as const;

export const ALLOWED_TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ALLOWED_TICKET_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'] as const;
export const ALLOWED_ACTION_ITEM_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'] as const;
export const ALLOWED_PURCHASE_STATUSES = ['Ordered', 'Transit', 'Received'] as const;
export const ALLOWED_RENEWAL_CYCLES = ['Monthly', 'Quarterly', 'Yearly'] as const;
export const ALLOWED_RENEWAL_STATUSES = ['Active', 'Expiring Soon', 'Expired'] as const;

export function validateAsset(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Asset payload must be a non-null object'] };
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
    errors.push('Asset category is required');
  } else if (!ALLOWED_ASSET_CATEGORIES.includes(data.category as any)) {
    // Allow case-insensitive matching fallback
    const matched = ALLOWED_ASSET_CATEGORIES.find(c => c.toLowerCase() === data.category.toLowerCase());
    if (!matched) {
      errors.push(`Invalid asset category: ${data.category}`);
    }
  }

  if (!data.model || typeof data.model !== 'string' || data.model.trim().length === 0) {
    errors.push('Asset model is required');
  } else if (data.model.length > 200) {
    errors.push('Asset model cannot exceed 200 characters');
  }

  if (typeof data.serialNumber !== 'string') {
    errors.push('Asset serial number must be a string');
  }

  if (data.status && !ALLOWED_ASSET_STATUSES.includes(data.status)) {
    errors.push(`Invalid asset status: ${data.status}`);
  }

  if (data.purchasePrice !== undefined && data.purchasePrice !== null) {
    const num = Number(data.purchasePrice);
    if (isNaN(num) || num < 0) {
      errors.push('Purchase price must be a non-negative number');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validatePurchaseRecord(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Purchase record must be a non-null object'] };
  }

  if (!data.item || typeof data.item !== 'string' || data.item.trim().length === 0) {
    errors.push('Item name is required');
  } else if (data.item.length > 200) {
    errors.push('Item name cannot exceed 200 characters');
  }

  if (!data.category || typeof data.category !== 'string') {
    errors.push('Category is required');
  }

  if (data.price === undefined || data.price === null || isNaN(Number(data.price)) || Number(data.price) < 0) {
    errors.push('Price must be a non-negative number');
  }

  if (data.quantity === undefined || data.quantity === null || isNaN(Number(data.quantity)) || Number(data.quantity) <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (!data.date || typeof data.date !== 'string') {
    errors.push('Purchase date is required');
  }

  if (!data.supplier || typeof data.supplier !== 'string') {
    errors.push('Supplier is required');
  }

  if (data.status && !ALLOWED_PURCHASE_STATUSES.includes(data.status)) {
    errors.push(`Invalid purchase status: ${data.status}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateITTicket(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Ticket must be a non-null object'] };
  }

  if (!data.problemType || typeof data.problemType !== 'string' || data.problemType.trim().length === 0) {
    errors.push('Problem type is required');
  }

  if (data.priority && !ALLOWED_TICKET_PRIORITIES.includes(data.priority)) {
    errors.push(`Invalid ticket priority: ${data.priority}`);
  }

  if (!data.requestTime || typeof data.requestTime !== 'string') {
    errors.push('Request time is required');
  }

  if (!data.requesterName || typeof data.requesterName !== 'string') {
    errors.push('Requester name is required');
  }

  if (data.status && !ALLOWED_TICKET_STATUSES.includes(data.status)) {
    errors.push(`Invalid ticket status: ${data.status}`);
  }

  if (data.actions && !Array.isArray(data.actions)) {
    errors.push('Ticket actions must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateMeetingActionItem(item: any): ValidationResult {
  const errors: string[] = [];
  if (!item || typeof item !== 'object') {
    return { valid: false, errors: ['Action item must be a non-null object'] };
  }

  if (!item.task || typeof item.task !== 'string' || item.task.trim().length === 0) {
    errors.push('Action item task description is required');
  }

  if (!item.assignedTo || typeof item.assignedTo !== 'string' || item.assignedTo.trim().length === 0) {
    errors.push('Action item assignedTo is required');
  }

  if (item.status && !ALLOWED_ACTION_ITEM_STATUSES.includes(item.status)) {
    errors.push(`Invalid action item status: ${item.status}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateMeetingMinute(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Meeting minute must be a non-null object'] };
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Meeting title is required');
  } else if (data.title.length > 200) {
    errors.push('Meeting title cannot exceed 200 characters');
  }

  if (!data.date || typeof data.date !== 'string') {
    errors.push('Meeting date is required');
  }

  if (typeof data.content !== 'string') {
    errors.push('Meeting content is required and must be a string');
  }

  if (data.actionItems) {
    if (!Array.isArray(data.actionItems)) {
      errors.push('Action items must be an array');
    } else {
      data.actionItems.forEach((ai: any, idx: number) => {
        const aiRes = validateMeetingActionItem(ai);
        if (!aiRes.valid) {
          errors.push(`Action item #${idx + 1}: ${aiRes.errors.join(', ')}`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateRenewalRecord(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Renewal record must be a non-null object'] };
  }

  if (!data.serviceName || typeof data.serviceName !== 'string' || data.serviceName.trim().length === 0) {
    errors.push('Service name is required');
  }

  if (!data.shopName || typeof data.shopName !== 'string' || data.shopName.trim().length === 0) {
    errors.push('Shop/Branch name is required');
  }

  if (!data.expireDate || typeof data.expireDate !== 'string') {
    errors.push('Expiration date is required');
  }

  if (data.price !== undefined && data.price !== null && (isNaN(Number(data.price)) || Number(data.price) < 0)) {
    errors.push('Price must be a non-negative number');
  }

  if (data.billingCycle && !ALLOWED_RENEWAL_CYCLES.includes(data.billingCycle)) {
    errors.push(`Invalid billing cycle: ${data.billingCycle}`);
  }

  if (data.status && !ALLOWED_RENEWAL_STATUSES.includes(data.status)) {
    errors.push(`Invalid renewal status: ${data.status}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDailyLog(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Daily log must be a non-null object'] };
  }

  if (!data.id || typeof data.id !== 'string') {
    errors.push('Daily log ID is required (format: YYYY-MM-DD_uid)');
  }

  if (!data.date || typeof data.date !== 'string') {
    errors.push('Daily log date is required');
  }

  if (!data.userId || typeof data.userId !== 'string') {
    errors.push('Daily log userId is required');
  }

  if (!data.tasks || typeof data.tasks !== 'object') {
    errors.push('Daily log tasks map is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateSystemUser(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['System user must be a non-null object'] };
  }

  if (!data.uid || typeof data.uid !== 'string') {
    errors.push('User UID is required');
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('User email is required');
  }

  const validRoles = Object.values(UserRole);
  if (data.role && !validRoles.includes(data.role)) {
    errors.push(`Invalid user role: ${data.role}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const validateTicket = validateITTicket;
export const validatePurchase = validatePurchaseRecord;
export const validateMeeting = validateMeetingMinute;

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>?/gm, '').trim();
}
