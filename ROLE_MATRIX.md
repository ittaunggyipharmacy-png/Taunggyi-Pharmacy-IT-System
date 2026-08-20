# Role-Based Access Control (RBAC) Matrix
**Taunggyi Pharmacy Enterprise IT System**

This document specifies the exact permissions, capabilities, and data access policies enforced by the server-side API gateway and Firestore Security Rules.

---

## 1. System Roles Overview

| Role Name | Identifier | Target Persona | Scope & Purpose |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `super_admin` | Head of IT / System Owner | Complete system control, user role assignment, migrations, soft-delete wipe with backup verification. |
| **IT Supervisor** | `it_supervisor` | Senior IT Engineers & Leads | Operational oversight, hardware/software approval, KPI reviews, CCTV requests, and audit review. |
| **Asset Editor** | `asset_editor` | Hardware Inventory Clerks | Asset creation, maintenance logs, batch Excel hardware import, QR tag generation. |
| **Document Manager** | `document_manager` | IT Documentation Officers | Meeting minutes creation, SOP/manual uploads to Google Drive, CCTV request logs. |
| **Content Manager** | `content_manager` | Digital Marketing IT Liaisons | Marketing campaign schedule, content calendar updates, marketing asset tracking. |
| **Staff Viewer** | `staff_viewer` | General Organization Staff | Read-only view of approved knowledge base, submit IT tickets, view personal KPI logs. |
| **Disabled / Suspended** | `disabled` | Offboarded / Revoked Users | Zero system access. All requests fail closed at rule & API level. |

---

## 2. Resource Permissions Grid

| Resource / Collection | `super_admin` | `it_supervisor` | `asset_editor` | `document_manager` | `content_manager` | `staff_viewer` | `disabled` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **User Roles (`/app_users`)** | Read / Write / Role Assign | Read Only | Self Profile Only (Read/Edit Non-Role) | Self Profile Only | Self Profile Only | Self Profile Only | No Access |
| **IT Assets (`/it_assets`)** | Full CRUD | Full CRUD | Create / Read / Update | Read Only | Read Only | Read Only | No Access |
| **Asset Code Counters (`/counters`)** | Server Transaction Only | Server Transaction Only | Server Transaction Only | No Client Access | No Client Access | No Client Access | No Access |
| **IT Tickets (`/it_tickets`)** | Full CRUD | Full CRUD | Read / Create / Update | Read / Create / Update | Read / Create / Update | Read / Create Own | No Access |
| **Purchases (`/purchase_records`)** | Full CRUD | Full CRUD | Create / Read / Update | Read Only | Read Only | Read Only | No Access |
| **Renewals (`/renewals`)** | Full CRUD | Full CRUD | Read Only | Read Only | Read Only | Read Only | No Access |
| **Meeting Minutes (`/meeting_minutes`)** | Full CRUD | Full CRUD | Read Only | Create / Edit (Author/Designated) | Read Only | Read Only | No Access |
| **Marketing Plans (`/content_plans`)** | Full CRUD | Full CRUD | Read Only | Read Only | Create / Read / Update | Read Only | No Access |
| **Drive Files (`/api/drive/*`)** | Scoped CRUD / Audit | Scoped CRUD / Audit | Upload / View Scoped | Upload / View Scoped | Upload / View Scoped | View Scoped Only | No Access |
| **Audit Logs (`/audit_logs`)** | Read Only (Server Writes) | Read Only | No Access | No Access | No Access | No Access | No Access |
| **Migration Ledger (`/migration_ledger`)** | Read Only (Server Writes) | No Access | No Access | No Access | No Access | No Access | No Access |
| **Admin Migrations (`/api/admin/migrations`)** | Execute Jobs | No Access | No Access | No Access | No Access | No Access | No Access |
| **Disaster Recovery Wipe (`/api/admin/wipe-database`)** | Super Admin (Recent Auth + String) | No Access | No Access | No Access | No Access | No Access | No Access |

---

## 3. Privilege Escalation Prevention Mechanisms

1. **Firestore Rules Invariant**: Any modification to `/app_users/{uid}` by a non-super-admin user strictly rejects modification of fields in `['role', 'isAdmin', 'active', 'uid', 'email', 'createdAt', 'lastLogin', 'audit']`.
2. **Server-Side Token Verification**: The Express API extracts role verification from Firebase Auth Custom Claims directly verified via Admin SDK, bypassing any unverified client payload claims.
3. **Hard-coded Super Admin Identity**: The primary root identity (`it.taunggyipharmacy@gmail.com`) is guarded at rule and server levels to guarantee administrative continuity while disallowing unauthorized takeover.
