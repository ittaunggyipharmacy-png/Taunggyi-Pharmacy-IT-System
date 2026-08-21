// This script makes ONE person a "super_admin" so they can log in and
// manage the whole system for the first time.
//
// How to run it:
//   node scripts/bootstrap_super_admin.cjs someone@example.com

const { connectToFirebase } = require('./lib/connectToFirebase.cjs');

/** Reads the email address the user typed after the script name. */
function getEmailFromCommandLine() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node bootstrap_super_admin.cjs <email>');
    process.exit(1);
  }
  return email;
}

/** Gives the "super_admin" role to the Firebase Auth account for this email. */
async function grantSuperAdminAuthRole(auth, email) {
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { role: 'super_admin' });
  return user;
}

/**
 * Also updates the "app_users" database record for this person, so the
 * app's own UI (which reads from the database, not from Auth) shows
 * them as a super admin too.
 */
async function updateSuperAdminProfile(db, userId) {
  await db.collection('app_users').doc(userId).set(
    { role: 'super_admin', isAdmin: true },
    { merge: true }
  );
}

async function main() {
  const email = getEmailFromCommandLine();
  const { auth, db } = connectToFirebase();

  try {
    const user = await grantSuperAdminAuthRole(auth, email);
    await updateSuperAdminProfile(db, user.uid);
    console.log(`Success! ${email} is now a super_admin.`);
    process.exit(0);
  } catch (error) {
    console.error('Could not bootstrap super admin:', error);
    process.exit(1);
  }
}

main();
