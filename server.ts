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
  validateRenewalRecord,
  validateAccessRequest,
  validateAccessApproval,
  validatePurchaseRequisition,
  calculatePRTotals,
  validatePRApproval,
  validateGoodsReceipt,
  performThreeWayMatch,
  validateSupplier
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
    const role = typeof decodedToken.role === "string" ? decodedToken.role : "none";
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

// Standard role management may assign only non-Super-Admin roles.
// Super Admin bootstrap/recovery must use a separate audited break-glass process.
const ASSIGNABLE_NON_ADMIN_ROLES = new Set([
  "it_supervisor",
  "asset_editor",
  "document_manager",
  "content_manager",
  "staff_viewer",
  "disabled",
]);

type AssignableNonAdminRole =
  | "it_supervisor"
  | "asset_editor"
  | "document_manager"
  | "content_manager"
  | "staff_viewer"
  | "disabled";

function isAssignableNonAdminRole(value: unknown): value is AssignableNonAdminRole {
  return typeof value === "string" && ASSIGNABLE_NON_ADMIN_ROLES.has(value);
}

async function getFreshCustomClaimRole(uid: string): Promise<string> {
  const user = await admin.auth().getUser(uid);
  const role = user.customClaims?.role;
  return typeof role === "string" ? role : "none";
}

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
  // Enterprise IT Access Management Endpoints
  // ----------------------------------------------------

  // Create or update access request
  app.post("/api/access/requests", verifyFirebaseToken, async (req: any, res) => {
    try {
      const payload = req.body;
      const validation = validateAccessRequest(payload);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid access request", details: validation.errors });
      }

      // Security check: must match caller UID unless supervisor creating on behalf
      const isSuper = req.user.role === "super_admin" || req.user.email === "it.taunggyipharmacy@gmail.com";
      if (payload.requesterUid !== req.user.uid && !isSuper && req.user.role !== "it_supervisor") {
        return res.status(403).json({ error: "Forbidden: Cannot submit access request for another user without authorization." });
      }

      const db = getDb();
      const currentYear = new Date().getFullYear();

      const result = await db.runTransaction(async (transaction) => {
        const counterRef = db.collection("counters").doc(`reqCode_${currentYear}`);
        const counterSnap = await transaction.get(counterRef);
        const lastNum = counterSnap.exists ? (counterSnap.data()?.lastNumber || 0) : 0;
        const nextNum = lastNum + 1;
        const reqNumber = `REQ-${currentYear}-${String(nextNum).padStart(3, "0")}`;

        const reqRef = db.collection("access_requests").doc();
        const initialTimeline: any = [{
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorUid: req.user.uid,
          actorName: payload.requesterName || req.user.email,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: "SUBMIT_REQUEST",
          afterValue: { status: payload.status || "Submitted", resource: payload.resourceName, accessLevel: payload.requestedAccessLevel },
          comments: payload.businessReason
        }];

        const initialApprovals: any = [
          {
            stepId: "step-manager",
            stepName: "Line Manager Review",
            requiredRole: "department_manager",
            status: "Pending"
          },
          {
            stepId: "step-it",
            stepName: "IT Technical Review",
            requiredRole: "it_supervisor",
            status: "Pending"
          }
        ];

        if (payload.dataSensitivity === "High" || payload.dataSensitivity === "Restricted" || payload.requestedAccessLevel === "Admin / Privileged") {
          initialApprovals.push({
            stepId: "step-security",
            stepName: "Security Clearance & Super Admin",
            requiredRole: "super_admin",
            status: "Pending"
          });
        }

        const newRequest = {
          ...payload,
          id: reqRef.id,
          requestNumber: reqNumber,
          status: payload.status || "Submitted",
          approvals: initialApprovals,
          auditTimeline: initialTimeline,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        transaction.set(counterRef, { lastNumber: nextNum }, { merge: true });
        transaction.set(reqRef, newRequest);

        // Also record in immutable access audit log
        const auditLogRef = db.collection("access_audit_logs").doc();
        transaction.set(auditLogRef, {
          id: auditLogRef.id,
          requestId: reqRef.id,
          requestNumber: reqNumber,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          actorUid: req.user.uid,
          actorEmail: req.user.email,
          action: "CREATED",
          details: `Access request created for ${payload.resourceName} (${payload.requestedAccessLevel})`
        });

        return { id: reqRef.id, requestNumber: reqNumber };
      });

      res.json({ success: true, ...result });
    } catch (error) {
      redactedLogger.error("Access request creation error", { error: String(error) });
      res.status(500).json({ error: "Failed to create access request." });
    }
  });

  // Action on access request (Approve, Reject, Provision, Revoke)
  app.put("/api/access/requests/:id/action", verifyFirebaseToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { action, comments, secretRef, stepId } = req.body;
      const db = getDb();
      const reqRef = db.collection("access_requests").doc(id);
      const reqSnap = await reqRef.get();

      if (!reqSnap.exists) {
        return res.status(404).json({ error: "Access request not found." });
      }

      const currentData = reqSnap.data() as any;

      // Anti-self-approval enforcement
      const approvalCheck = validateAccessApproval(currentData, req.user.uid, req.user.role, req.user.email);
      if ((action === "APPROVE" || action === "PROVISION") && !approvalCheck.allowed) {
        return res.status(403).json({ error: approvalCheck.reason || "Forbidden: You cannot approve this request." });
      }

      let newStatus = currentData.status;
      const updatedApprovals = [...(currentData.approvals || [])];

      if (action === "APPROVE") {
        if (stepId) {
          const step = updatedApprovals.find((s: any) => s.stepId === stepId);
          if (step) {
            step.status = "Approved";
            step.approverUid = req.user.uid;
            step.approverEmail = req.user.email;
            step.decisionDate = new Date().toISOString();
            step.comments = comments;
          }
        }
        const allApproved = updatedApprovals.every((s: any) => s.status === "Approved" || s.status === "Bypassed");
        newStatus = allApproved ? "Provisioning" : "Pending Approval";
      } else if (action === "REJECT") {
        newStatus = "Rejected";
        if (stepId) {
          const step = updatedApprovals.find((s: any) => s.stepId === stepId);
          if (step) {
            step.status = "Rejected";
            step.approverUid = req.user.uid;
            step.approverEmail = req.user.email;
            step.decisionDate = new Date().toISOString();
            step.comments = comments;
          }
        }
      } else if (action === "PROVISION") {
        if (req.user.role !== "super_admin" && req.user.role !== "it_supervisor") {
          return res.status(403).json({ error: "Only IT Supervisors or Super Admins can provision access." });
        }
        newStatus = "Active";
      } else if (action === "REVOKE") {
        newStatus = "Revoked";
      }

      const timelineEvent = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorUid: req.user.uid,
        actorName: req.user.email,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: action,
        beforeValue: { status: currentData.status },
        afterValue: { status: newStatus },
        comments: comments || "",
        decision: action
      };

      const updatePayload: any = {
        status: newStatus,
        approvals: updatedApprovals,
        auditTimeline: [...(currentData.auditTimeline || []), timelineEvent],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (action === "PROVISION") {
        updatePayload.provisionedByUid = req.user.uid;
        updatePayload.provisionedByName = req.user.email;
        updatePayload.provisionedAt = new Date().toISOString();
        if (secretRef) updatePayload.secretRef = secretRef;
      } else if (action === "REVOKE") {
        updatePayload.revokedByUid = req.user.uid;
        updatePayload.revokedByName = req.user.email;
        updatePayload.revokedAt = new Date().toISOString();
        updatePayload.revocationReason = comments;
      }

      await reqRef.update(updatePayload);

      // Add to immutable audit log collection
      await db.collection("access_audit_logs").add({
        requestId: id,
        requestNumber: currentData.requestNumber,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        actorUid: req.user.uid,
        actorEmail: req.user.email,
        action: action,
        details: `Access request ${currentData.requestNumber} status changed from ${currentData.status} to ${newStatus}`
      });

      res.json({ success: true, status: newStatus });
    } catch (error) {
      redactedLogger.error("Access request action error", { error: String(error) });
      res.status(500).json({ error: "Failed to update access request." });
    }
  });

  // Employee Lifecycle Offboarding: Batch Revocation
  app.post("/api/access/lifecycle/offboard", verifyFirebaseToken, async (req: any, res) => {
    try {
      const isSuper = req.user.role === "super_admin" || req.user.role === "it_supervisor" || req.user.email === "it.taunggyipharmacy@gmail.com";
      if (!isSuper) {
        return res.status(403).json({ error: "Forbidden: Only IT Supervisors can trigger offboarding revocation." });
      }

      const { employeeId, employeeName, notes } = req.body;
      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID is required." });
      }

      const db = getDb();
      // Find all active access requests for employee
      const snap = await db.collection("access_requests")
        .where("requesterUid", "==", employeeId)
        .where("status", "in", ["Active", "Provisioning", "Approved", "Pending Approval"])
        .get();

      const revokedIds: string[] = [];
      const batch = db.batch();

      snap.docs.forEach((doc) => {
        revokedIds.push(doc.id);
        const data = doc.data();
        const timelineEvent = {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorUid: req.user.uid,
          actorName: req.user.email,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: "OFFBOARDING_REVOKE",
          beforeValue: { status: data.status },
          afterValue: { status: "Revoked" },
          comments: `Automatic offboarding revocation: ${notes || "Employee departed"}`
        };

        batch.update(doc.ref, {
          status: "Revoked",
          revokedByUid: req.user.uid,
          revokedByName: req.user.email,
          revokedAt: new Date().toISOString(),
          revocationReason: `Offboarding: ${notes || "Staff departed"}`,
          auditTimeline: [...(data.auditTimeline || []), timelineEvent],
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      // Save lifecycle record
      const lifecycleRef = db.collection("employee_lifecycle").doc();
      batch.set(lifecycleRef, {
        id: lifecycleRef.id,
        employeeId,
        employeeName: employeeName || "Employee",
        type: "Offboarding",
        status: "Completed",
        effectiveDate: new Date().toISOString(),
        revokedAccessRequestIds: revokedIds,
        notes: notes || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();

      res.json({ success: true, revokedCount: revokedIds.length, revokedIds });
    } catch (error) {
      redactedLogger.error("Offboarding error", { error: String(error) });
      res.status(500).json({ error: "Failed to execute offboarding revocation." });
    }
  });

  // ----------------------------------------------------
  // Enterprise Procurement Endpoints (Server Recalculation & PR Workflow)
  // ----------------------------------------------------

  // Create Purchase Requisition (Server recomputes all line totals and grand totals)
  app.post("/api/procurement/requisitions", verifyFirebaseToken, async (req: any, res) => {
    try {
      const payload = req.body;
      const validation = validatePurchaseRequisition(payload);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid purchase requisition", details: validation.errors });
      }

      // Recompute all totals server-side
      const computed = calculatePRTotals(payload.lineItems);
      const db = getDb();
      const currentYear = new Date().getFullYear();

      const result = await db.runTransaction(async (transaction) => {
        const counterRef = db.collection("counters").doc(`prCode_${currentYear}`);
        const counterSnap = await transaction.get(counterRef);
        const lastNum = counterSnap.exists ? (counterSnap.data()?.lastNumber || 0) : 0;
        const nextNum = lastNum + 1;
        const prNumber = `PR-${currentYear}-${String(nextNum).padStart(3, "0")}`;

        const prRef = db.collection("purchase_requisitions").doc();
        const initialTimeline: any = [{
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorUid: req.user.uid,
          actorName: payload.requesterName || req.user.email,
          actorEmail: req.user.email,
          actorRole: req.user.role,
          action: "CREATE_REQUISITION",
          afterValue: { grandTotal: computed.grandTotal, itemCount: computed.lineItems.length },
          comments: payload.businessJustification
        }];

        const finalPR = {
          ...payload,
          id: prRef.id,
          prNumber: prNumber,
          lineItems: computed.lineItems,
          subtotal: computed.subtotal,
          discountTotal: computed.discountTotal,
          taxTotal: computed.taxTotal,
          shippingTotal: computed.shippingTotal,
          grandTotal: computed.grandTotal,
          currency: payload.currency || "MMK",
          status: payload.status || "Submitted",
          approvalHistory: initialTimeline,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        transaction.set(counterRef, { lastNumber: nextNum }, { merge: true });
        transaction.set(prRef, finalPR);

        return { id: prRef.id, prNumber, grandTotal: computed.grandTotal };
      });

      res.json({ success: true, ...result });
    } catch (error) {
      redactedLogger.error("Purchase requisition creation error", { error: String(error) });
      res.status(500).json({ error: "Failed to create purchase requisition." });
    }
  });

  // Review & Approve Purchase Requisition (with Threshold escalation & Budget checking)
  app.put("/api/procurement/requisitions/:id/review", verifyFirebaseToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { action, comments } = req.body;
      const db = getDb();
      const prRef = db.collection("purchase_requisitions").doc(id);
      const prSnap = await prRef.get();

      if (!prSnap.exists) {
        return res.status(404).json({ error: "Purchase requisition not found." });
      }

      const currentPR = prSnap.data() as any;

      // Get Department Budget to verify available headroom
      let budgetData: any = null;
      if (currentPR.department) {
        const currentFiscal = String(new Date().getFullYear());
        const budgetSnap = await db.collection("department_budgets")
          .where("department", "==", currentPR.department)
          .where("fiscalYear", "==", currentFiscal)
          .limit(1)
          .get();
        if (!budgetSnap.empty) {
          budgetData = budgetSnap.docs[0].data();
        }
      }

      // Check approval permissions, thresholds & anti-self-approval
      if (action === "APPROVE") {
        const check = validatePRApproval(currentPR, req.user.uid, req.user.role, req.user.email, budgetData);
        if (!check.allowed) {
          return res.status(403).json({ error: check.reason });
        }
      }

      let nextStatus = currentPR.status;
      if (action === "APPROVE") {
        // If manager approved and > 500k, next is Finance Review; if Finance approved or <= 500k, status is Approved
        if (currentPR.grandTotal > 500000 && currentPR.status === "Submitted" && req.user.role !== "super_admin") {
          nextStatus = "Finance Review";
        } else {
          nextStatus = "Approved";
        }
      } else if (action === "REJECT") {
        nextStatus = "Rejected";
      } else if (action === "RETURN_FOR_REVISION") {
        nextStatus = "Returned for Revision";
      }

      const timelineEvent = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorUid: req.user.uid,
        actorName: req.user.email,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: action,
        beforeValue: { status: currentPR.status },
        afterValue: { status: nextStatus },
        comments: comments || "",
        decision: action
      };

      await prRef.update({
        status: nextStatus,
        approvalHistory: [...(currentPR.approvalHistory || []), timelineEvent],
        rejectionReason: action === "REJECT" ? comments : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // If fully approved, reserve budget in department_budgets
      if (nextStatus === "Approved" && budgetData && budgetData.id) {
        const budgetDocRef = db.collection("department_budgets").doc(budgetData.id);
        const newReserved = (Number(budgetData.reservedBudget) || 0) + Number(currentPR.grandTotal);
        const newRemaining = Math.max(0, (Number(budgetData.totalBudget) || 0) - newReserved - (Number(budgetData.spentBudget) || 0));
        await budgetDocRef.update({
          reservedBudget: newReserved,
          remainingBudget: newRemaining
        });
      }

      res.json({ success: true, status: nextStatus });
    } catch (error) {
      redactedLogger.error("PR review error", { error: String(error) });
      res.status(500).json({ error: "Failed to review purchase requisition." });
    }
  });

  // Issue Purchase Order (PO) from Approved PR
  app.post("/api/procurement/purchase-orders", verifyFirebaseToken, async (req: any, res) => {
    try {
      const isAuthorized = req.user.role === "super_admin" || req.user.role === "it_supervisor" || req.user.role === "asset_editor" || req.user.role === "finance_manager";
      if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: You are not authorized to issue Purchase Orders." });
      }

      const { prId, supplierName, supplierEmail, supplierPhone, expectedDeliveryDate } = req.body;
      const db = getDb();
      const prRef = db.collection("purchase_requisitions").doc(prId);
      const prSnap = await prRef.get();

      if (!prSnap.exists) {
        return res.status(404).json({ error: "Requisition not found." });
      }

      const pr = prSnap.data() as any;
      if (pr.status !== "Approved") {
        return res.status(400).json({ error: `Cannot issue PO for requisition with status '${pr.status}'. Must be 'Approved'.` });
      }

      const currentYear = new Date().getFullYear();
      const result = await db.runTransaction(async (transaction) => {
        const counterRef = db.collection("counters").doc(`poCode_${currentYear}`);
        const counterSnap = await transaction.get(counterRef);
        const lastNum = counterSnap.exists ? (counterSnap.data()?.lastNumber || 0) : 0;
        const nextNum = lastNum + 1;
        const poNumber = `PO-${currentYear}-${String(nextNum).padStart(3, "0")}`;

        const poRef = db.collection("purchase_orders").doc();
        const newPO = {
          id: poRef.id,
          poNumber: poNumber,
          prId: pr.id,
          prNumber: pr.prNumber,
          department: pr.department,
          supplierName: supplierName || pr.preferredSupplier || "Approved Supplier",
          supplierEmail: supplierEmail || "",
          supplierPhone: supplierPhone || "",
          orderDate: new Date().toISOString().split("T")[0],
          expectedDeliveryDate: expectedDeliveryDate || "",
          currency: pr.currency || "MMK",
          lineItems: pr.lineItems,
          subtotal: pr.subtotal,
          discountTotal: pr.discountTotal,
          taxTotal: pr.taxTotal,
          shippingTotal: pr.shippingTotal,
          grandTotal: pr.grandTotal,
          status: "Issued",
          approvalHistory: [{
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorUid: req.user.uid,
            actorName: req.user.email,
            actorEmail: req.user.email,
            actorRole: req.user.role,
            action: "ISSUE_PO",
            comments: `Purchase order ${poNumber} issued for ${pr.prNumber}`
          }],
          supplierCommunicationLog: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        transaction.set(counterRef, { lastNumber: nextNum }, { merge: true });
        transaction.set(poRef, newPO);
        transaction.update(prRef, { 
          status: "PO Issued", 
          poId: poRef.id, 
          poNumber: poNumber, 
          updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        });

        return { id: poRef.id, poNumber };
      });

      res.json({ success: true, ...result });
    } catch (error) {
      redactedLogger.error("PO issue error", { error: String(error) });
      res.status(500).json({ error: "Failed to issue purchase order." });
    }
  });

  // Goods Receipt Note (GRN) with Partial Receipts & Automatic Linked Asset Creation
  app.post("/api/procurement/goods-receipts", verifyFirebaseToken, async (req: any, res) => {
    try {
      const isAuthorized = req.user.role === "super_admin" || req.user.role === "it_supervisor" || req.user.role === "asset_editor";
      if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: You are not authorized to process Goods Receipts." });
      }

      const { poId, receivedItems, createAssets = false, remarks } = req.body;
      const db = getDb();
      const poRef = db.collection("purchase_orders").doc(poId);
      const poSnap = await poRef.get();

      if (!poSnap.exists) {
        return res.status(404).json({ error: "Purchase order not found." });
      }

      const po = poSnap.data() as any;
      const validation = validateGoodsReceipt(po, receivedItems);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid goods receipt payload", details: validation.errors });
      }

      const currentYear = new Date().getFullYear();
      const createdAssetIds: string[] = [];

      const result = await db.runTransaction(async (transaction) => {
        const counterRef = db.collection("counters").doc(`grnCode_${currentYear}`);
        const counterSnap = await transaction.get(counterRef);
        const lastNum = counterSnap.exists ? (counterSnap.data()?.lastNumber || 0) : 0;
        const nextNum = lastNum + 1;
        const grnNumber = `GRN-${currentYear}-${String(nextNum).padStart(3, "0")}`;

        const grnRef = db.collection("goods_receipts").doc();

        // Check if all PO lines are fully received
        let allLinesFullyReceived = true;
        po.lineItems.forEach((poItem: any) => {
          const itemRcpt = receivedItems.find((r: any) => r.poLineItemId === poItem.id || r.item === poItem.item);
          const previouslyReceived = itemRcpt ? Number(itemRcpt.previousReceivedQty) || 0 : 0;
          const newlyReceived = itemRcpt ? Number(itemRcpt.newlyReceivedQty) || 0 : 0;
          if (previouslyReceived + newlyReceived < (Number(poItem.quantity) || 0)) {
            allLinesFullyReceived = false;
          }
        });

        const newGRN = {
          id: grnRef.id,
          grnNumber,
          poId: po.id,
          poNumber: po.poNumber,
          prId: po.prId,
          receivedDate: new Date().toISOString().split("T")[0],
          receivedByUid: req.user.uid,
          receivedByName: req.user.email,
          items: receivedItems,
          isFinalReceipt: allLinesFullyReceived,
          assetsCreated: createAssets,
          remarks: remarks || "",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        transaction.set(counterRef, { lastNumber: nextNum }, { merge: true });
        transaction.set(grnRef, newGRN);

        // Update PO status
        const nextPOStatus = allLinesFullyReceived ? "Fully Received" : "Partially Received";
        transaction.update(poRef, {
          status: nextPOStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update PR status
        if (po.prId) {
          const prDocRef = db.collection("purchase_requisitions").doc(po.prId);
          transaction.update(prDocRef, {
            status: nextPOStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Automatic Hardware Asset creation if requested
        if (createAssets) {
          for (const item of receivedItems) {
            const countToCreate = Math.max(0, Number(item.newlyReceivedQty) || 0);
            const serials = Array.isArray(item.serialNumbers) ? item.serialNumbers : [];

            for (let i = 0; i < countToCreate; i++) {
              const catKey = (item.category || "other").toLowerCase().replace(/\s+/g, "_");
              const assetCounterRef = db.collection("counters").doc(`assetCode_${catKey}`);
              const assetCounterSnap = await transaction.get(assetCounterRef);
              const lastAssetNum = assetCounterSnap.exists ? (assetCounterSnap.data()?.lastNumber || 0) : 0;
              const nextAssetNum = lastAssetNum + 1;

              const getPrefix = (cat: string) => {
                const c = (cat || "").toLowerCase();
                if (c.includes("computer") || c.includes("laptop") || c.includes("desktop")) return "TG-PC-";
                if (c.includes("keyboard")) return "TG-KB-";
                if (c.includes("mouse")) return "TG-MS-";
                if (c.includes("fan")) return "TG-FN-";
                if (c.includes("usb")) return "TG-UB-";
                if (c.includes("printer")) return "TG-PR-";
                if (c.includes("mobile") || c.includes("phone")) return "TG-PH-";
                if (c.includes("scanner")) return "TG-SC-";
                return "TG-ACC-";
              };

              const assetCode = `${getPrefix(item.category || "Computer")}${String(nextAssetNum).padStart(3, "0")}`;
              const assetDocRef = db.collection("it_assets").doc();

              const newAsset = {
                id: assetDocRef.id,
                asset_code: assetCode,
                category: item.category || "Computer",
                model: item.item,
                serialNumber: serials[i] || `SN-PENDING-${Date.now()}-${i + 1}`,
                purchaseDate: new Date().toISOString().split("T")[0],
                location: "Central Storage",
                assignedTo: "Unassigned / In Stock",
                status: "In Stock",
                department: po.department || "IT",
                supplier: po.supplierName,
                purchasePrice: String(item.unitPrice || 0),
                remarks: `Received via ${grnNumber} (PO: ${po.poNumber})`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdByUid: req.user.uid
              };

              transaction.set(assetCounterRef, { lastNumber: nextAssetNum }, { merge: true });
              transaction.set(assetDocRef, newAsset);
              createdAssetIds.push(assetDocRef.id);
            }
          }
        }

        return { grnId: grnRef.id, grnNumber, isFinalReceipt: allLinesFullyReceived, createdAssetsCount: createdAssetIds.length };
      });

      res.json({ success: true, ...result });
    } catch (error) {
      redactedLogger.error("Goods receipt error", { error: String(error) });
      res.status(500).json({ error: "Failed to process goods receipt note." });
    }
  });

  // Three-Way Matching & Invoice Verification Endpoint
  app.post("/api/procurement/invoices/match", verifyFirebaseToken, async (req: any, res) => {
    try {
      const { invoiceNumber, invoiceDate, invoiceAmount, currency = "MMK", poId, tolerancePercent = 0, approvePayment = false } = req.body;
      const db = getDb();
      const poRef = db.collection("purchase_orders").doc(poId);
      const poSnap = await poRef.get();

      if (!poSnap.exists) {
        return res.status(404).json({ error: "Purchase order not found." });
      }

      const po = poSnap.data() as any;

      // Get PR
      let pr = null;
      if (po.prId) {
        const prSnap = await db.collection("purchase_requisitions").doc(po.prId).get();
        if (prSnap.exists) pr = prSnap.data();
      }

      // Get all GRNs for this PO
      const grnSnap = await db.collection("goods_receipts").where("poId", "==", poId).get();
      const grns = grnSnap.docs.map(d => d.data());

      const matchResult = performThreeWayMatch(pr, po, grns, {
        invoiceNumber,
        invoiceAmount: Number(invoiceAmount) || 0,
        currency,
        tolerancePercent: Number(tolerancePercent) || 0
      });

      // Save match record
      const matchRef = db.collection("invoices_and_matches").doc();
      const isPaymentApproved = approvePayment && matchResult.matched;

      const record = {
        id: matchRef.id,
        invoiceNumber,
        invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
        invoiceAmount: Number(invoiceAmount) || 0,
        currency,
        poId: po.id,
        poNumber: po.poNumber,
        grnIds: grns.map((g: any) => g.id),
        prId: po.prId,
        department: po.department,
        lineItemsMatch: matchResult.lineItemsMatch,
        quantityMatch: matchResult.quantityMatch,
        amountMatch: matchResult.amountMatch,
        tolerancePercent: Number(tolerancePercent) || 0,
        matchStatus: matchResult.matched ? "Matched" : "Discrepancy",
        discrepancyDetails: matchResult.discrepancyDetails,
        paymentApproved: isPaymentApproved,
        paymentApprovedBy: isPaymentApproved ? req.user.email : null,
        paymentApprovedAt: isPaymentApproved ? new Date().toISOString() : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await matchRef.set(record);

      // If payment is approved and matched, advance PR status to "Paid"
      if (isPaymentApproved && po.prId) {
        await db.collection("purchase_requisitions").doc(po.prId).update({
          status: "Paid",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.json({
        success: true,
        matchResult,
        paymentApproved: isPaymentApproved,
        recordId: matchRef.id
      });
    } catch (error) {
      redactedLogger.error("Invoice matching error", { error: String(error) });
      res.status(500).json({ error: "Failed to perform 3-way match." });
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
      const { targetUid, newRole } = req.body ?? {};

      if (typeof targetUid !== "string" || targetUid.trim().length === 0) {
        return res.status(400).json({ error: "targetUid is required." });
      }

      if (!isAssignableNonAdminRole(newRole)) {
        return res.status(400).json({
          error: "Invalid role. This endpoint may assign only approved non-Super-Admin roles.",
        });
      }

      // Re-read the actor from Firebase Admin. Do not trust a stale token or UI state
      // when authorizing a privileged operation.
      const actorRole = await getFreshCustomClaimRole(req.user.uid);
      if (actorRole !== "super_admin") {
        return res.status(403).json({
          error: "Forbidden: only a Super Admin can assign roles.",
        });
      }

      // A standard administrator must never alter their own permissions.
      if (targetUid === req.user.uid) {
        return res.status(403).json({
          error: "Forbidden: self-role changes are not allowed.",
        });
      }

      const targetUser = await admin.auth().getUser(targetUid);
      const previousClaims = targetUser.customClaims ?? {};
      const previousRoleValue = (previousClaims as Record<string, unknown>).role;
      const previousRole = typeof previousRoleValue === "string" ? previousRoleValue : "none";

      // Existing Super Admin accounts must be changed only through a separate,
      // audited break-glass/bootstrap workflow.
      if (previousRole === "super_admin") {
        return res.status(403).json({
          error: "Forbidden: Super Admin accounts cannot be modified by this endpoint.",
        });
      }

      const db = getDb();
      const userRef = db.collection("app_users").doc(targetUid);
      const auditRef = db.collection("audit_logs").doc();

      // Preserve unrelated custom claims while replacing role with an allow-listed value.
      await admin.auth().setCustomUserClaims(targetUid, {
        ...previousClaims,
        role: newRole,
      });

      try {
        const batch = db.batch();
        batch.set(
          userRef,
          {
            role: newRole,
            roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            roleUpdatedByUid: req.user.uid,
            roleUpdatedByEmail: req.user.email,
          },
          { merge: true },
        );
        batch.set(auditRef, {
          id: auditRef.id,
          action: "ROLE_CHANGED",
          actorUid: req.user.uid,
          actorEmail: req.user.email,
          targetUid,
          targetEmail: targetUser.email ?? null,
          previousRole,
          newRole,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        await batch.commit();
      } catch (writeError) {
        // Prevent a role change without the corresponding application record and audit event.
        await admin.auth().setCustomUserClaims(targetUid, previousClaims);
        throw writeError;
      }

      return res.status(200).json({
        success: true,
        targetUid,
        previousRole,
        newRole,
        refreshRequired: true,
      });
    } catch (error) {
      redactedLogger.error("Role update error", { error: String(error) });
      return res.status(500).json({ error: "Failed to update user role." });
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
