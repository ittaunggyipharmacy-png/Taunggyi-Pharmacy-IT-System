const fs = require('fs');

let file = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// Replace getSettings
const oldGetSettings = `export const getSettings = async (): Promise<SystemSettings | null> => {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    return null;
  } catch (error) {
    console.error("Error fetching settings", error);
    return null;
  }
};`;

// Also check single-line/compact formatting if needed
const getSettingsRegex = /export const getSettings = async \(\): Promise<SystemSettings \| null> => \{[\s\S]*?console\.error\("Error fetching settings", error\);[\s\S]*?return null;\s*\}\s*\};/;

if (getSettingsRegex.test(file)) {
  file = file.replace(getSettingsRegex, `export const getSettings = async (): Promise<SystemSettings | null> => {
  try {
    const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    return null;
  } catch (error) {
    console.warn("Settings not yet created or offline, using defaults");
    return null;
  }
};`);
  console.log("Replaced getSettings");
} else {
  console.log("Could not find getSettings regex match");
}

// Replace syncSystemUser
const syncUserRegex = /export const syncSystemUser = async \(firebaseUser: any\) => \{[\s\S]*?console\.error\("Error syncing system user", error\);[\s\S]*?return null;\s*\}\s*\};/;

const newSyncUser = `export const syncSystemUser = async (firebaseUser: any): Promise<SystemUser | null> => {
  if (!firebaseUser) return null;

  const elevatedRoles = [
    UserRole.ADMIN,
    UserRole.ADMIN_CAPS,
    UserRole.IT_SUPERVISOR,
    UserRole.IT_SUPERVISOR_CAPS,
    UserRole.MERCHANDISING_SUPERVISOR,
    UserRole.IT_DIGITAL_MARKETING
  ];

  const isSuperAdminEmail = firebaseUser.email === "it.taunggyipharmacy@gmail.com";
  const fallbackRole = isSuperAdminEmail ? UserRole.ADMIN : UserRole.STAFF;
  const isFallbackAdmin = elevatedRoles.includes(fallbackRole);

  try {
    const userRef = doc(db, USER_COLLECTION, firebaseUser.uid);
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (getErr) {
      console.warn("Could not read user doc from server, using local fallback state");
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
        role: fallbackRole,
        photoURL: firebaseUser.photoURL || "",
        createdAt: new Date(),
        lastLogin: new Date(),
        isAdmin: isFallbackAdmin
      };
    }

    if (!snap.exists()) {
      let isAdminDoc = false;
      try {
        isAdminDoc = await checkAdminStatus(firebaseUser.uid);
      } catch (_) {}

      const initialRole = (isAdminDoc || isSuperAdminEmail) ? UserRole.ADMIN : UserRole.STAFF;
      const isUserAdmin = elevatedRoles.includes(initialRole);

      const newUser: SystemUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
        role: initialRole,
        photoURL: firebaseUser.photoURL || "",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isAdmin: isUserAdmin
      };

      try {
        await setDoc(userRef, newUser, { merge: true });
        if (elevatedRoles.includes(newUser.role)) {
          await setDoc(doc(db, 'admins', firebaseUser.uid), {
            active: true,
            email: firebaseUser.email,
            role: newUser.role,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (writeErr) {
        console.warn("Could not persist new user doc immediately:", writeErr);
      }

      return newUser;
    } else {
      const userData = snap.data() as SystemUser;
      const isUserAdmin = elevatedRoles.includes(userData.role) || isSuperAdminEmail;

      try {
        await setDoc(userRef, {
          lastLogin: serverTimestamp(),
          displayName: firebaseUser.displayName || userData.displayName,
          photoURL: firebaseUser.photoURL || userData.photoURL,
          isAdmin: isUserAdmin
        }, { merge: true });

        if (isUserAdmin) {
          await setDoc(doc(db, 'admins', firebaseUser.uid), {
            active: true,
            email: firebaseUser.email,
            role: userData.role,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (writeErr) {
        console.warn("Could not update user lastLogin immediately:", writeErr);
      }

      return {
        ...userData,
        displayName: firebaseUser.displayName || userData.displayName,
        photoURL: firebaseUser.photoURL || userData.photoURL,
        isAdmin: isUserAdmin
      };
    }
  } catch (error) {
    console.error("Error in syncSystemUser:", error);
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "User",
      role: fallbackRole,
      photoURL: firebaseUser.photoURL || "",
      createdAt: new Date(),
      lastLogin: new Date(),
      isAdmin: isFallbackAdmin
    };
  }
};`;

if (syncUserRegex.test(file)) {
  file = file.replace(syncUserRegex, newSyncUser);
  console.log("Replaced syncSystemUser");
} else {
  console.log("Could not find syncSystemUser regex match");
}

fs.writeFileSync('src/services/firestoreService.ts', file);
console.log("Done writing firestoreService.ts");
