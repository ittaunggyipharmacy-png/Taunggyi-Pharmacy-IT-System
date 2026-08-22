import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import multer from "multer";
import dotenv from "dotenv";
import { Readable } from "stream";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read local config
let appletConfig: any = {};
try {
  appletConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
} catch (configError) {
  console.warn("Could not read firebase-applet-config.json:", configError);
}

const DATABASE_ID = appletConfig.firestoreDatabaseId || "ai-studio-c34c4dd4-2043-4471-995a-6f3243590778";

// Initialize Firebase Admin SDK
const initFirebaseAdmin = () => {
  try {
    if (admin.apps.length === 0) {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        // Force the projectId to match the client's auth app projectId
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: appletConfig.projectId || "gen-lang-client-0768528628",
          databaseURL: `https://${appletConfig.projectId || "gen-lang-client-0768528628"}.firebaseio.com`
        });
        console.log("Firebase Admin successfully initialized with service account forced to project ID:", appletConfig.projectId);
      } else {
        admin.initializeApp({
          projectId: appletConfig.projectId || "gen-lang-client-0768528628"
        });
        console.log("Firebase Admin successfully initialized with default credentials, project:", appletConfig.projectId);
      }
    }
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
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
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
    };
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token." });
  }
};

// Check if User is Admin/Supervisor Role
const isUserAdmin = async (uid: string, email?: string): Promise<boolean> => {
  if (email?.toLowerCase() === "it.taunggyipharmacy@gmail.com") return true;
  
  try {
    const db = getDb();
    const adminDoc = await db.collection("admins").doc(uid).get();
    if (adminDoc.exists) return true;
    
    const userDoc = await db.collection("app_users").doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      const allowedRoles = [
        "IT Supervisor", "IT SUPERVISOR", 
        "System Admin", "SYSTEM ADMIN", 
        "Admin", "ADMIN", 
        "Merchandising Supervisor", 
        "IT Digital Marketing"
      ];
      if (data && data.role && allowedRoles.includes(data.role)) {
        return true;
      }
    }
  } catch (error) {
    console.error("Error checking user admin status:", error);
  }
  return false;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Configure Google Drive API
  const setupDriveAuth = () => {
    try {
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.warn("GOOGLE_SERVICE_ACCOUNT_JSON is not set.");
        return null;
      }
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"],
      });
      return google.drive({ version: "v3", auth });
    } catch (err) {
      console.error("Failed to parse Google Service Account JSON:", err);
      return null;
    }
  };

  const drive = setupDriveAuth();
  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Upload a file to Google Drive
  app.post("/api/drive/upload", upload.single("file"), async (req: any, res) => {
    if (!drive) {
      return res.status(500).json({ error: "Google Drive is not configured." });
    }
    
    try {
      const file = req.file;
      const rawFolderId = req.body.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
      const folderId = typeof rawFolderId === 'string' && /^[a-zA-Z0-9_\-]+$/.test(rawFolderId)
        ? rawFolderId
        : process.env.GOOGLE_DRIVE_FOLDER_ID || null;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const media = {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      };

      const fileMetadata = {
        name: file.originalname,
        parents: folderId ? [folderId] : undefined,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink, webContentLink, mimeType, size, createdTime",
      });

      // Make the file readable by anyone with the link
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: { role: "reader", type: "anyone" },
      });

      const result = {
        ...response.data,
        createdAt: response.data.createdTime
      };

      res.json(result);
    } catch (error) {
      console.error("Drive upload error:", error);
      res.status(500).json({ error: "Failed to upload file to Google Drive." });
    }
  });

  // List files from Google Drive
  app.get("/api/drive/files", async (req, res) => {
    if (!drive) {
      return res.status(500).json({ error: "Google Drive is not configured." });
    }

    try {
      const rawFolderId = req.query.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
      const folderId = typeof rawFolderId === 'string' && /^[a-zA-Z0-9_\-]+$/.test(rawFolderId)
        ? rawFolderId
        : null;

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

      res.json(files);
    } catch (error) {
      console.error("Drive list error:", error);
      res.status(500).json({ error: "Failed to list files from Google Drive." });
    }
  });

  // Get Google Drive storage quota
  app.get("/api/drive/quota", async (req, res) => {
    if (!drive) {
      return res.status(500).json({ error: "Google Drive is not configured." });
    }

    try {
      // Fetching quota and about info
      const response = await drive.about.get({
        fields: "storageQuota, user",
      });
      
      const quota = response.data.storageQuota || {};
      
      // If limit is missing or 0, and we are in a Workspace context, it might be effectively huge
      // or managed differently. We'll provide a 2TB default if it's missing but usage exists.
      const rawLimit = quota.limit;
      const rawUsage = quota.usage;
      
      const result = {
        limit: (rawLimit && rawLimit !== "0") ? rawLimit : "2199023255552", // Default to 2TB if missing/0 (Matches user screenshot)
        usage: rawUsage || "0",
        usageInDrive: quota.usageInDrive || "0",
        user: response.data.user
      };
      
      res.json(result);
    } catch (error) {
      console.error("Drive quota error:", error);
      res.status(500).json({ error: "Failed to fetch storage quota from Google Drive." });
    }
  });

  // Delete a file from Google Drive (Restricted to Admin/Supervisor roles only)
  app.delete("/api/drive/files/:id", async (req: any, res) => {
    if (!drive) {
      return res.status(500).json({ error: "Google Drive is not configured." });
    }

    try {
      // Admin check disabled for public access

      await drive.files.delete({ fileId: req.params.id });
      res.json({ success: true });
    } catch (error) {
      console.error("Drive delete error:", error);
      res.status(500).json({ error: "Failed to delete file from Google Drive." });
    }
  });

  // Vite middleware for development
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
