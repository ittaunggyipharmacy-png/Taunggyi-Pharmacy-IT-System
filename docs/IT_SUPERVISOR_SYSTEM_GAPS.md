# IT Supervisor System Scope

## Scope decision

The IT Support Ticket / Helpdesk module is intentionally **out of scope for now** because IT support requests are handled through the existing Viber channel workflow.

Do not add a duplicate ticket workflow unless the support process changes.

## Remaining JD-aligned modules to add

### 1. Network & Internet Management
Track branch network infrastructure and service information:
- Branch
- Device type (router, switch, access point, modem, firewall)
- Device name / hostname
- IP address
- MAC address
- ISP / provider
- Internet plan
- Connection status
- Installation date
- Warranty / renewal date
- Responsible person
- Notes
- Maintenance history

### 2. CCTV Management
Track CCTV infrastructure and operational checks:
- Branch
- Camera ID / location
- Camera type
- DVR/NVR
- Recorder channel
- Storage capacity
- Recording status
- Retention period
- Last check date
- Checked by
- Maintenance date
- Vendor
- Notes

### 3. Backup & Recovery Management
Track backup readiness rather than storing backup data in the application:
- System / data source
- Backup type
- Schedule
- Backup location
- Last backup date/time
- Result (success/failure)
- Responsible person
- Verification status
- Last recovery test
- Recovery test result
- Notes

### 4. IT Maintenance & Vendor Service
Track hardware/software maintenance and external service work:
- Asset / system
- Branch
- Maintenance type
- Problem / reason
- Action taken
- Service date
- Technician / responsible person
- Vendor
- Cost
- Warranty
- Next maintenance date
- Attachments / service documents
- Notes

### 5. Access Control Register
Track administrative access changes separately from application authentication:
- User
- Employee / branch
- System / service
- Role
- Access level
- Approved by
- Granted date
- Last reviewed date
- Changed date
- Disabled date
- Status
- Reason / notes

## Existing modules to preserve

Do not remove or rewrite the existing core modules:
- Assets
- Purchases
- Renewals
- KPI
- Reports
- Security
- Marketing
- File Manager
- Meetings
- Dashboard
- Authentication

Existing asset `specs` JSON compatibility and existing hard-coded business behavior must remain intact unless a separate migration is explicitly approved.

## Implementation principles

1. Additive changes only; avoid breaking current workflows.
2. Reuse existing Supabase/service patterns and UI conventions.
3. Use typed models instead of `any` for new code.
4. Keep branch/location as a first-class filter where applicable.
5. Add audit fields (`created_at`, `updated_at`, `created_by`, `updated_by`) to new records.
6. Prefer database constraints and indexes for integrity and reporting.
7. Do not build a duplicate Viber ticket system.
