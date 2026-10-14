# Taunggyi Pharmacy IT System

React/Vite frontend, Express API, Supabase Postgres/Auth, and private Google Drive files.

## Development

Use Node 22+, run `npm ci --ignore-scripts`, copy `.env.example` to `.env` and configure a development Supabase project. Run `npm run dev` (port 3000). OAuth returns to the same origin; allow that origin in Supabase Auth. Username/password login uses the Express API and a server-only service-role key.

## Verification

- `npm run lint`: TypeScript validation.
- `npm test`: task-completion regressions and a disposable PGlite PostgreSQL database covering RLS denial, self-escalation, atomic receipt/assignment/import, and audit attribution.
- `npm run build` then `npm run test:api`: production bundle and anonymous-request rejection on every Drive/vault route.
- `npm audit`: dependency advisories. SheetJS uses the publisher's fixed release (https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).

Tests do not connect to production. PGlite does not simulate hosted Auth, PostgREST or Realtime; staging integration checks remain necessary.

## Database installation and upgrade

For a **fresh project**, execute `supabase/bootstrap.sql` followed by `supabase/migrations/20261014104027_secure_operations_and_data_integrity.sql`. Bootstrap includes the missing prerequisites in the historical migrations and excludes the old installation-specific auth UID rewrite. Do not replay bootstrap over an existing database. Bootstrap replaces the need to replay the old migrations individually.

For an **existing project**, back up the database, check duplicate nonempty asset codes (`select code,count(*) from assets where code is not null and code<>'' group by code having count(*)>1`), inspect the schema and custom triggers, then test the new migration on staging. Existing duplicate codes deliberately stop the migration instead of silently changing equipment identifiers. The migration is transactional; it replaces broad policies on the named tables. Resolve any custom-policy/business-role differences before production rollout. After deployment, refresh browser sessions and confirm each intended role can access its modules.

The first System Admin must be assigned by a trusted database administrator; signing in with a particular email never grants administrator privileges. IT Supervisor has operational writes. System Admin controls users, settings and permissions. Staff reads inventory/people and owns their personal logs. Marketing and Merchandising roles manage content/meetings and their own logs. Menu toggles control navigation; database capabilities remain role-enforced.

## Production deployment

Build and run `NODE_ENV=production npm start` on a Node server. Static-only hosting cannot run the authenticated Drive, vault, or username login APIs; proxy `/api` to this server if the frontend is hosted separately. Configure HTTPS and the correct Supabase redirect origin.

Server configuration:

- `SUPABASE_SERVICE_ROLE_KEY`: server only, needed for username lookup and the encrypted credential vault.
- `VAULT_ENCRYPTION_KEY`: base64-encoded 32 random bytes. Back up securely; losing it makes encrypted credentials unrecoverable. Never expose it as a VITE variable.
- `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_DRIVE_FOLDER_ID`: a dedicated managed folder, shared with the intended users. The API checks the verified user's database role and folder ancestry; uploads are private and limited to 25 MB.

After configuring the key, run `node scripts/migrate-legacy-vault.mjs` once to move legacy config credentials and encrypt legacy vault rows without printing secrets. Run on staging first; keep the key and database backup together in the approved recovery process. Existing publicly shared Drive files are not automatically revoked by this code change: review sharing under the managed folder. Rotate any GitHub/Gemini token that was actually present in a previously published browser bundle.

Verify Google login, username login, Drive upload/list/rename/trash, private-file access, credential create/edit/delete, permission changes, received purchases and asset assignment on staging before release. No real backup scheduler is implemented: the UI explicitly records a manually verified backup. The infrastructure recovery register records recovery tests.

## Data integrity and operations

Purchases marked Received with inventory sync enabled create one linked asset per unit in a single transaction. Re-saving a receipt cannot duplicate units. Changing receipt quantity/status after inventory exists is rejected for explicit reconciliation. Asset codes use an atomic database counter and a unique index. Assignment/return/save/import are transactional; imports validate all rows before committing. Excel imports accept Model/Name, Category, Code, Location, Assignee and Status headers, with a 1000-row transaction limit. Existing codes are preserved; duplicate-code imports fail rather than overwriting unrelated equipment.

KPI edits have an explicit Save button. Reports share their selected date range and count photo tasks only at the 20-photo target. List queries for assets/purchases/renewals/meetings and daily reports page through the API to avoid silently dropping records at the default row cap. Asset tables initially render 100 items, with Show More. Very large datasets still warrant server-side aggregated reporting and a separate virtualized asset-table refactor.

The source of record for audit is `audit_events`, populated from the database session. Credential reveal and server-side mutations record the verified actor. The legacy activity feed is operational context, not the security audit.

Historical root `patch_*.cjs` and `test*.sh` files are legacy maintenance scripts, not deployment commands. Do not run them against this version. `security_spec.md` is retained as historical context; current architecture is Supabase/Postgres as documented here.
