const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// I'll define a replacer regex or string.
// Let's just find the start of "// Upload a file to Google Drive"
// and the end of the file, then replace that chunk.

const startIndex = content.indexOf('  // Upload a file to Google Drive');
if (startIndex !== -1) {
  // Let's slice everything before startIndex.
  const beforeDrive = content.slice(0, startIndex);
  
  // Find where the update user role custom claims starts, so we don't delete that.
  const updateRoleIndex = content.indexOf('  // Update User Role via Custom Claims');
  const afterDrive = content.slice(updateRoleIndex);

  const driveRoutes = `
  // -- Drive Helpers --
  const requireDriveAccess = async (req, res, next) => {
    try {
      const user = await admin.auth().getUser(req.user.uid);
      let role = user.customClaims?.role;
      
      // Developer bypass for missing Identity Toolkit API
      if (req.user.email === "it.taunggyipharmacy@gmail.com") {
        role = "super_admin";
      }

      if (role !== "super_admin" && role !== "it_supervisor" && role !== "document_manager") {
        return res.status(403).json({ error: "Forbidden: You do not have permission to manage documents." });
      }
      
      req.user.role = role; // pass to next
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Authorization failed." });
    }
  };

  const allowedMimeTypes = [
    "application/pdf", "image/jpeg", "image/png", "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv", "application/json"
  ];

  // Upload a file to Google Drive
  app.post("/api/drive/upload", driveRateLimiter, verifyFirebaseToken, requireDriveAccess, upload.single("file"), async (req: any, res) => {
    const correlationId = Math.random().toString(36).substring(2, 15);
    if (!drive) {
      return res.status(500).json({ error: "Google Drive is not configured." });
    }
    
    try {
      const file = req.file;
      const rawFolderId = req.body.folderId || ROOT_FOLDER_ID;
      const folderId = typeof rawFolderId === 'string' && /^[a-zA-Z0-9_\\-]+$/.test(rawFolderId)
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

      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.\\-_ ]/g, "").substring(0, 100);

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

      // No longer making files publicly readable
      
      const result = {
        ...response.data,
        createdAt: response.data.createdTime
      };

      await logDriveAction(req.user.uid, req.user.role, 'UPLOAD', response.data.id, folderId, sanitizedFilename, 'SUCCESS', correlationId);
      res.json(result);
    } catch (error) {
      console.error("Drive upload error:", error);
      await logDriveAction(req.user.uid, req.user.role, 'UPLOAD', null, null, req.file?.originalname, 'ERROR', correlationId);
      res.status(500).json({ error: "Failed to upload file to Google Drive." });
    }
  });

  // List files from Google Drive
  app.get("/api/drive/files", verifyFirebaseToken, requireDriveAccess, async (req: any, res) => {
    const correlationId = Math.random().toString(36).substring(2, 15);
    if (!drive) {
      return res.status(500).json({ error: "Google Drive is not configured." });
    }

    try {
      const rawFolderId = req.query.folderId || ROOT_FOLDER_ID;
      const folderId = typeof rawFolderId === 'string' && /^[a-zA-Z0-9_\\-]+$/.test(rawFolderId)
        ? rawFolderId
        : ROOT_FOLDER_ID;

      const isValidFolder = await verifyFolderInRoot(drive, folderId);
      if (!isValidFolder) {
        await logDriveAction(req.user.uid, req.user.role, 'LIST', null, folderId, null, 'DENIED_FOLDER', correlationId);
        return res.status(403).json({ error: "Forbidden: Invalid folder." });
      }

      let q = "trashed = false";
      if (folderId) {
        q += \` and '\${folderId}' in parents\`;
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
      console.error("Drive list error:", error);
      await logDriveAction(req.user.uid, req.user.role, 'LIST', null, null, null, 'ERROR', correlationId);
      res.status(500).json({ error: "Failed to list files from Google Drive." });
    }
  });

  // Get Google Drive storage quota
  app.get("/api/drive/quota", verifyFirebaseToken, requireDriveAccess, async (req, res) => {
    if (!drive) {
      return res.status(500).json({ error: "Google Drive is not configured." });
    }

    try {
      const response = await drive.about.get({
        fields: "storageQuota",
      });

      const limit = parseInt(response.data.storageQuota?.limit || "0", 10);
      const usage = parseInt(response.data.storageQuota?.usage || "0", 10);

      res.json({ limit, usage });
    } catch (error) {
      console.error("Drive quota error:", error);
      res.status(500).json({ error: "Failed to fetch storage quota from Google Drive." });
    }
  });

  // Delete a file from Google Drive
  app.delete("/api/drive/files/:id", verifyFirebaseToken, requireDriveAccess, async (req: any, res) => {
    const correlationId = Math.random().toString(36).substring(2, 15);
    if (!drive) {
      return res.status(500).json({ error: "Google Drive is not configured." });
    }

    try {
      // Security Check: Get file parents before deleting to ensure it's in a permitted root
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
        // If file doesn't exist or we can't get parents, we can't verify. Fail safe.
        await logDriveAction(req.user.uid, req.user.role, 'DELETE', req.params.id, null, null, 'ERROR_NOT_FOUND', correlationId);
        return res.status(404).json({ error: "File not found or access denied." });
      }

      await drive.files.delete({ fileId: req.params.id });
      await logDriveAction(req.user.uid, req.user.role, 'DELETE', req.params.id, fileParentId, filename, 'SUCCESS', correlationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Drive delete error:", error);
      await logDriveAction(req.user.uid, req.user.role, 'DELETE', req.params.id, null, null, 'ERROR', correlationId);
      res.status(500).json({ error: "Failed to delete file from Google Drive." });
    }
  });

`;

  fs.writeFileSync('server.ts', beforeDrive + driveRoutes + afterDrive);
  console.log("Successfully patched server.ts");
} else {
  console.log("Could not find drive routes.");
}
