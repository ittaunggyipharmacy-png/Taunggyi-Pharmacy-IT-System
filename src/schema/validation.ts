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
import {
  hasSuperAdministratorAccess,
  isPrimaryAdministrator,
} from '../config/application';

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

  if (data.department !== undefined && data.department !== null) {
    if (typeof data.department !== 'string') {
      errors.push('Asset department must be a string');
    } else if (data.department.length > 100) {
      errors.push('Asset department cannot exceed 100 characters');
    }
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

// ----------------------------------------------------
// Access Request Validators & Rules
// ----------------------------------------------------

export const ALLOWED_SENSITIVITIES = ['Low', 'Medium', 'High', 'Restricted'] as const;
export const ALLOWED_ACCESS_LEVELS = ['Read Only', 'Standard User', 'Power User', 'Admin / Privileged', 'Security Audit'] as const;
export const ALLOWED_ACCESS_STATUSES = [
  'Draft', 'Submitted', 'Pending Approval', 'Approved', 'Provisioning', 'Active', 'Expiring', 'Revoked', 'Expired', 'Rejected', 'Cancelled'
] as const;

export function validateAccessRequest(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Access request must be a non-null object'] };
  }

  if (!data.requesterUid || typeof data.requesterUid !== 'string') {
    errors.push('Requester UID is required');
  }
  if (!data.requesterName || typeof data.requesterName !== 'string') {
    errors.push('Requester name is required');
  }
  if (!data.department || typeof data.department !== 'string') {
    errors.push('Department is required');
  }
  if (!data.resourceCategory || typeof data.resourceCategory !== 'string') {
    errors.push('Resource category is required');
  }
  if (!data.resourceName || typeof data.resourceName !== 'string') {
    errors.push('Resource name/identifier is required');
  }
  if (!data.requestedAccessLevel || !ALLOWED_ACCESS_LEVELS.includes(data.requestedAccessLevel)) {
    errors.push(`Invalid or missing access level: ${data.requestedAccessLevel}`);
  }
  if (!data.businessReason || typeof data.businessReason !== 'string' || data.businessReason.trim().length < 5) {
    errors.push('A valid business justification of at least 5 characters is required');
  }
  if (!data.startDate || typeof data.startDate !== 'string') {
    errors.push('Start date is required');
  }
  if (!data.dataSensitivity || !ALLOWED_SENSITIVITIES.includes(data.dataSensitivity)) {
    errors.push(`Invalid or missing data sensitivity: ${data.dataSensitivity}`);
  }
  if (data.status && !ALLOWED_ACCESS_STATUSES.includes(data.status)) {
    errors.push(`Invalid access status: ${data.status}`);
  }

  // Security check: NEVER allow storing plaintext passwords in secretRef or raw fields
  if (data.password || data.secret || data.rawPassword) {
    errors.push('Plaintext passwords and raw secrets are strictly forbidden. Use secretRef with vault reference ID only.');
  }
  if (data.secretRef && (data.secretRef.password || data.secretRef.secret)) {
    errors.push('Secret references must contain vault pointer IDs only, never raw credentials.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateAccessApproval(
  request: any,
  approverUid: string,
  approverRole: string,
  approverEmail?: string
): { allowed: boolean; reason?: string } {
  // Anti-self-approval rule
  if (request.requesterUid === approverUid && !isPrimaryAdministrator(approverEmail)) {
    return { allowed: false, reason: 'Staff users are strictly prohibited from approving their own access requests.' };
  }

  const isSuper = hasSuperAdministratorAccess(approverRole, approverEmail);
  const isSupervisor = isSuper || approverRole === 'it_supervisor';

  // Restricted or High sensitivity requires Supervisor or Super Admin
  if (request.dataSensitivity === 'Restricted' && !isSuper) {
    return { allowed: false, reason: 'Restricted sensitivity access requests require Super Admin approval.' };
  }

  if (request.dataSensitivity === 'High' && !isSupervisor) {
    return { allowed: false, reason: 'High sensitivity access requests require IT Supervisor approval.' };
  }

  return { allowed: true };
}

// ----------------------------------------------------
// Procurement & Purchase Requisition Calculation & Validation
// ----------------------------------------------------

export const ALLOWED_PR_STATUSES = [
  'Draft', 'Submitted', 'Manager Review', 'Finance Review', 'Approved', 'PO Issued', 'Ordered',
  'Partially Received', 'Fully Received', 'Invoice Matched', 'Payment Pending', 'Paid', 'Closed',
  'Returned for Revision', 'Rejected', 'Cancelled', 'Supplier Return'
] as const;

export interface RecomputedTotals {
  lineItems: any[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
}

export function calculatePRTotals(lineItems: any[]): RecomputedTotals {
  if (!Array.isArray(lineItems)) {
    return { lineItems: [], subtotal: 0, discountTotal: 0, taxTotal: 0, shippingTotal: 0, grandTotal: 0 };
  }

  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let shippingTotal = 0;

  const processedItems = lineItems.map((item, idx) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const discount = Math.max(0, Number(item.discount) || 0);
    const taxPercent = Math.max(0, Number(item.taxPercent) || 0);
    const shippingShare = Math.max(0, Number(item.shippingShare) || 0);

    const baseAmount = qty * unitPrice;
    const discountedBase = Math.max(0, baseAmount - discount);
    const taxAmount = (discountedBase * taxPercent) / 100;
    const lineTotal = Math.round((discountedBase + taxAmount + shippingShare) * 100) / 100;

    subtotal += baseAmount;
    discountTotal += discount;
    taxTotal += taxAmount;
    shippingTotal += shippingShare;

    return {
      ...item,
      id: item.id || `line-${idx + 1}`,
      quantity: qty,
      unitPrice: unitPrice,
      discount: discount,
      taxPercent: taxPercent,
      taxAmount: Math.round(taxAmount * 100) / 100,
      shippingShare: shippingShare,
      lineTotal: lineTotal
    };
  });

  const grandTotal = Math.round((subtotal - discountTotal + taxTotal + shippingTotal) * 100) / 100;

  return {
    lineItems: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    shippingTotal: Math.round(shippingTotal * 100) / 100,
    grandTotal: Math.max(0, grandTotal)
  };
}

export function validatePurchaseRequisition(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Purchase requisition must be a non-null object'] };
  }

  if (!data.requesterUid || typeof data.requesterUid !== 'string') {
    errors.push('Requester UID is required');
  }
  if (!data.department || typeof data.department !== 'string') {
    errors.push('Department is required');
  }
  if (!data.businessJustification || typeof data.businessJustification !== 'string' || data.businessJustification.trim().length < 5) {
    errors.push('A valid business justification is required');
  }
  if (!data.requiredDate || typeof data.requiredDate !== 'string') {
    errors.push('Required delivery date is required');
  }
  if (!Array.isArray(data.lineItems) || data.lineItems.length === 0) {
    errors.push('At least one line item is required for a purchase requisition');
  } else {
    data.lineItems.forEach((item: any, i: number) => {
      if (!item.item || typeof item.item !== 'string' || item.item.trim() === '') {
        errors.push(`Line item #${i + 1} must specify an item name`);
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        errors.push(`Line item #${i + 1} must have a quantity greater than 0`);
      }
      if (item.unitPrice === undefined || Number(item.unitPrice) < 0) {
        errors.push(`Line item #${i + 1} must have a valid unit price`);
      }
    });
  }

  if (data.status && !ALLOWED_PR_STATUSES.includes(data.status)) {
    errors.push(`Invalid purchase requisition status: ${data.status}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const THRESHOLD_DEPT_MANAGER_MMK = 500000;     // <= 500,000 MMK
export const THRESHOLD_FINANCE_MANAGER_MMK = 5000000; // <= 5,000,000 MMK

export function validatePRApproval(
  pr: any,
  approverUid: string,
  approverRole: string,
  budget?: { remainingBudget: number }
): { allowed: boolean; reason?: string; nextStatus?: 'Finance Review' | 'Approved' } {
  // A requester can never approve their own requisition, including Super Admins.
  if (pr.requesterUid === approverUid) {
    return { allowed: false, reason: 'Requesters are strictly prohibited from approving their own purchase requisitions.' };
  }

  const grandTotal = Number(pr.grandTotal);
  if (!Number.isFinite(grandTotal) || grandTotal < 0) {
    return { allowed: false, reason: 'Purchase requisition has an invalid grand total.' };
  }

  const isSuper = approverRole === 'super_admin';
  const isFinance = approverRole === 'finance_manager';
  const isSupervisor = approverRole === 'it_supervisor';
  const canPerformFirstReview = isSuper || isFinance || isSupervisor;

  if (!canPerformFirstReview) {
    return { allowed: false, reason: 'Only Finance Manager, IT Supervisor, or Super Admin can approve purchase requisitions.' };
  }

  // A departmental/IT review begins from Submitted. Finance Review is a distinct
  // second stage for requisitions above the departmental approval threshold.
  if (pr.status === 'Submitted') {
    if (grandTotal > THRESHOLD_FINANCE_MANAGER_MMK && !isSuper) {
      return {
        allowed: false,
        reason: `Requisitions over 5,000,000 MMK require Super Admin approval (Current: ${grandTotal.toLocaleString()} MMK).`
      };
    }

    if (budget && Number(budget.remainingBudget) < grandTotal && !isSuper) {
      return {
        allowed: false,
        reason: `Insufficient department budget. Remaining budget (${Number(budget.remainingBudget).toLocaleString()} MMK) is less than requisition total (${grandTotal.toLocaleString()} MMK). Super Admin override required.`
      };
    }

    if (grandTotal > THRESHOLD_DEPT_MANAGER_MMK && !isSuper) {
      return { allowed: true, nextStatus: 'Finance Review' };
    }

    return { allowed: true, nextStatus: 'Approved' };
  }

  if (pr.status === 'Finance Review') {
    if (!isSuper && !isFinance) {
      return { allowed: false, reason: 'Finance Review requires Finance Manager or Super Admin approval.' };
    }

    if (budget && Number(budget.remainingBudget) < grandTotal && !isSuper) {
      return {
        allowed: false,
        reason: `Insufficient department budget. Remaining budget (${Number(budget.remainingBudget).toLocaleString()} MMK) is less than requisition total (${grandTotal.toLocaleString()} MMK). Super Admin override required.`
      };
    }

    return { allowed: true, nextStatus: 'Approved' };
  }

  return { allowed: false, reason: `Cannot approve a purchase requisition with status '${pr.status}'.` };
}

// ----------------------------------------------------
// Goods Receipt Note & 3-Way Match Validation
// ----------------------------------------------------

export function validateGoodsReceipt(po: any, receiptItems: any[]): ValidationResult {
  const errors: string[] = [];
  if (!po || !Array.isArray(po.lineItems)) {
    return { valid: false, errors: ['Invalid purchase order reference'] };
  }
  if (!Array.isArray(receiptItems) || receiptItems.length === 0) {
    return { valid: false, errors: ['At least one receipt line item is required'] };
  }

  receiptItems.forEach((rcpt, idx) => {
    const poLine = po.lineItems.find((l: any) => l.id === rcpt.poLineItemId || l.item === rcpt.item);
    if (!poLine) {
      errors.push(`Receipt item #${idx + 1} (${rcpt.item}) does not match any line item in PO ${po.poNumber}`);
      return;
    }

    const orderedQty = Number(poLine.quantity) || 0;
    const prevReceived = Number(rcpt.previousReceivedQty) || 0;
    const newlyReceived = Number(rcpt.newlyReceivedQty) || 0;

    if (newlyReceived <= 0) {
      errors.push(`Receipt item #${idx + 1} (${rcpt.item}) newly received quantity must be greater than 0`);
    }

    if (prevReceived + newlyReceived > orderedQty) {
      errors.push(
        `Over-receipt violation for item "${rcpt.item}": Total received (${prevReceived + newlyReceived}) cannot exceed PO ordered quantity (${orderedQty})`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export function performThreeWayMatch(
  pr: any,
  po: any,
  grns: any[],
  invoice: { invoiceNumber: string; invoiceAmount: number; currency: string; tolerancePercent?: number }
): {
  matched: boolean;
  lineItemsMatch: boolean;
  quantityMatch: boolean;
  amountMatch: boolean;
  discrepancyDetails: string;
} {
  const tolerance = invoice.tolerancePercent || 0; // Default exact match
  const discrepancies: string[] = [];

  // Check PO vs Invoice Grand Total
  const poAmount = Number(po.grandTotal) || 0;
  const invAmount = Number(invoice.invoiceAmount) || 0;
  const maxAllowedAmount = poAmount * (1 + tolerance / 100);
  const minAllowedAmount = poAmount * (1 - tolerance / 100);

  const amountMatch = invAmount >= minAllowedAmount && invAmount <= maxAllowedAmount;
  if (!amountMatch) {
    discrepancies.push(`Invoice amount (${invAmount.toLocaleString()} ${invoice.currency}) differs from PO authorized amount (${poAmount.toLocaleString()} ${po.currency}) beyond allowed tolerance of ${tolerance}%.`);
  }

  // Check GRN received quantities vs PO ordered quantities
  let allQtyReceived = true;
  if (Array.isArray(po.lineItems)) {
    po.lineItems.forEach((poItem: any) => {
      let totalReceivedForLine = 0;
      if (Array.isArray(grns)) {
        grns.forEach(grn => {
          if (Array.isArray(grn.items)) {
            grn.items.forEach((gi: any) => {
              if (gi.poLineItemId === poItem.id || gi.item === poItem.item) {
                totalReceivedForLine += Number(gi.newlyReceivedQty) || 0;
              }
            });
          }
        });
      }
      if (totalReceivedForLine < (Number(poItem.quantity) || 0)) {
        allQtyReceived = false;
        discrepancies.push(`Item "${poItem.item}" received quantity (${totalReceivedForLine}) is less than PO ordered quantity (${poItem.quantity}).`);
      }
    });
  }

  const lineItemsMatch = discrepancies.length === 0;
  const matched = amountMatch && allQtyReceived;

  return {
    matched,
    lineItemsMatch,
    quantityMatch: allQtyReceived,
    amountMatch,
    discrepancyDetails: discrepancies.join('; ')
  };
}

export function validateSupplier(data: any): ValidationResult {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Supplier must be a non-null object'] };
  }
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Supplier company name is required');
  }
  if (!data.contactPerson || typeof data.contactPerson !== 'string') {
    errors.push('Contact person name is required');
  }
  if (!data.phone && !data.email) {
    errors.push('Either contact phone or email is required');
  }
  if (data.vendorScore !== undefined && (Number(data.vendorScore) < 1 || Number(data.vendorScore) > 5)) {
    errors.push('Vendor score must be between 1 and 5');
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

