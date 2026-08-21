# Code Guide for Non-Developers

This guide explains the project in everyday language. You do not need to understand every line of code to use it safely. Start by identifying **what you want to change**, then use the table below to find the right place.

> **Golden rule:** Change the smallest possible area, test it, and ask for a review when the change affects data access, user roles, or security.

## The Big Picture

The system has four main layers. The browser screen is what staff see. The client data service helps those screens save and load information. The server performs protected work that should never rely on the browser alone. Firebase stores the data and enforces database access rules.

```text
Staff member → Browser screen → Client data service → Protected server API → Firebase / Google Drive
```

| Layer | Main location | Responsibility |
|---|---|---|
| **Screens** | `src/components/` | Forms, buttons, tables, and information shown to staff. |
| **Application shell** | `src/App.tsx` | Sign-in, left navigation, dark mode, and choosing the active screen. |
| **Live data hook** | `src/hooks/useAppData.ts` | Keeps the main screen updated when Firestore data changes. |
| **Data service** | `src/services/firestoreService.ts` | Saves ordinary records and calls protected server actions. |
| **Server** | `server.ts` | Checks permissions, validates sensitive requests, and integrates with Google Drive. |
| **Business rules** | `src/schema/validation.ts` | Checks that submitted data is complete and follows workflow rules. |
| **Shared configuration** | `src/config/application.ts` | One source for organization-wide defaults and safety constants. |
| **Database security** | `firestore.rules` | Final Firebase permission checks. |

## Where to Make Common Changes

| If you need to change… | Start here | Read this first |
|---|---|---|
| The title, wording, or fields on a screen | The relevant file in `src/components/` | Search for the visible text first. |
| A new menu item or the order of the menu | `src/App.tsx` | The `navigationItems` list and the view router. |
| Default departments, locations, or IT contacts | `src/config/application.ts` | `DEFAULT_SYSTEM_SETTINGS`. |
| An ordinary save or delete action | `src/services/firestoreService.ts` | Reuse `saveGenericRecord` or `deleteGenericRecord` where appropriate. |
| A protected action, such as approvals or imports | `server.ts` | Existing authorization checks and validation helpers. |
| Who may access information | `ROLE_MATRIX.md`, `src/schema/validation.ts`, `server.ts`, and `firestore.rules` | All of these must agree. Do not change only one. |
| A data field or workflow rule | `src/types.ts` and `src/schema/validation.ts` | Update the type and validation together. |
| A Google Drive action | `server.ts` and `src/services/firestoreService.ts` | Keep the server-side role and folder checks. |

## Safe Editing Workflow

Use this sequence for every change, even a small text change.

1. **Describe the result you expect.** For example: “Add a Branch 4 location to the default list.”
2. **Find the smallest responsible file.** Do not edit several areas unless the change truly needs them.
3. **Make the change with clear names and short comments.** Prefer a named constant over repeating a value in multiple files.
4. **Run the checks.**

   ```bash
   npm run lint
   npm test
   npm run build
   ```

5. **Test the change in the browser** with a normal user and, when relevant, an administrator.
6. **Describe the change in plain language** before asking someone to review it.

## Important Concepts

### Roles and Access

A role describes what a user is allowed to do. The user interface can hide unavailable buttons, but the server and Firebase rules are the real protection. The project keeps the main administrator identity and reusable access helpers in `src/config/application.ts` so the same rule is not copied into many screens.

| Role | Typical purpose |
|---|---|
| `super_admin` | Full system administration and high-risk actions. |
| `it_supervisor` | IT operational management and selected approvals. |
| `finance_manager` | Finance-related review and approval steps. |
| `asset_editor` | Asset registration and approved asset changes. |
| `document_manager` | Document and Google Drive management. |
| `content_manager` | Marketing and content work. |
| `staff_viewer` | Standard staff access. |
| `disabled` | Account blocked from normal use. |

### Why Some Actions Go Through the Server

Creating assets, approving access, importing files, changing user roles, and database maintenance are handled by `server.ts`. This prevents someone from bypassing the browser interface and sending an unsafe request directly to Firebase. Keep permission checks and validation close to these server routes.

### Default Values

`src/config/application.ts` contains the starting departments, locations, IT contacts, primary administrator identity, and database-wipe confirmation phrase. This makes the values easy to find and prevents accidental inconsistencies between screens and server code.

## What Not to Do

| Do not… | Why it is unsafe or confusing |
|---|---|
| Put passwords, API keys, or service-account JSON in the code | Secrets can be copied into Git history and exposed. |
| Delete role checks to “make it work” | This can give unauthorized users access. |
| Change only the user interface for a security feature | A browser check alone can be bypassed. |
| Change Firestore rules without reviewing server behavior | The two layers can become inconsistent. |
| Reuse a one-off patch script as permanent production code | It makes future maintenance difficult. Move proven work into named modules instead. |
| Publish directly to `main` without checking the change | A mistake can affect all users. |

## Understanding the Main Files

### `src/App.tsx`

This is the entry point for the signed-in web application. It listens for login changes, gets live data through `useAppData`, displays the menu, and selects the correct screen. It should stay focused on the overall page structure instead of directly managing each Firestore collection.

### `src/hooks/useAppData.ts`

This file collects live data from Firestore after someone signs in. It keeps the repetitive subscription details out of `App.tsx`. If a new main-area module needs live Firestore data, add the new collection here and pass it to the relevant screen from `App.tsx`.

### `src/services/firestoreService.ts`

This file is a trusted client-side helper. It standardizes ordinary record saves, removes undefined values before sending data to Firebase, and sends credentials with calls to protected server routes. It should not replace server-side authorization.

### `server.ts`

This file runs the private server API. It is the correct place for privileged actions. It validates incoming data, identifies the current user role, keeps audit records, and talks to Google Drive. The file is large because it includes several business workflows; keep related routes grouped together and use named helpers rather than repeated permission blocks.

### `src/schema/validation.ts`

This file checks whether information is valid before it is accepted. For example, it checks important fields for assets, tickets, access requests, and procurement records. If staff report an unclear error message, improve the relevant validation message here rather than allowing invalid data through.

## Before You Ask for a Review

Provide a short note that answers these questions.

| Question | Example answer |
|---|---|
| What did you change? | “Added `Branch 4` to the default locations.” |
| Why was it needed? | “The new branch is now operating.” |
| What could be affected? | “Only the default list shown before settings are saved.” |
| What checks did you run? | “Type check, tests, production build, and manual screen check.” |
| Does it affect security or user roles? | “No.” |

A concise explanation like this makes reviews faster and helps the system remain safe as it grows.
