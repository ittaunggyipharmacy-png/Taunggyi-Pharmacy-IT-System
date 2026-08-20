# Security & Reliability Hardening Release - Migration Runbook

This runbook outlines the steps to perform the security migration from the legacy open-access model to the new Custom Claims-based Role-Based Access Control (RBAC) model.

## IMPORTANT NOTE FOR PREVIEW / DEV ENVIRONMENTS
The backend initialization script (\`scripts/bootstrap_super_admin.js\`) requires the **Identity Toolkit API** to be enabled on your Google Cloud Project. If you are running this in a simulated preview environment where that API is disabled or inaccessible, the hardcoded bypass for \`it.taunggyipharmacy@gmail.com\` has been **temporarily restored** directly in the \`firestore.rules\` and \`server.ts\` files. This guarantees immediate access.

When you deploy this to production, ensure the Identity Toolkit API is enabled on your Firebase project.

## 1. Bootstrap First Super Admin (Production Only)
Run this command on your production backend environment:
\`\`\`bash
node scripts/bootstrap_super_admin.cjs it.taunggyipharmacy@gmail.com
\`\`\`
This will set the \`super_admin\` Firebase custom claim and allow the user full system access.

## 2. Migrate Existing Users (Production Only)
Existing user records in Firestore (\`app_users\`) rely on legacy role strings (e.g. "System Admin", "Merchandising Supervisor").
You must run the migration script to convert these to the new custom claims (e.g., \`super_admin\`, \`content_manager\`).
\`\`\`bash
node scripts/migrate_roles.js
\`\`\`

## 3. Verify Deployment
1. Ensure the UI correctly blocks unverified email users.
2. Log in with the \`super_admin\` account.
3. Test creating a new IT Asset. Ensure the asset is created and an asset code (e.g., TG-PC-001) is automatically assigned by the server-side API, not the client.
