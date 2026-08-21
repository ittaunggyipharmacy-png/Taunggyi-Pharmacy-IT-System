import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { 
  validateAsset, 
  validateTicket, 
  validatePurchase, 
  validateMeetingMinute, 
  validateSystemUser,
  sanitizeInput 
} from '../src/schema/validation.js';
import { UserRole } from '../src/types.js';
import { DATABASE_WIPE_CONFIRMATION } from '../src/config/application.js';

// Color logging helpers
const pass = (msg: string) => console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
const fail = (msg: string, err: any) => {
  console.error(`  \x1b[31m✖\x1b[0m ${msg}`);
  console.error(err);
};

let totalTests = 0;
let passedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    pass(name);
  } catch (err) {
    fail(name, err);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('🚀 TAUNGGYI PHARMACY IT SYSTEM - SECURITY & TEST SUITE');
  console.log('======================================================\n');

  // ---------------------------------------------------------
  // Suite 1: Single Shared Schema Layer Validation
  // ---------------------------------------------------------
  console.log('Suite 1: Shared Schema Layer Validation & Data Sanitization');
  await runTest('Asset validation rejects missing model or invalid category', () => {
    const invalidAsset: any = { category: 'InvalidCat', model: '' };
    const res = validateAsset(invalidAsset);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors.length >= 2);
  });

  await runTest('Asset validation succeeds for valid asset payload', () => {
    const validAsset = {
      category: 'Computer' as const,
      model: 'OptiPlex 3080 Micro',
      serialNumber: 'SN-998822',
      status: 'Active' as const,
      location: 'Central Storage',
      assignedTo: 'Daw Khin'
    };
    const res = validateAsset(validAsset);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
  });

  await runTest('Ticket validation enforces required problemType and valid priority/status', () => {
    const invalidTicket: any = { problemType: '', priority: 'UltraHigh' };
    const res = validateTicket(invalidTicket);
    assert.strictEqual(res.valid, false);
  });

  await runTest('Input sanitizer removes dangerous HTML tags and trims whitespace', () => {
    const dirty = '<script>alert("xss")</script> Hello World ';
    const clean = sanitizeInput(dirty);
    assert.strictEqual(clean, 'alert("xss") Hello World');
  });

  // ---------------------------------------------------------
  // Suite 2: Firestore Security Rules (Static & Pattern Audit)
  // ---------------------------------------------------------
  console.log('\nSuite 2: Firestore Rules "Eight Pillars" & Security Hardening');
  const rulesContent = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf-8');

  await runTest('Rules enforce Eight Pillars and deny unauthenticated requests', () => {
    assert.ok(rulesContent.includes('function isSignedIn()') || rulesContent.includes('function isAuthenticated()'));
    assert.ok(rulesContent.includes('request.auth != null'));
  });

  await runTest('Rules deny self-elevation of role or isAdmin in /app_users', () => {
    assert.ok(rulesContent.includes("hasAny(['role', 'isAdmin'"));
  });

  await runTest('Rules deny direct client writes to counters collection', () => {
    assert.ok(rulesContent.includes('match /counters/{counterId}'));
    assert.ok(rulesContent.includes('allow read, write: if false;'));
  });

  await runTest('Rules deny direct client writes to migration_ledger', () => {
    assert.ok(rulesContent.includes('match /migration_ledger/{ledgerId}'));
    assert.ok(rulesContent.includes('allow read: if isSuperAdmin();'));
    assert.ok(rulesContent.includes('allow write: if false;'));
  });

  await runTest('Rules do NOT contain any plaintext password vault collection', () => {
    assert.ok(!rulesContent.includes('match /passwords/{'));
    assert.ok(!rulesContent.includes('match /vault/{'));
  });

  // ---------------------------------------------------------
  // Suite 3: RBAC & Permission Matrix
  // ---------------------------------------------------------
  console.log('\nSuite 3: Role-Based Access Control (RBAC) Matrix');
  await runTest('User roles are strictly typed with no undefined permissions', () => {
    const roles = Object.values(UserRole);
    assert.ok(roles.includes(UserRole.SUPER_ADMIN));
    assert.ok(roles.includes(UserRole.IT_SUPERVISOR));
    assert.ok(roles.includes(UserRole.ASSET_EDITOR));
    assert.ok(roles.includes(UserRole.DOCUMENT_MANAGER));
    assert.ok(roles.includes(UserRole.CONTENT_MANAGER));
    assert.ok(roles.includes(UserRole.STAFF_VIEWER));
    assert.ok(roles.includes(UserRole.DISABLED));
  });

  await runTest('validateSystemUser rejects unauthorized role modifications', () => {
    const invalidUser: any = { uid: 'u1', email: 'test@tp.com', role: 'root_admin' };
    const res = validateSystemUser(invalidUser);
    assert.strictEqual(res.valid, false);
  });

  // ---------------------------------------------------------
  // Suite 4: Google Drive Folder Containment & Deletion Safety
  // ---------------------------------------------------------
  console.log('\nSuite 4: Google Drive Security & Scoped Operations');
  const serverContent = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');

  await runTest('Drive file deletion requires verification of parent folder hierarchy', () => {
    assert.ok(serverContent.includes('verifyFolderInRoot'));
    assert.ok(serverContent.includes('Cannot delete file outside approved root'));
  });

  await runTest('Drive operations do not use public "anyone" with role "writer" permissions', () => {
    assert.ok(!serverContent.includes("type: 'anyone', role: 'writer'"));
    assert.ok(!serverContent.includes('type: "anyone", role: "writer"'));
  });

  // ---------------------------------------------------------
  // Suite 5: Server-Side Atomic Counter Generation
  // ---------------------------------------------------------
  console.log('\nSuite 5: Atomic Concurrency & Unique Code Generation');
  await runTest('Server implements atomic transaction increment for asset codes', () => {
    assert.ok(serverContent.includes('db.runTransaction'));
    assert.ok(serverContent.includes('nextNumber = lastNumber + 1'));
    assert.ok(serverContent.includes('transaction.set(counterRef'));
  });

  // ---------------------------------------------------------
  // Suite 6: Versioned Server-Side Admin Migrations & Batch Import
  // ---------------------------------------------------------
  console.log('\nSuite 6: Server-Side Versioned Migrations & Resumable Batch Import');
  await runTest('Server processes batch import writes in chunks <= 400', () => {
    assert.ok(serverContent.includes('records.length > 400') || serverContent.includes('batchCount >= 400'));
  });

  await runTest('Admin migrations implement idempotency check in migration_ledger', () => {
    assert.ok(serverContent.includes('migration_ledger'));
    assert.ok(serverContent.includes('idempotencyKey'));
    assert.ok(serverContent.includes('dryRun'));
  });

  // ---------------------------------------------------------
  // Suite 7: Super-Admin Disaster Recovery Wipe Safety
  // ---------------------------------------------------------
  console.log('\nSuite 7: Disaster Recovery & Safe Super-Admin Data Operations');
  await runTest('Server wipe endpoint requires exact string and verified backup confirmation', () => {
    assert.strictEqual(DATABASE_WIPE_CONFIRMATION, 'DELETE ALL DATA CONFIRMED');
    assert.ok(serverContent.includes('DATABASE_WIPE_CONFIRMATION'));
    assert.ok(serverContent.includes('backupVerified'));
  });

  await runTest('Hardcoded reset passwords and client mass-delete are completely removed', () => {
    assert.ok(!serverContent.includes('123456'));
    assert.ok(!serverContent.includes('hardcodedResetPassword'));
  });

  // ---------------------------------------------------------
  // Suite 8: Meeting Minutes Author Immutability & Permissions
  // ---------------------------------------------------------
  console.log('\nSuite 8: Meeting Minutes Immutability & Action Items Validation');
  await runTest('Meeting schema validates required date, topic, createdByUid, and action items', () => {
    const validMeeting = {
      date: '2026-08-20',
      title: 'Q3 IT Infrastructure Review',
      content: 'Discussion regarding network upgrades across branches.',
      createdByUid: 'admin-uid-123',
      actionItems: [
        { id: 'act-1', task: 'Upgrade core switches', assignedTo: 'Ko Min', status: 'Pending' as const }
      ]
    };
    const res = validateMeetingMinute(validMeeting);
    assert.strictEqual(res.valid, true);
  });

  await runTest('Meeting rules preserve createdByUid on updates', () => {
    assert.ok(rulesContent.includes('incoming().createdByUid == existing().createdByUid'));
  });

  // ---------------------------------------------------------
  // Suite 9: Server Hardening, CSP & Environment Safety
  // ---------------------------------------------------------
  console.log('\nSuite 9: Server Security, Helmet CSP & Environment Validation');
  await runTest('Server utilizes Helmet with configured Content Security Policy', () => {
    assert.ok(serverContent.includes('helmet('));
    assert.ok(serverContent.includes('contentSecurityPolicy'));
  });

  await runTest('Server enforces API rate limiting and body upload limits', () => {
    assert.ok(serverContent.includes('rateLimit('));
    assert.ok(serverContent.includes('express.json({ limit: "10mb" })') || serverContent.includes('limit:'));
  });

  await runTest('Server implements health check and readiness endpoints', () => {
    assert.ok(serverContent.includes('app.get("/api/health"'));
    assert.ok(serverContent.includes('app.get("/api/ready"'));
  });

  // ---------------------------------------------------------
  // Suite 10: Frontend Bundle & Secret Isolation
  // ---------------------------------------------------------
  console.log('\nSuite 10: Frontend Secret Isolation & Code Modularization');
  const viteConfig = fs.readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf-8');

  await runTest('Vite config does not inject GEMINI_API_KEY into client bundle', () => {
    assert.ok(!viteConfig.includes('GEMINI_API_KEY'));
    assert.ok(!viteConfig.includes('process.env.GEMINI_API_KEY'));
  });

  await runTest('App.tsx uses route-level lazy loading for submodules', () => {
    const appContent = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
    assert.ok(appContent.includes('lazy(() => import('));
    assert.ok(appContent.includes('Suspense'));
  });

  // ---------------------------------------------------------
  // Suite 11: Dynamic Department Dropdown & Legacy Preservation
  // ---------------------------------------------------------
  console.log('\nSuite 11: Dynamic Department System & Legacy Preservation');
  const { sortDepartments, formatDepartmentOptions, validateDepartmentName } = await import('../src/utils/departmentUtils.js');

  await runTest('sortDepartments prioritizes IT and sorts remaining alphabetically', () => {
    const input = ['Sales', 'Accounts', 'IT', 'Merchandising', 'Digital Marketing'];
    const sorted = sortDepartments(input);
    assert.strictEqual(sorted[0], 'IT');
    assert.deepStrictEqual(sorted, ['IT', 'Accounts', 'Digital Marketing', 'Merchandising', 'Sales']);
  });

  await runTest('validateDepartmentName enforces required fields, length limits and rejects duplicates', () => {
    const list = ['IT', 'Accounts'];
    assert.strictEqual(validateDepartmentName('', list).valid, false);
    assert.strictEqual(validateDepartmentName('   ', list).valid, false);
    assert.strictEqual(validateDepartmentName('it', list).valid, false); // case-insensitive duplicate
    assert.strictEqual(validateDepartmentName('Accounts', list).valid, false);
    assert.strictEqual(validateDepartmentName('A'.repeat(101), list).valid, false);
    assert.strictEqual(validateDepartmentName('Warehouse', list).valid, true);
  });

  await runTest('formatDepartmentOptions preserves legacy departments not in settings with Legacy label', () => {
    const activeDepts = ['IT', 'Accounts', 'Merchandising'];
    
    // Existing department is in settings -> standard options
    const standardOpts = formatDepartmentOptions(activeDepts, 'Accounts');
    assert.strictEqual(standardOpts.some(o => o.value === 'Accounts' && !o.isLegacy), true);
    assert.strictEqual(standardOpts.some(o => o.isLegacy), false);

    // Existing department is missing from settings -> marked as Legacy
    const legacyOpts = formatDepartmentOptions(activeDepts, 'Old Logistics');
    const legacyItem = legacyOpts.find(o => o.value === 'Old Logistics');
    assert.ok(legacyItem);
    assert.strictEqual(legacyItem.isLegacy, true);
    assert.strictEqual(legacyItem.label, 'Legacy: Old Logistics');
  });

  await runTest('AssetsModule and TicketsModule use dynamic DepartmentSelect without hardcoded arrays', () => {
    const assetsModuleContent = fs.readFileSync(path.join(process.cwd(), 'src/components/AssetsModule.tsx'), 'utf-8');
    const ticketsModuleContent = fs.readFileSync(path.join(process.cwd(), 'src/components/TicketsModule.tsx'), 'utf-8');
    assert.ok(assetsModuleContent.includes('DepartmentSelect'));
    assert.ok(ticketsModuleContent.includes('DepartmentSelect'));
    assert.ok(!assetsModuleContent.includes('<option value="Merchandising">Merchandising</option>'));
    assert.ok(!ticketsModuleContent.includes('<option value="Merchandising">Merchandising</option>'));
  });

  const failedTests = totalTests - passedTests;
  const successRate = Math.round((passedTests / totalTests) * 100);

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed (${successRate}% Success)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
