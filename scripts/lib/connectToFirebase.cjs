// This file has ONE job: connect to Firebase so our admin scripts can
// talk to it. Both "bootstrap_super_admin.cjs" and "migrate_roles.js"
// use this same function, so we only write it once here.

const admin = require('firebase-admin');

// The name of our Firebase project (used when we don't have a
// service account key handy, e.g. when running inside Google Cloud).
const FALLBACK_PROJECT_ID = 'gen-lang-client-0768528628';

/**
 * Connects to Firebase and gives back the admin tools we need.
 *
 * How it decides which credentials to use:
 *   1. If a GOOGLE_SERVICE_ACCOUNT_JSON environment variable is set,
 *      use that (this is a secret key file, kept outside the code).
 *   2. Otherwise, fall back to the default project id. This works when
 *      the script is already running on trusted Google infrastructure.
 *
 * If connecting fails for any reason, we print the error and stop the
 * whole script (there is nothing useful we can do without a connection).
 */
function connectToFirebase() {
  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id,
      });
    } else {
      admin.initializeApp({ projectId: FALLBACK_PROJECT_ID });
    }
  } catch (error) {
    console.error('Could not connect to Firebase:', error);
    process.exit(1);
  }

  return {
    auth: admin.auth(),
    db: admin.firestore(),
  };
}

module.exports = { connectToFirebase };
