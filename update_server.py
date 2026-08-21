import sys
with open('server.ts', 'r') as f:
    content = f.read()

# Replace verifyFirebaseToken in endpoints
content = content.replace('app.post("/api/drive/upload", verifyFirebaseToken, upload.single("file")', 'app.post("/api/drive/upload", upload.single("file")')
content = content.replace('app.get("/api/drive/files", verifyFirebaseToken, async', 'app.get("/api/drive/files", async')
content = content.replace('app.get("/api/drive/quota", verifyFirebaseToken, async', 'app.get("/api/drive/quota", async')
content = content.replace('app.delete("/api/drive/files/:id", verifyFirebaseToken, async', 'app.delete("/api/drive/files/:id", async')

# In the delete endpoint, it uses isUserAdmin which uses req.user. Since we removed verifyFirebaseToken, req.user is undefined
# We can just skip the admin check for now to allow public access
target_delete = '''    try {
      const isAdminRole = await isUserAdmin(req.user.uid, req.user.email);
      if (!isAdminRole) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to delete files." });
      }'''
replacement_delete = '''    try {
      // Admin check disabled for public access'''
content = content.replace(target_delete, replacement_delete)

with open('server.ts', 'w') as f:
    f.write(content)
print("Updated server.ts")
