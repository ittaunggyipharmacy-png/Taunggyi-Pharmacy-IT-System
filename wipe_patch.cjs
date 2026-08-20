const fs = require('fs');

// --- 1. PATCH FIRESTORE RULES ---
let rules = fs.readFileSync('firestore.rules', 'utf8');
rules = rules.replace(/\s*\/\/ Password Vault.*?match \/password_vault\/\{entryId\} \{\s*allow read, write: if isSupervisor\(\);\s*\}/s, '');
fs.writeFileSync('firestore.rules', rules);

// --- 2. PATCH TYPES ---
let types = fs.readFileSync('src/types.ts', 'utf8');
types = types.replace(/\nexport interface PasswordVaultEntry \{[\s\S]*?\n\}/s, '');
fs.writeFileSync('src/types.ts', types);

// --- 3. PATCH FIRESTORE SERVICE ---
let fss = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
fss = fss.replace(/PasswordVaultEntry,\s*/g, '');
fss = fss.replace(/const PASSWORD_VAULT_COLLECTION = 'password_vault';\n/, '');
fss = fss.replace(/export const savePasswordEntry = async \(entry: PasswordVaultEntry\) => \{[\s\S]*?^};\n/m, '');
fss = fss.replace(/export const getPasswordEntries = async \(\): Promise<PasswordVaultEntry\[\]> => \{[\s\S]*?^};\n/m, '');
fss = fss.replace(/export const deletePasswordEntry = async \(id: string\) => \{[\s\S]*?^};\n/m, '');
fss = fss.replace(/export const clearAllAssets = async \(\) => \{[\s\S]*?\};\n/m, '');
fs.writeFileSync('src/services/firestoreService.ts', fss);

// --- 4. PATCH APP.TSX ---
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/import \{ ResetAssetsButton \} from "\.\/components\/ResetAssetsButton";\n/, '');
app = app.replace(/,\s*savePasswordEntry,\s*getPasswordEntries,\s*deletePasswordEntry/, '');

// States
app = app.replace(/  const \[newPassLabel, setNewPassLabel\] = useState\(""\);\n/, '');
app = app.replace(/  const \[newPassAccount, setNewPassAccount\] = useState\(""\);\n/, '');
app = app.replace(/  const \[newPassVal, setNewPassVal\] = useState\(""\);\n/, '');
app = app.replace(/  const \[passwordEntries, setPasswordEntries\] = useState<PasswordVaultEntry\[\]>\(\[\]\);\n/, '');
app = app.replace(/  const \[editingPasswordNote, setEditingPasswordNote\] = useState<any \| null>\(null\);\n/, '');

// Remove Password migration logic in useEffect
app = app.replace(/\s*useEffect\(\(\) => \{\s*if \(isAdmin\) \{\s*const loadAndMigratePasswords.*?loadAndMigratePasswords\(\);\s*\}\s*\}, \[isAdmin, settings, setSettings\]\);/s, '');

// Remove addPasswordNote
app = app.replace(/\s*const addPasswordNote = async \(\) => \{[\s\S]*?setNewPassVal\(""\);\n\s*};\n/s, '');

// Remove UI Blocks
app = app.replace(/\s*\{\/\* Password Notes Section \*\/\}.*?\{\/\* Branch Notes Section \*\/\}/s, '\n            {/* Branch Notes Section */}');
app = app.replace(/\s*\{\/\* RESET DATABASE TOOL \*\/\}.*?isCompact=\{true\} \/>\n\s*<\/div>\n\s*\)}/s, '');

fs.writeFileSync('src/App.tsx', app);

// --- 5. DELETE RESET ASSETS BUTTON COMPONENT ---
if (fs.existsSync('src/components/ResetAssetsButton.tsx')) {
    fs.unlinkSync('src/components/ResetAssetsButton.tsx');
}

// --- 6. PATCH SERVER.TS ---
let server = fs.readFileSync('server.ts', 'utf8');

// Include auth_time
server = server.replace(
  /req\.user = \{\s*uid: decodedToken\.uid,\s*email: decodedToken\.email,\s*email_verified: decodedToken\.email_verified,\s*role: role\s*\};/,
  `req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      auth_time: decodedToken.auth_time,
      role: role
    };`
);

// Add the wipe-database endpoint
const wipeEndpoint = `
  // Wipe Database Soft-Delete Endpoint
  app.post("/api/admin/wipe-database", verifyFirebaseToken, async (req: any, res) => {
    try {
      let role = req.user.role;
      try {
        const user = await admin.auth().getUser(req.user.uid);
        if (user.customClaims?.role) role = user.customClaims.role;
      } catch (e) {}
      if (req.user.email === "it.taunggyipharmacy@gmail.com") {
        role = "super_admin";
      }

      if (role !== "super_admin") {
         return res.status(403).json({ error: "Forbidden: Super Admin required." });
      }

      // Require recent login (within 5 minutes)
      const authTime = new Date(req.user.auth_time * 1000);
      const now = new Date();
      if (now.getTime() - authTime.getTime() > 5 * 60 * 1000) {
        return res.status(403).json({ error: "Forbidden: Recent login required. Please re-authenticate." });
      }

      // Exact typed confirmation
      if (req.body.confirmation !== "CONFIRM_WIPE") {
         return res.status(400).json({ error: "Bad Request: Missing exact confirmation string." });
      }
      
      if (!req.body.backupVerified) {
         return res.status(400).json({ error: "Bad Request: Backup verification required." });
      }

      // Soft delete strategy
      const db = getDb();
      const assetsRef = db.collection("it_assets");
      const snapshot = await assetsRef.where("status", "!=", "Disposed").get();
      
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { 
          status: 'Disposed', 
          disposedReason: 'System Wipe',
          deletedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
      });
      await batch.commit();

      // Immutable audit log
      await db.collection("audit_logs").add({
        action: "DATABASE_WIPE",
        actorUid: req.user.uid,
        actorEmail: req.user.email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: \`Soft-deleted \${snapshot.size} active assets.\`
      });

      res.json({ success: true, message: "Database soft-wipe completed successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error during wipe." });
    }
  });
`;

const updateRoleIndex = server.indexOf('  // Update User Role via Custom Claims');
server = server.slice(0, updateRoleIndex) + wipeEndpoint + server.slice(updateRoleIndex);

fs.writeFileSync('server.ts', server);
