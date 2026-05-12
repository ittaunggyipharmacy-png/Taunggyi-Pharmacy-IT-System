import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (db) return db;
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_JSON is missing. Firestore sync disabled.");
    return null;
  }
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
    }
    db = admin.firestore();
    return db;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return null;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Drive Setup
  const SCOPES = ["https://www.googleapis.com/auth/drive"];
  const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || "1pYOQfBgVaMkSa7uJy8fRLoHLklP4830R";

  function getDriveClient() {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured in environment variables.");
    }
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: SCOPES
      });
      return google.drive({ version: "v3", auth });
    } catch (error: any) {
      throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${error.message}`);
    }
  }

  // API Routes
  app.get("/api/drive/quota", async (req, res) => {
    try {
      const drive = getDriveClient();
      const response = await drive.about.get({
        fields: "storageQuota"
      });
      res.json(response.data.storageQuota);
    } catch (error: any) {
      console.error("Quota Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive/files", async (req, res) => {
    try {
      const folderId = req.query.folderId as string || FOLDER_ID;
      const drive = getDriveClient();
      const response = await drive.files.list({
        // MIME type check for folders: 'application/vnd.google-apps.folder'
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id, name, webViewLink, webContentLink, mimeType, size, createdTime, thumbnailLink, parents)",
        orderBy: "folder,name,createdTime desc",
      });
      res.json(response.data.files);
    } catch (error: any) {
      console.error("Drive Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  async function getOrCreateFolder(drive: any, name: string, parentId: string) {
    const query = `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await drive.files.list({ q: query, fields: "files(id)" });
    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }
    const fileMetadata = {
      name: name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    };
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });
    return folder.data.id;
  }

  const upload = multer({ dest: "uploads/" });
  app.post("/api/drive/upload", upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) throw new Error("No file uploaded");
      const drive = getDriveClient();
      const rootFolderId = req.body.folderId || FOLDER_ID;
      
      // Auto-Routing logic
      const ext = path.extname(req.file.originalname).toLowerCase();
      let categoryFolder = "Other_Assets";
      if (ext === ".mp4" || ext === ".mov") {
        categoryFolder = "TikTok_Videos";
      } else if (ext === ".psd") {
        categoryFolder = "Photoshop_Files";
      } else if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
        categoryFolder = "Viber_Photos";
      }

      // Get or Create Strategy
      const currentLocDate = new Date().toISOString().split("T")[0]; // Array like "2026-05-11"
      const categoryId = await getOrCreateFolder(drive, categoryFolder, rootFolderId);
      const dateFolderId = await getOrCreateFolder(drive, currentLocDate, categoryId);

      const fileMetadata = {
        name: req.file.originalname,
        parents: [dateFolderId],
      };
      
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink, webContentLink, mimeType, size, createdTime",
      });

      // Sync to Firestore 'asset_logs'
      const firestore = getDb();
      if (firestore) {
        await firestore.collection("asset_logs").doc(file.data.id!).set({
          id: file.data.id,
          name: file.data.name,
          webViewLink: file.data.webViewLink,
          webContentLink: file.data.webContentLink,
          mimeType: file.data.mimeType,
          size: file.data.size,
          createdAt: file.data.createdTime,
          category: categoryFolder,
          uploaderString: req.body.userName || "System",
        });
      }

      // Clean up temp file
      fs.unlinkSync(req.file.path);

      res.json(file.data);
    } catch (error: any) {
      console.error("Upload Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/drive/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const drive = getDriveClient();
      
      const response = await drive.files.update({
        fileId: id,
        requestBody: { name },
        fields: "id, name",
      });
      
      // Sync to Firestore
      const firestore = getDb();
      if (firestore) {
        await firestore.collection("drive_files").doc(id).update({ name });
      }
      
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/drive/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const drive = getDriveClient();
      await drive.files.delete({ fileId: id });
      
      // Sync to Firestore
      const firestore = getDb();
      if (firestore) {
        await firestore.collection("drive_files").doc(id).delete();
      }
      
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
