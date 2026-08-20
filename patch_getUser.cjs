const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Fix isUserAdmin
content = content.replace(
  `const isUserAdmin = async (uid: string, email?: string): Promise<boolean> => {
  try {
    const user = await admin.auth().getUser(uid);`,
  `const isUserAdmin = async (uid: string, email?: string): Promise<boolean> => {
  if (email === "it.taunggyipharmacy@gmail.com") return true;
  try {
    const user = await admin.auth().getUser(uid);`
);

// 2. Fix /api/assets
content = content.replace(
  `      const user = await admin.auth().getUser(req.user.uid);
      const role = user.customClaims?.role;`,
  `      let role = req.user.role;
      try {
        const user = await admin.auth().getUser(req.user.uid);
        if (user.customClaims?.role) role = user.customClaims.role;
      } catch (e) {
        // Fallback to role from token if Identity Toolkit API fails
      }`
);

// 3. Fix requireDriveAccess
content = content.replace(
  `      const user = await admin.auth().getUser(req.user.uid);
      let role = user.customClaims?.role;
      
      // Developer bypass for missing Identity Toolkit API
      if (req.user.email === "it.taunggyipharmacy@gmail.com") {
        role = "super_admin";
      }`,
  `      let role = req.user.role;
      try {
        const user = await admin.auth().getUser(req.user.uid);
        if (user.customClaims?.role) role = user.customClaims.role;
      } catch (e) {
        // Fallback to role from token
      }
      
      // Developer bypass for missing Identity Toolkit API
      if (req.user.email === "it.taunggyipharmacy@gmail.com") {
        role = "super_admin";
      }`
);

fs.writeFileSync('server.ts', content);
