import express from "express";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import { Readable } from "stream";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();


async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // Configure Google Drive API
  const setupDriveAuth = async () => {
    try {
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.warn("GOOGLE_SERVICE_ACCOUNT_JSON is not set.");
        return null;
      }
      const { google } = await import("googleapis");
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

  const drive = await setupDriveAuth();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
  const rootFolder = process.env.GOOGLE_DRIVE_FOLDER_ID;
  app.use(['/api/drive', '/api/vault'], async (req, res, next) => {
    try {
      const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      if (!token) return res.status(401).json({ error: 'Sign in required.' });
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key || (req.baseUrl === '/api/drive' && !rootFolder)) return res.status(503).json({ error: 'File service is not configured.' });
      const client = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return res.status(401).json({ error: 'Invalid session.' });
      const { data: profile, error: profileError } = await client.from('app_users').select('role').eq('uid', data.user.id).single();
      if (profileError || !profile || !['system admin', 'it supervisor'].includes(profile.role.toLowerCase())) return res.status(403).json({ error: 'IT administrator access required.' });
      res.locals.actor = data.user.id;
      next();
    } catch { res.status(503).json({ error: 'Unable to verify access.' }); }
  });
  const inRoot = async (id: string): Promise<boolean> => {
    if (!drive || !rootFolder || !/^[a-zA-Z0-9_-]+$/.test(id)) return false;
    const visited = new Set<string>();
    while (id !== rootFolder) {
      if (visited.has(id) || visited.size >= 32) return false;
      visited.add(id);
      const { data } = await drive.files.get({ fileId: id, fields: 'parents,trashed', supportsAllDrives: true });
      if (data.trashed || !data.parents?.length) return false;
      id = data.parents[0];
    }
    return true;
  };

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

      if (!folderId || !await inRoot(folderId)) return res.status(403).json({ error: 'Folder is outside the managed drive.' });
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

      if (!folderId || !await inRoot(folderId)) return res.status(403).json({ error: 'Folder is outside the managed drive.' });
      let q = "trashed = false";
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      }
      
      console.log(`Fetching files for query: ${q}`);

      const files: any[] = [];
      let pageToken: string | undefined;
      do {
        const response = await drive.files.list({ q, pageSize: 100, pageToken, fields: 'nextPageToken,files(id,name,webViewLink,webContentLink,mimeType,size,createdTime)', orderBy: 'createdTime desc', supportsAllDrives: true, includeItemsFromAllDrives: true });
        files.push(...(response.data.files || []).map(file => ({ ...file, createdAt: file.createdTime })));
        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);
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
        limit: (rawLimit && rawLimit !== "0") ? rawLimit : "0", // Default to 2TB if missing/0 (Matches user screenshot)
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
      if (req.params.id === rootFolder || !await inRoot(req.params.id)) return res.status(403).json({ error: 'File is outside the managed drive.' });

      await drive.files.update({ fileId: req.params.id, requestBody: { trashed: true }, supportsAllDrives: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Drive delete error:", error);
      res.status(500).json({ error: "Failed to delete file from Google Drive." });
    }
  });

  app.patch('/api/drive/files/:id', async (req, res) => {
    try {
      if (!drive) return res.status(503).json({ error: 'Drive unavailable.' });
      if (req.params.id === rootFolder || !await inRoot(req.params.id)) return res.status(403).json({ error: 'File outside managed drive.' });
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name || name.length > 255) return res.status(400).json({ error: 'Enter a name of 1–255 characters.' });
      await drive.files.update({ fileId: req.params.id, requestBody: { name }, supportsAllDrives: true });
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Rename failed.' }); }
  });
  app.use('/api/drive', (err: any, _req: any, res: any, _next: any) => {
    res.status(err instanceof multer.MulterError ? 413 : 500).json({ error: err instanceof multer.MulterError ? 'Upload limit is 25 MB, one file.' : 'File operation failed.' });
  });
  const vaultClient = process.env.SUPABASE_SERVICE_ROLE_KEY && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    ? createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
  const vaultKey = process.env.VAULT_ENCRYPTION_KEY ? Buffer.from(process.env.VAULT_ENCRYPTION_KEY, 'base64') : null;
  const encrypt = (value: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', vaultKey!, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
  };
  const attempts = new Map<string, { count: number; until: number }>();
  app.post('/api/auth/login', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const key = req.ip || 'unknown';
    const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    attempts.set(key, attempt);
    if (++attempt.count > 10) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    try {
      if (!vaultClient) return res.status(503).json({ error: 'Credential login is not configured.' });
      const { identifier, password } = req.body;
      if (typeof identifier !== 'string' || typeof password !== 'string' || identifier.length > 254 || password.length > 4096) return res.status(400).json({ error: 'Invalid credentials.' });
      const { data: profile } = await vaultClient.from('app_users').select('email').ilike('username', identifier.trim().replace(/[\\%_]/g, '\\$&')).maybeSingle();
      const client = createClient((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)!, (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)!, { auth: { persistSession: false } });
      const { data, error } = await client.auth.signInWithPassword({ email: profile?.email || 'invalid@example.invalid', password });
      if (error || !data.session) return res.status(401).json({ error: 'Invalid credentials.' });
      attempts.delete(key);
      res.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    } catch { res.status(401).json({ error: 'Invalid credentials.' }); }
  });
  app.use('/api/vault', (_req, res, next) => {
    if (!vaultClient || vaultKey?.length !== 32) return res.status(503).json({ error: 'Configure the server vault key and service credentials first.' });
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/vault', async (_req, res) => {
    const { data, error } = await vaultClient!.from('password_vault').select('id,label,account,branch,updated_at');
    if (error) return res.status(500).json({ error: 'Could not load vault.' });
    res.json(data);
  });
  app.post('/api/vault/:id/reveal', async (req, res) => {
    try {
      const { data, error } = await vaultClient!.from('password_vault').select('value').eq('id', req.params.id).single();
      if (error) return res.status(404).json({ error: 'Entry not found.' });
      const { error: auditError } = await vaultClient!.from('audit_events').insert({ actor: res.locals.actor, table_name: 'password_vault', operation: 'REVEAL', row_id: req.params.id });
      if (auditError) throw auditError;
      let value = data.value || '';
      if (value.startsWith('v1:')) {
        const [, iv, tag, ciphertext] = value.split(':');
        const decipher = createDecipheriv('aes-256-gcm', vaultKey!, Buffer.from(iv, 'base64'));
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        value = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
      } else {
        const { error } = await vaultClient!.from('password_vault').update({ value: encrypt(value) }).eq('id', req.params.id);
        if (error) throw error;
      }
      res.json({ value });
    } catch { res.status(500).json({ error: 'Unable to reveal credential.' }); }
  });
  app.put('/api/vault/:id', async (req, res) => {
    try {
      const { label, account, password, branch } = req.body;
      if (typeof label !== 'string' || typeof account !== 'string' || typeof password !== 'string' || !password || password.length > 4096) return res.status(400).json({ error: 'Label, account and password are required.' });
      const { error } = await vaultClient!.rpc('server_save_credential', { record: { id: req.params.id, label, account, branch, value: encrypt(password) }, actor: res.locals.actor });
      if (error) throw error;
      res.json({ id: req.params.id });
    } catch { res.status(500).json({ error: 'Could not save credential.' }); }
  });
  app.delete('/api/vault/:id', async (req, res) => {
    const { error } = await vaultClient!.rpc('server_delete_credential', { entry_id: req.params.id, actor: res.locals.actor });
    if (error) return res.status(500).json({ error: 'Could not delete credential.' });
    res.json({ success: true });
  });
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
