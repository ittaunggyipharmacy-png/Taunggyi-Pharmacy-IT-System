const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add express-rate-limit
if (!content.includes('express-rate-limit')) {
  content = content.replace('import cors from "cors";', 'import cors from "cors";\nimport rateLimit from "express-rate-limit";');
}

// 2. Change scopes
content = content.replace(
  'scopes: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]',
  'scopes: ["https://www.googleapis.com/auth/drive.file"]'
);

// 3. Update multer
content = content.replace(
  'const upload = multer({ storage: multer.memoryStorage() });',
  `const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 1
  }
});

const driveRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: { error: "Too many requests. Please try again later." }
});

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Helper to audit log
const logDriveAction = async (actorUid, role, action, fileId, parentFolderId, filename, result, correlationId) => {
  try {
    await admin.firestore().collection('drive_audit_logs').add({
      actorUid,
      role,
      action,
      fileId,
      parentFolderId,
      filename,
      timestamp: new Date().toISOString(),
      result,
      correlationId
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};

// Simple parent verification (only 1 level deep for simplicity)
const verifyFolderInRoot = async (drive, folderId) => {
  if (!ROOT_FOLDER_ID) return true; // If no root configured, bypass
  if (folderId === ROOT_FOLDER_ID) return true;
  try {
    const res = await drive.files.get({ fileId: folderId, fields: 'parents' });
    const parents = res.data.parents || [];
    return parents.includes(ROOT_FOLDER_ID);
  } catch (err) {
    return false;
  }
};
`
);

fs.writeFileSync('server.ts', content);
