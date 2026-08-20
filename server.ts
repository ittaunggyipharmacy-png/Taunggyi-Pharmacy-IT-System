import rateLimit from "express-rate-limit";
import express from "express";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import multer from "multer";
import dotenv from "dotenv";
import { Readable } from "stream";
import admin from "firebase-admin";
import fs from "fs";
import { 
  validateAsset, 
  validatePurchaseRecord, 
  validateITTicket, 
  validateMeetingMinute, 
  validateRenewalRecord 
} from "./src/schema/validation";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read local config
let appletConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
} catch (configError) {
  console.warn("Could not read firebase-applet-config.json:", configError);
}

const DATABASE_ID = appletConfig.firestoreDatabaseId || "ai-studio-c34c4dd4-2043-4471-995a-6f3243590778";
const PORT = Number(process.env.PORT) || 3000;

// Structured Redacted Logger
const redactedLogger = {
  info: (msg: string, meta?: any) => {
    const cleanMeta = sanitizeMeta(meta);
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, cleanMeta ? JSON.stringify(cleanMeta) : "");
  },
  warn: (msg: string, meta?: any) => {
    const cleanMeta = sanitizeMeta(meta);
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, cleanMeta ? JSON.stringify(cleanMeta) : "");
  },
  error: (msg: string, meta?: any) => {
    const cleanMeta = sanitizeMeta(meta);
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, cleanMeta ? JSON.stringify(cleanMeta) : "");
  }
};

function sanitizeMeta(meta: any): any {
  if (!meta || typeof meta !== "object") return meta;
  const sanitized = { ...meta };
  const sensitiveKeys = ["password", "token", "authorization", "secret", "private_key", "credentials", "client_secret"];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeMeta(sanitized[key]);
    }
  }
  return sanitized;
}

// Initialize Firebase Admin SDK
let firebaseAdminInitialized = false;
const initFirebaseAdmin = () => {
  try {
    if (admin.apps.length === 0) {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: appletConfig.projectId || "gen-lang-client-0768528628",
          databaseURL: `https://${appletConfig.projectId || "gen-lang-client-0768528628"}.firebaseio.com`
        });
        firebaseAdminInitialized = true;
        redactedLogger.info("Firebase Admin initialized with custom service account", { projectId: appletConfig.projectId });
      } else {
        admin.initializeApp({
          projectId: appletConfig.projectId || "gen-lang-client-0768528628"
        });
        firebaseAdminInitialized = true;
        redactedLogger.info("Firebase Admin initialized with application default credentials", { projectId: appletConfig.projectId });
      }
    } else {
      firebaseAdminInitialized = true;
    }
  } catch (error) {
    redactedLogger.error("Firebase Admin initialization failed", { error: String(error) });
  }
};

initFirebaseAdmin();

// Helper to get Firestore database instance with the correct database ID
const getDb = () => {
  return admin.firestore(DATABASE_ID);
};

// Verify Firebase ID Token Middleware
const verifyFirebaseToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing Authorization Bearer token." });
    }
    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken.email_verified) {
       return res.status(403).json({ error: "Forbidden: Email not verified." });
    }
    let role = decodedToken.role || "none";
    if (decodedToken.email === "it.taunggyipharmacy@gmail.com") {
      role = "super_admin";
    }
    if (role === "none" || role === "disabled") {
       return res.status(403).json({ error: "Forbidden: Account pending approval or disabled." });
    }
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
      auth_time: decodedToken.auth_time,
      role: role
    };
    next();
  } catch (error) {
    redactedLogger.warn("Token verification failed", { error: String(error) });
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
  }
};

// Check if User is Admin/Supervisor Role using Custom Claims
const isUserAdmin = async (uid: string, email?: string): Promise<boolean> => {
  if (email === "it.taunggyipharmacy@gmail.com") return true;
  try {
    const user = await admin.auth().getUser(uid);
    const role = user.customClaims?.role;
    return role === "super_admin" || role === "it_supervisor";
  } catch (error) {
    redactedLogger.error("Error checking user admin status", { uid, error: String(error) });
  }
  return false;
};

async function startServer() {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://*.firebaseapp.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com", "https://*.googleapis.com", "https://drive.google.com"],
          connectSrc: [
            "'self'",
            "https://*.googleapis.com",
            "https://*.firebaseio.com",
            "https://*.cloudfunctions.net",
            "https://identitytoolkit.googleapis.com",
            "https://securetoken.googleapis.com",
            "https://firestore.googleapis.com"
          ],
          frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com", "https://drive.google.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );

  // 2. Disable X-Powered-By
  app.disable("x-powered-by");

  // 3. Request & Body size limits
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // 4. API Rate Limiting
  const globalApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // 120 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." }
  });
  app.use("/api/", globalApiLimiter);

  // 5. Health & Readiness Endpoints
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      service: "tp-it-management-system",
      uptime: process.uptime()
    });
  });

  app.get("/api/ready", async (req, res) => {
    try {
      const driveAvailable = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const isReady = firebaseAdminInitialized;
      res.json({
        status: isReady ? "ready" : "degraded",
        firebase: isReady ? "connected" : "uninitialized",
        drive: driveAvailable ? "configured" : "unconfigured",
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(503).json({ status: "unavailable", error: String(err) });
    }
  });

  // Configure Google Drive API
  const setupDriveAuth = () => {
    try {
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        redactedLogger.warn("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");
        return null;
      }
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });
      return google.drive({ version: "v3", auth });
    } catch (err) {
      redactedLogger.error("Failed to initialize Google Drive auth client", { error: String(err) });
      return null;
    }
  };

  const drive = setupDriveAuth();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max file size
      files: 1
    }
  });

  const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // Helper to audit log Drive actions
  const logDriveAction = async (actorUid: string, role: string, action: string, fileId: any, parentFolderId: any, filename: any, result: string, correlationId: string) => {
    try {
      await getDb().collection('drive_audit_logs').add({
        actorUid,
        role,
        action,
        fileId,
        parentFolderId,
        filename,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        result,
        correlationId
      });
    } catch (err) {
      redactedLogger.error("Drive audit log write failed", { error: String(err) });
    }
  };

  // Verify folder is within approved root
  const verifyFolderInRoot = async (driveClient: any, folderId: string) => {
    if (!ROOT_FOLDER_ID) return true; // If no root configured, allow
    if (folderId === ROOT_FOLDER_ID) return true;
    try {
      const res = await driveClient.files.get({ fileId: folderId, fields: 'parents' });
      const parents = res.data.parents || [];
      return parents.includes(ROOT_FOLDER_ID);
    } catch (err) {
      return false;
    }
  };

  const requireDriveAccess = async (req: any, res: any, next: any) => {
    try {
      let role = req.user.role;
      try {
        const user = await admin.auth().getUser(req.user.uid);
        if (user.customClaims?.role) role = user.customClaims.role;
      } catch (e) {}
      
      if (req.user.email === "it.taunggyipharmacy@gmail.com") {
        role = "super_admin";
      }

      if (role !== "super_admin" && role !== "it_supervisor" && role !== "document_manager") {
        return res.status(403).json({ error: "Forbidden: You do not have permission to manage documents." });
      }
      
      req.user.role = role;
      next();
    } catch (err) {
      redactedLogger.error("Drive authorization failed", { error: String(err) });
      res.status(500).json({ error: "Authorization failed." });
    }
  };

  const allowedMimeTypes = [
    "application/pdf", "image/jpeg", "image/png", "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "application/json"
  ];

  // ----------------------------------------------------
  // Drive API Endpoints
  // ----------------------------------------------------

  app.post("/api/drive/upload", verifyFirebaseToken, requireDriveAccess, upload.single("file"), async (req: any, res) => {
    const correlationId = Math.random().toString(36).substring(2, 15);
    if (!drive) {
      return res.status(500).json({ error: "Google Drive service is not configured on this server." });
    }
    
    try {
      const file = req.file;
      const rawFolderId = req.body.folderId || ROOT_FOLDER_ID;
      const folderId = typeof rawFolderId === 'string' && /^[a-zA-Z0-9_\-]+$/.test(rawFolderId)
        ? rawFolderId
        : ROOT_FOLDER_ID;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      if (!allowedMimeTypes.includes(file.mimetype)) {
        await logDriveAction(req.user.uid, req.user.role, 'UPLOAD', null, folderId, file.originalname, 'DENIED_MIMETYPE', correlationId);
        return res.status(400).json({ error: "Unsupported file type." });
      }

      const isValidFolder = await verifyFolderInRoot(drive, folderId);
      if (!isValidFolder) {
        await logDriveAction(req.user.uid, req.user.role, 'UPLOAD', null, folderId, file.originalname, 'DENIED_FOLDER', correlationId);
        return res.status(403).json({ error: "Forbidden: Invalid target folder." });
      }

      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.\-_ ]/g, "").substring(0, 100);

      const media = {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      };

      const fileMetadata = {
        name: sanitizedFilename,
        parents: folderId ? [folderId] : undefined,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink, webContentLink, mimeType, size, createdTime",
      });

      const result = {
        ...response.data,
        createdAt: response.data.createdTime
      };

      await logDriveAction(req.user.uid, req.user.role, 'UPLOAD', response.data.id, folderId, sanitizedFilename, 'SUCCESS', correlationId);
      res.json(result);
    } catch (error) {
      redactedLogger.error("Drive upload failed", { error: String(error) });
      await logDriveAction(req.user.uid, req.user.role, 'UPLOAD', null, null, req.file?.originalname, 'ERROR', correlationId);
      res.status(500).json({ error: "Failed to upload file to Google Drive." });
    }
  });

  app.get("/api/drive/files", verifyFirebaseToken, requireDriveAccess, async (req: any, res) => {
    const correlationId = Math.random().toString(36).substring(2, 15);
    if (!drive) {
      return res.status(500).json({ error: "Google Drive service is not configured on this server." });
    }

    try {
      const rawFolderId = req.query.folderId || ROOT_FOLDER_ID;
      const folderId = typeof rawFolderId === 'string' && /^[a-zA-Z0-9_\-]+$/.test(rawFolderId)
        ? rawFolderId
        : ROOT_FOLDER_ID;

      const isValidFolder = await verifyFolderInRoot(drive, folderId);
      if (!isValidFolder) {
        await logDriveAction(req.user.uid, req.user.role, 'LIST', null, folderId, null, 'DENIED_FOLDER', correlationId);
        return res.status(403).json({ error: "Forbidden: Invalid folder." });
      }

      let q = "trashed = false";
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      }

      const response = await drive.files.list({
        q,
        fields: "files(id, name, webViewLink, webContentLink, mimeType, size, createdTime, owners)",
        orderBy: "createdTime desc",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files?.map(file => ({
        ...file,
        createdAt: file.createdTime
      })) || [];

      await logDriveAction(req.user.uid, req.user.role, 'LIST', null, folderId, null, 'SUCCESS', correlationId);
      res.json(files);
    } catch (error) {
      redactedLogger.error("Drive list error", { error: String(error) });
      await logDriveAction(req.user.uid, req.user.role, 'LIST', null, null, null, 'ERROR', correlationId);
      res.status(500).json({ error: "Failed to list files from Google Drive." });
    }
  });

  app.get("/api/drive/quota", verifyFirebaseToken, requireDriveAccess, async (req, res) => {
    if (!drive) {
      return res.status(500).json({ error: "Google Drive service is not configured." });
    }

    try {
      const response = await drive.about.get({
        fields: "storageQuota",
      });

      const limit = parseInt(response.data.storageQuota?.limit || "0", 10);
      const usage = parseInt(response.data.storageQuota?.usage || "0", 10);

      res.json({ limit, usage });
    } catch (error) {
      redactedLogger.error("Drive quota error", { error: String(error) });
      res.status(500).json({ error: "Failed to fetch storage quota from Google Drive." });
    }
  });

  app.delete("/api/drive/files/:id", verifyFirebaseToken, requireDriveAccess, async (req: any, res) => {
    const correlationId = Math.random().toString(36).substring(2, 15);
    if (!drive) {
      return res.status(500).json({ error: "Google Drive service is not configured." });
    }

    try {
      let fileParentId = null;
      let filename = null;
      try {
        const fileRes = await drive.files.get({ fileId: req.params.id, fields: 'parents, name' });
        fileParentId = fileRes.data.parents?.[0] || null;
        filename = fileRes.data.name;
        const isValidFolder = await verifyFolderInRoot(drive, fileParentId);
        if (!isValidFolder) {
          await logDriveAction(req.user.uid, req.user.role, 'DELETE', req.params.id, fileParentId, filename, 'DENIED_FOLDER', correlationId);
          return res.status(403).json({ error: "Forbidden: Cannot delete file outside approved root." });
        }
      } catch (err) {
        await logDriveAction(req.user.uid, req.user.role, 'DELETE', req.params.id, null, null, 'ERROR_NOT_FOUND', correlationId);
        return res.status(404).json({ error: "File not found or access denied." });
      }

      await drive.files.delete({ fileId: req.params.id });
      await logDriveAction(req.user.uid, req.user.role, 'DELETE', req.params.id, fileParentId, filename, 'SUCCESS', correlationId);
      res.json({ success: true });
    } catch (error) {
      redactedLogger.error("Drive delete error", { error: String(error) });
      await logDriveAction(req.user.uid, req.user.role, 'DELETE', req.params.id, null, null, 'ERROR', correlationId);
      res.status(500).json({ error: "Failed to delete file from Google Drive." });
    }
  });

  // ----------------------------------------------------
  // Assets Creation Endpoint with Server Counter
  // ----------------------------------------------------

  app.post("/api/assets", verifyFirebaseToken, async (req: any, res) => {
    try {
      let role = req.user.role;
      try {
        const user = await admin.auth().getUser(req.user.uid);
        if (user.customClaims?.role) role = user.customClaims.role;
      } catch (e) {}
      if (req.user.email === "it.taunggyipharmacy@gmail.com") {
        role = "super_admin";
      }

      if (role !== "super_admin" && role !== "it_supervisor" && role !== "asset_editor") {
        return res.status(403).json({ error: "Forbidden: You do not have permission to create assets." });
      }

      const asset = req.body;
      const validation = validateAsset(asset);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid asset payload", details: validation.errors });
      }

      const db = getDb();
      const categoryKey = (asset.category || "other").toLowerCase().replace(/\s+/g, "_");
      const getPrefix = (cat: string) => {
        const c = (cat || "").toLowerCase();
        if (c === "computer") return "TG-PC-";
        if (c === "keyboard") return "TG-KB-";
        if (c === "mouse") return "TG-MS-";
        if (c === "fan") return "TG-FN-";
        if (c === "usb hub" || c === "usb") return "TG-UB-";
        if (c === "printer") return "TG-PR-";
        if (c === "phone" || c === "mobile") return "TG-PH-";
        if (c === "scanner") return "TG-SC-";
        return "TG-ACC-";
      };

      const assetId = await db.runTransaction(async (transaction) => {
        const counterRef = db.collection("counters").doc(`assetCode_${categoryKey}`);
        const counterSnap = await transaction.get(counterRef);
        
        let lastNumber = 0;
        if (counterSnap.exists) {
          lastNumber = counterSnap.data()?.lastNumber || 0;
        }
        
        const nextNumber = lastNumber + 1;
        const prefix = getPrefix(asset.category);
        const code = `${prefix}${String(nextNumber).padStart(3, "0")}`;
        
        const assetRef = db.collection("it_assets").doc();
        const finalAsset = {
          ...asset,
          id: assetRef.id,
          asset_code: code,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdByUid: req.user.uid
        };
        
        transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
        transaction.set(assetRef, finalAsset);
        
        return assetRef.id;
      });
      
      res.json({ success: true, assetId });
    } catch (error) {
      redactedLogger.error("Asset creation transaction error", { error: String(error) });
      res.status(500).json({ error: "Failed to create asset." });
    }
  });

  // ----------------------------------------------------
  // Server-Side Versioned Administrative Migration Jobs
  // ----------------------------------------------------

  app.post("/api/admin/migrations/run", verifyFirebaseToken, async (req: any, res) => {
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
        return res.status(403).json({ error: "Forbidden: Super Admin authorization required for migration jobs." });
      }

      const { jobName, version = "1.0.0", dryRun = false, idempotencyKey, payload } = req.body;
      if (!jobName || !idempotencyKey) {
        return res.status(400).json({ error: "Bad Request: Missing jobName or idempotencyKey." });
      }

      const db = getDb();
      const ledgerRef = db.collection("migration_ledger").doc(`${jobName}_${idempotencyKey}`);
      const ledgerSnap = await ledgerRef.get();

      if (ledgerSnap.exists && !dryRun) {
        const existingJob = ledgerSnap.data();
        if (existingJob?.status === "COMPLETED") {
          return res.json({ 
            success: true, 
            message: "Job already executed (idempotency key matched).", 
            job: existingJob 
          });
        }
      }

      const results: { total: number; succeeded: number; failed: number; errors: any[] } = {
        total: 0,
        succeeded: 0,
        failed: 0,
        errors: []
      };

      // Job implementations
      if (jobName === "STANDARDIZE_ASSET_CODES") {
        const snapshot = await db.collection("it_assets").get();
        results.total = snapshot.size;
        
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (!data.category || !data.model) {
            results.failed++;
            results.errors.push({ id: doc.id, error: "Missing required category or model" });
            continue;
          }

          if (!dryRun) {
            batch.update(doc.ref, {
              status: data.status || "Active",
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            batchCount++;

            if (batchCount >= 400) {
              await batch.commit();
              batch = db.batch();
              batchCount = 0;
            }
          }
          results.succeeded++;
        }

        if (!dryRun && batchCount > 0) {
          await batch.commit();
        }
      } else if (jobName === "IMPORT_PREDEFINED_KEYBOARDS") {
        const keyboardItems = payload?.items || [];
        results.total = keyboardItems.length;

        let batch = db.batch();
        let batchCount = 0;

        for (let i = 0; i < keyboardItems.length; i++) {
          const item = keyboardItems[i];
          const validation = validateAsset({ ...item, category: "Keyboard" });
          if (!validation.valid) {
            results.failed++;
            results.errors.push({ index: i, errors: validation.errors });
            continue;
          }

          if (!dryRun) {
            const docRef = db.collection("it_assets").doc();
            batch.set(docRef, {
              ...item,
              id: docRef.id,
              category: "Keyboard",
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            batchCount++;

            if (batchCount >= 400) {
              await batch.commit();
              batch = db.batch();
              batchCount = 0;
            }
          }
          results.succeeded++;
        }

        if (!dryRun && batchCount > 0) {
          await batch.commit();
        }
      } else {
        return res.status(400).json({ error: `Unknown migration job: ${jobName}` });
      }

      // Record to migration ledger
      if (!dryRun) {
        await ledgerRef.set({
          jobName,
          version,
          idempotencyKey,
          status: "COMPLETED",
          actorUid: req.user.uid,
          actorEmail: req.user.email,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          stats: results
        });
      }

      res.json({
        success: true,
        dryRun,
        jobName,
        version,
        results
      });
    } catch (error) {
      redactedLogger.error("Migration job execution error", { error: String(error) });
      res.status(500).json({ error: "Failed to execute migration job." });
    }
  });

  // ----------------------------------------------------
  // Server-Side Resumable Batch Excel Import
  // ----------------------------------------------------

  app.post("/api/admin/import/excel", verifyFirebaseToken, async (req: any, res) => {
    try {
      let role = req.user.role;
      try {
        const user = await admin.auth().getUser(req.user.uid);
        if (user.customClaims?.role) role = user.customClaims.role;
      } catch (e) {}
      if (req.user.email === "it.taunggyipharmacy@gmail.com") {
        role = "super_admin";
      }

      if (role !== "super_admin" && role !== "it_supervisor" && role !== "asset_editor") {
        return res.status(403).json({ error: "Forbidden: Insufficient privileges for batch import." });
      }

      const { sessionId, batchIndex = 0, records = [], targetCollection = "it_assets" } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: "Invalid payload: records array required." });
      }

      if (records.length > 400) {
        return res.status(400).json({ error: "Batch size limit exceeded (max 400 per write batch)." });
      }

      const db = getDb();
      const results: { index: number; status: "ok" | "error"; id?: string; message?: string }[] = [];
      const batch = db.batch();
      let writeCount = 0;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        let validation = { valid: true, errors: [] as string[] };

        if (targetCollection === "it_assets") {
          validation = validateAsset(record);
        } else if (targetCollection === "purchase_records") {
          validation = validatePurchaseRecord(record);
        } else if (targetCollection === "it_tickets") {
          validation = validateITTicket(record);
        }

        if (!validation.valid) {
          results.push({ index: i, status: "error", message: validation.errors.join("; ") });
          continue;
        }

        // Deduplication & Safe Write
        const docRef = record.id ? db.collection(targetCollection).doc(record.id) : db.collection(targetCollection).doc();
        batch.set(docRef, {
          ...record,
          id: docRef.id,
          importedAt: admin.firestore.FieldValue.serverTimestamp(),
          importedBy: req.user.uid,
          sessionId: sessionId || "manual"
        }, { merge: true });

        writeCount++;
        results.push({ index: i, status: "ok", id: docRef.id });
      }

      if (writeCount > 0) {
        await batch.commit();
      }

      res.json({
        success: true,
        sessionId,
        batchIndex,
        processed: records.length,
        written: writeCount,
        results
      });
    } catch (error) {
      redactedLogger.error("Batch Excel import error", { error: String(error) });
      res.status(500).json({ error: "Failed to process batch import." });
    }
  });

  // ----------------------------------------------------
  // Super Admin Wipe Database (Soft-Delete)
  // ----------------------------------------------------

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

      const authTime = new Date(req.user.auth_time * 1000);
      const now = new Date();
      if (now.getTime() - authTime.getTime() > 5 * 60 * 1000) {
        return res.status(403).json({ error: "Forbidden: Recent login required. Please re-authenticate." });
      }

      if (req.body.confirmation !== "CONFIRM_WIPE") {
         return res.status(400).json({ error: "Bad Request: Missing exact confirmation string." });
      }
      
      if (!req.body.backupVerified) {
         return res.status(400).json({ error: "Bad Request: Backup verification required." });
      }

      const db = getDb();
      const assetsRef = db.collection("it_assets");
      const snapshot = await assetsRef.where("status", "!=", "Disposed").get();
      
      let batch = db.batch();
      let count = 0;
      for (const doc of snapshot.docs) {
        batch.update(doc.ref, { 
          status: 'Disposed', 
          disposedReason: 'System Wipe',
          deletedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }

      await db.collection("audit_logs").add({
        action: "DATABASE_WIPE",
        actorUid: req.user.uid,
        actorEmail: req.user.email,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: `Soft-deleted ${snapshot.size} active assets.`
      });

      res.json({ success: true, message: "Database soft-wipe completed successfully." });
    } catch (err) {
      redactedLogger.error("Error during database wipe", { error: String(err) });
      res.status(500).json({ error: "Internal Server Error during wipe." });
    }
  });

  // ----------------------------------------------------
  // Update User Role via Custom Claims
  // ----------------------------------------------------

  app.post("/api/admin/roles", verifyFirebaseToken, async (req: any, res) => {
    try {
      const isAdminRole = await isUserAdmin(req.user.uid, req.user.email);
      if (!isAdminRole) {
        return res.status(403).json({ error: "Forbidden: Only admins can assign roles." });
      }
      
      const { targetUid, newRole } = req.body;
      if (!targetUid || !newRole) {
         return res.status(400).json({ error: "Missing targetUid or newRole." });
      }
      
      await admin.auth().setCustomUserClaims(targetUid, { role: newRole });
      await getDb().collection("app_users").doc(targetUid).set({ role: newRole }, { merge: true });
      
      res.json({ success: true });
    } catch (error) {
      redactedLogger.error("Role update error", { error: String(error) });
      res.status(500).json({ error: "Failed to update user role." });
    }
  });

  // 6. Vite middleware for development vs Static Serving in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 7. Global Unhandled Error Middleware
  app.use((err: any, req: any, res: any, next: any) => {
    redactedLogger.error("Unhandled server error", { 
      message: err.message, 
      stack: err.stack,
      url: req.originalUrl 
    });
    res.status(err.status || 500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "production" ? "An unexpected error occurred." : err.message
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    redactedLogger.info(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
