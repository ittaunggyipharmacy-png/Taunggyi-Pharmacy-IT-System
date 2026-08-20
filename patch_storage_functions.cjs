const fs = require('fs');
let content = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

content = content.replace(
  'export const fetchStorageFiles = async () => [];',
  `export const fetchStorageFiles = async (folderId?: string) => {
  const authUser = auth.currentUser;
  if (!authUser) return [];
  const token = await authUser.getIdToken();
  const url = folderId ? \`/api/drive/files?folderId=\${folderId}\` : '/api/drive/files';
  const res = await fetch(url, { headers: { Authorization: \`Bearer \${token}\` } });
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
};`
);

content = content.replace(
  'export const fetchStorageQuota = async () => ({ limit: 0, usage: 0 });',
  `export const fetchStorageQuota = async () => {
  const authUser = auth.currentUser;
  if (!authUser) return { limit: 0, usage: 0 };
  const token = await authUser.getIdToken();
  const res = await fetch("/api/drive/quota", { headers: { Authorization: \`Bearer \${token}\` } });
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
};`
);

content = content.replace(
  'export const deleteStorageFile = async (id: string) => {};',
  `export const deleteStorageFile = async (id: string) => {
  const authUser = auth.currentUser;
  if (!authUser) throw new Error("Not authenticated");
  const token = await authUser.getIdToken();
  const res = await fetch(\`/api/drive/files/\${id}\`, { method: 'DELETE', headers: { Authorization: \`Bearer \${token}\` } });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
};`
);

fs.writeFileSync('src/services/firestoreService.ts', content);
