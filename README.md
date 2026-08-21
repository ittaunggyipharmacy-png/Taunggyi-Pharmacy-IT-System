# Taunggyi Pharmacy IT Management System

This project is the internal web system for Taunggyi Pharmacy’s IT operations. It helps staff record IT tickets, manage hardware, process purchase requests, control system access, store documents, and produce operational reports.

> **Purpose:** keep IT work, assets, approvals, and records in one secure place that staff can understand and operate.

## What the System Can Do

| Area | Plain-language purpose |
|---|---|
| **IT Tickets** | Staff can report IT problems and follow their progress. |
| **Hardware Assets** | IT can register computers, printers, phones, and other equipment. |
| **Access Control** | Staff can request access to internal systems; authorized people can review and approve it. |
| **Procurement** | Teams can create purchase requests, issue orders, receive goods, and match invoices. |
| **Documents** | Authorized users can manage business files stored in Google Drive. |
| **Settings and Reports** | Administrators can update basic system settings and export operational information. |

## Start Here

If you are new to the codebase, read these files in this order:

| File or folder | What it is responsible for |
|---|---|
| [`CODE_GUIDE.md`](./CODE_GUIDE.md) | Plain-language map of the project and safe editing guidance. |
| [`src/App.tsx`](./src/App.tsx) | The main application shell: login, navigation, and which screen is shown. |
| [`src/components/`](./src/components/) | Individual screens, such as tickets, assets, access requests, and procurement. |
| [`src/services/firestoreService.ts`](./src/services/firestoreService.ts) | The client’s saved-data actions and calls to protected server endpoints. |
| [`server.ts`](./server.ts) | The server-side API, security checks, and Google Drive integration. |
| [`src/config/application.ts`](./src/config/application.ts) | Shared business-wide settings, defaults, and safety phrases. |
| [`firestore.rules`](./firestore.rules) | Firebase’s database access rules. Treat this as security-critical. |

## Requirements

Install a current [Node.js](https://nodejs.org/) long-term-support release and use npm, which is included with Node.js. You also need a Firebase project for sign-in and data storage. Google Drive integration is optional, but it requires a Google service account and a permitted Drive folder.

## Set Up a Local Copy

1. Download or clone the repository.

   ```bash
   git clone https://github.com/ittaunggyipharmacy-png/Taunggyi-Pharmacy-IT-System.git
   cd Taunggyi-Pharmacy-IT-System
   ```

2. Install the project packages.

   ```bash
   npm install
   ```

3. Create a local environment file from the example.

   ```bash
   cp .env.example .env
   ```

4. Add the required values to `.env`. **Never commit `.env` or service-account credentials to GitHub.**

5. Start the system for development.

   ```bash
   npm run dev
   ```

6. Open the local address shown in the terminal, usually `http://localhost:3000`.

## Environment Settings

| Setting | Required? | Purpose |
|---|---:|---|
| `PORT` | No | Local server port. The default is `3000`. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Only for Google Drive features | Server-side credentials for the Google Drive service account. |
| `GOOGLE_DRIVE_FOLDER_ID` | Only for Google Drive features | The approved Google Drive folder for document storage. |
| `GEMINI_API_KEY` | Only if an AI feature is enabled | Key used by optional AI features. |

## Everyday Development Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the local development server. |
| `npm run lint` | Checks TypeScript for code mistakes. |
| `npm test` | Runs the project’s automated checks. |
| `npm run build` | Creates a production-ready build in `dist/`. |
| `npm start` | Runs the production build after `npm run build`. |
| `npm run clean` | Removes the generated `dist/` folder. |

Run the checks before sharing a change:

```bash
npm run lint
npm test
npm run build
```

## Important Safety Rules

The system includes security-sensitive features. Follow these rules when changing it.

1. **Do not remove authorization checks** in `server.ts`, `firestore.rules`, or the validation helpers.
2. **Do not store passwords or raw secrets** in Firebase documents. Use approved secret-management references instead.
3. **Keep the database-wipe protection intact.** It requires a recent sign-in, a backup confirmation, and the exact phrase defined in `src/config/application.ts`.
4. **Do not add credentials to source code, screenshots, issue comments, or commits.**
5. **Make small changes and run the three checks** above before publishing work.

## Project Documentation

| Document | When to use it |
|---|---|
| [`CODE_GUIDE.md`](./CODE_GUIDE.md) | Understanding the code layout and making routine changes. |
| [`ROLE_MATRIX.md`](./ROLE_MATRIX.md) | Reviewing which roles are intended to have which permissions. |
| [`SECURITY_VERIFICATION.md`](./SECURITY_VERIFICATION.md) | Checking security controls and verification steps. |
| [`MIGRATION_AND_ROLLBACK.md`](./MIGRATION_AND_ROLLBACK.md) | Planning or reversing a data migration. |
| [`migration_runbook.md`](./migration_runbook.md) | Performing controlled operational migration work. |

## Before Publishing Changes

Use a separate branch, describe the reason for each change, and request a review for any modification to data access, roles, Firestore rules, server APIs, or the database-wipe feature. Protecting the `main` branch and requiring a review for these areas will reduce operational risk.
