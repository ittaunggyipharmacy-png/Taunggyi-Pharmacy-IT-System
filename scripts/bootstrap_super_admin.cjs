const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.project_id
    });
  } else {
    admin.initializeApp({
      projectId: "gen-lang-client-0768528628"
    });
  }
} catch (e) {
  console.error("Firebase Admin initialization failed:", e);
  process.exit(1);
}

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("Usage: node bootstrap_super_admin.js <email>");
  process.exit(1);
}

async function bootstrap() {
  try {
    const user = await admin.auth().getUserByEmail(targetEmail);
    await admin.auth().setCustomUserClaims(user.uid, { role: "super_admin" });
    
    // Also update app_users collection just for UI read access
    const db = admin.firestore();
    await db.collection("app_users").doc(user.uid).set({
      role: "super_admin",
      isAdmin: true
    }, { merge: true });
    
    console.log(`Successfully bootstrapped super_admin for ${targetEmail}`);
    process.exit(0);
  } catch (err) {
    console.error("Bootstrap error:", err);
    process.exit(1);
  }
}

bootstrap();
