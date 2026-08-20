const admin = require('firebase-admin');

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

const db = admin.firestore();

const ROLE_MAP = {
  "System Admin": "super_admin",
  "SYSTEM ADMIN": "super_admin",
  "IT Supervisor": "it_supervisor",
  "IT SUPERVISOR": "it_supervisor",
  "Merchandising Supervisor": "content_manager",
  "IT Digital Marketing": "document_manager",
  "Staff": "staff_viewer"
};

async function migrate() {
  try {
    const snapshot = await db.collection("app_users").get();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let currentRole = data.role;
      let newRole = ROLE_MAP[currentRole] || "staff_viewer";
      
      console.log(`Migrating user ${doc.id} (${data.email}) from ${currentRole} to ${newRole}`);
      
      await admin.auth().setCustomUserClaims(doc.id, { role: newRole });
      await doc.ref.update({ role: newRole, isAdmin: newRole === "super_admin" || newRole === "it_supervisor" });
      count++;
    }
    
    console.log(`Migrated ${count} users successfully.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
