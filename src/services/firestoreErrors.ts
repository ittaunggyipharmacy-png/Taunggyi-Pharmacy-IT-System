import { auth } from './firebase';

export enum OperationType {
 CREATE = 'create',
 UPDATE = 'update',
 DELETE = 'delete',
 LIST = 'list',
 GET = 'get',
 WRITE = 'write',
}

export interface FirestoreErrorInfo {
 error: string;
 operationType: OperationType;
 path: string | null;
 authInfo: {
 userId?: string | null;
 email?: string | null;
 emailVerified?: boolean | null;
 isAnonymous?: boolean | null;
 tenantId?: string | null;
 providerInfo?: {
 providerId?: string | null;
 email?: string | null;
 }[];
 }
}

export class SecureFirestoreError extends Error {
 public code?: string;
 public operationType: OperationType;
 public path: string | null;
 public originalMessage: string;

 constructor(message: string, originalMessage: string, operationType: OperationType, path: string | null, code?: string) {
 super(message);
 this.name = 'SecureFirestoreError';
 this.originalMessage = originalMessage;
 this.operationType = operationType;
 this.path = path;
 this.code = code;

 // Inherit standard stack trace and proto chain
 if (Error.captureStackTrace) {
 Error.captureStackTrace(this, SecureFirestoreError);
 }
 Object.setPrototypeOf(this, SecureFirestoreError.prototype);
 }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
 const originalErrorMsg = error instanceof Error ? error.message : String(error);
 
 let errorCode: string | undefined;
 if (error && typeof error === 'object' && 'code' in error) {
 errorCode = (error as any).code;
 }

 const errInfo: FirestoreErrorInfo = {
 error: originalErrorMsg,
 authInfo: {
 userId: auth.currentUser?.uid,
 email: auth.currentUser?.email,
 emailVerified: auth.currentUser?.emailVerified,
 isAnonymous: auth.currentUser?.isAnonymous,
 tenantId: auth.currentUser?.tenantId,
 providerInfo: auth.currentUser?.providerData?.map(provider => ({
 providerId: provider.providerId,
 email: provider.email,
 })) || []
 },
 operationType,
 path
 };

 // 1. Split Logging: Detailed logs with full user contexts strictly restricted to development build
 const isDev = (import.meta as any).env?.DEV ?? true;
 if (isDev) {
 console.error('Firestore Error (Detailed/Dev Mode):', errInfo);
 } else {
 // Redacted/Sanitized safe logging in production browser console (no UID, email, provider details)
 const sanitizedInfo = {
 error: originalErrorMsg,
 operationType,
 path,
 authInfo: {
 userId: auth.currentUser ? "[REDACTED_UID]" : null,
 email: auth.currentUser ? "[REDACTED_EMAIL]" : null,
 emailVerified: auth.currentUser?.emailVerified,
 isAnonymous: auth.currentUser?.isAnonymous
 }
 };
 console.error('Firestore Error (Production Safe):', JSON.stringify(sanitizedInfo));
 }

 // 2. Clear, polite, localized user-toasts / notifications message without raw stringified error JSON.
 const secureUserMessage = "အချက်အလက်သွင်းယူခြင်း/ပြင်ဆင်ခြင်း မအောင်မြင်ပါ။ (IT-SOP-001 Protocol Error: Database operation failed. Please try again or contact IT Support.)";
 
 throw new SecureFirestoreError(secureUserMessage, originalErrorMsg, operationType, path, errorCode);
}

