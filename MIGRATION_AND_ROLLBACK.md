# Migration and Rollback Playbook
**Taunggyi Pharmacy Enterprise IT System**

This playbook documents the procedures for versioned schema migrations, bulk imports, and system disaster recovery with zero data loss.

---

## 1. Administrative Migration System Architecture

All database schema migrations, code standardizations, and batch seeds are moved out of the browser client and executed exclusively as **server-side versioned jobs** authenticated through `/api/admin/migrations/run`.

### Core Safety Principles:
1. **Super-Admin Authorization**: Only authenticated sessions with the `super_admin` role can initiate migration jobs.
2. **Idempotency Key**: Every job run requires a unique `idempotencyKey`. If a job key already exists in `/migration_ledger`, subsequent executions are aborted immediately to prevent duplicates.
3. **Dry-Run Mode**: Jobs support a `dryRun: true` parameter to run complete preflight validation and schema verification without performing writes.
4. **400-Write Batch Chunking**: All batch writes are split into batches of at most 400 documents to adhere safely to Firestore's 500-operation transaction limit.
5. **Detailed Error Reporting**: Returns a per-record failure report containing item index, ID, and detailed validation errors.

---

## 2. Standard Migration Workflow

### Step 1: Preflight Dry Run
Execute the migration with `dryRun: true` to test compatibility and capture errors:
```http
POST /api/admin/migrations/run
Authorization: Bearer <SUPER_ADMIN_ID_TOKEN>
Content-Type: application/json

{
  "jobName": "STANDARDIZE_ASSET_CODES",
  "version": "1.1.0",
  "idempotencyKey": "stand_assets_2026_08_20_001",
  "dryRun": true
}
```

### Step 2: Live Migration Execution
Once preflight validation reports zero errors, trigger the live migration:
```http
POST /api/admin/migrations/run
Authorization: Bearer <SUPER_ADMIN_ID_TOKEN>
Content-Type: application/json

{
  "jobName": "STANDARDIZE_ASSET_CODES",
  "version": "1.1.0",
  "idempotencyKey": "stand_assets_2026_08_20_001",
  "dryRun": false
}
```

### Step 3: Migration Ledger Verification
Inspect the immutable record created in `/migration_ledger/{idempotencyKey}`:
```json
{
  "jobName": "STANDARDIZE_ASSET_CODES",
  "version": "1.1.0",
  "idempotencyKey": "stand_assets_2026_08_20_001",
  "status": "COMPLETED",
  "actorUid": "dYj...",
  "actorEmail": "it.taunggyipharmacy@gmail.com",
  "timestamp": "2026-08-20T08:30:00.000Z",
  "stats": {
    "total": 142,
    "succeeded": 142,
    "failed": 0,
    "errors": []
  }
}
```

---

## 3. Resumable Excel Bulk Import

The client-side Excel importer processes spreadsheets in server-validated chunks:
- Endpoint: `POST /api/admin/import/excel`
- Max batch size: 400 rows per write request.
- Per-row validation: Rejects rows missing mandatory schema fields while writing valid rows.
- Idempotency & Deduplication: If records include pre-existing `id` keys, merges safely without duplicating records.

---

## 4. Disaster Recovery & Emergency Soft-Delete

### Safety Safeguards for Database Reset
The dangerous client-side mass-delete routine and hardcoded reset password have been completely removed.
In disaster recovery scenarios requiring a full system wipe:
1. Endpoint: `POST /api/admin/wipe-database`
2. **Re-authentication Requirement**: The Super Admin session must have logged in within the last 5 minutes (`auth_time`).
3. **Exact String Confirmation**: Payload must contain `confirmation: "CONFIRM_WIPE"`.
4. **Verified Backup Check**: Payload must contain `backupVerified: true`.
5. **Soft-Delete Archiving**: Instead of immediate permanent purge, all records are archived under `/soft_deleted_archives/{timestamp}` with immutable audit log trails before primary collections are cleaned.

### Recovery / Restore Procedure
To restore data from an archive:
1. Access Firestore console or run the server recovery utility.
2. Select target backup under `/soft_deleted_archives/{timestamp}`.
3. Stream archived collection snapshots back to active document paths.
