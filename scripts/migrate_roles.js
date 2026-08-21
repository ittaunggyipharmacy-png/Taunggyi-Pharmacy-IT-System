// This script updates every user's role to match our newer role names.
// It's meant to be run ONCE, after the app switched from old role
// names (like "System Admin") to new ones (like "super_admin").
//
// How to run it:
//   node scripts/migrate_roles.js

const { connectToFirebase } = require('./lib/connectToFirebase.cjs');

// Old role name -> new role name.
// Anything not in this list becomes "staff_viewer" (the safest default).
const OLD_ROLE_TO_NEW_ROLE = {
  'System Admin': 'super_admin',
  'SYSTEM ADMIN': 'super_admin',
  'IT Supervisor': 'it_supervisor',
  'IT SUPERVISOR': 'it_supervisor',
  'Merchandising Supervisor': 'content_manager',
  'IT Digital Marketing': 'document_manager',
  'Staff': 'staff_viewer',
};

const DEFAULT_ROLE = 'staff_viewer';

/** Looks up the new role name for an old one, falling back to the default. */
function getNewRoleFor(oldRole) {
  return OLD_ROLE_TO_NEW_ROLE[oldRole] || DEFAULT_ROLE;
}

/** True for roles that should keep admin-style access in the app. */
function isAdminRole(role) {
  return role === 'super_admin' || role === 'it_supervisor';
}

/**
 * Updates one user everywhere their role is stored:
 *   1. Firebase Auth custom claims (used for permission checks)
 *   2. Their "app_users" database record (used for the UI)
 */
async function migrateOneUser(auth, userDoc) {
  const data = userDoc.data();
  const newRole = getNewRoleFor(data.role);

  console.log(`Migrating ${userDoc.id} (${data.email}): ${data.role} -> ${newRole}`);

  await auth.setCustomUserClaims(userDoc.id, { role: newRole });
  await userDoc.ref.update({ role: newRole, isAdmin: isAdminRole(newRole) });
}

async function main() {
  const { auth, db } = connectToFirebase();

  try {
    const allUsers = await db.collection('app_users').get();

    for (const userDoc of allUsers.docs) {
      await migrateOneUser(auth, userDoc);
    }

    console.log(`Done! Migrated ${allUsers.size} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
