const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');
const assert = require('assert');

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-project",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

describe("Taunggyi Pharmacy IT System - Firestore Rules", () => {
  it("Should deny read for unauthenticated users", async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection("it_assets").get());
  });

  it("Should deny self-elevation of role in app_users", async () => {
    const db = testEnv.authenticatedContext("user123", { 
      email: "user@test.com", email_verified: true, role: "staff_viewer" 
    }).firestore();
    
    // Changing allowed fields should work
    await assertSucceeds(db.collection("app_users").doc("user123").set({
      displayName: "New Name"
    }, { merge: true }));
    
    // Changing role should fail
    await assertFails(db.collection("app_users").doc("user123").set({
      role: "super_admin"
    }, { merge: true }));
  });

  it("Should allow asset creation only for authorized roles", async () => {
    // Unauthorized Staff
    const staffDb = testEnv.authenticatedContext("staff1", { 
      email: "staff@test.com", email_verified: true, role: "staff_viewer" 
    }).firestore();
    await assertFails(staffDb.collection("it_assets").doc("asset1").set({
      category: "Computer", model: "Dell", serialNumber: "123", status: "Active"
    }));

    // Authorized IT Supervisor
    const adminDb = testEnv.authenticatedContext("admin1", { 
      email: "admin@test.com", email_verified: true, role: "it_supervisor" 
    }).firestore();
    await assertSucceeds(adminDb.collection("it_assets").doc("asset1").set({
      category: "Computer", model: "Dell", serialNumber: "123", status: "Active", purchaseDate: "2023-01-01", location: "HQ", assignedTo: "User"
    }));
  });
});
