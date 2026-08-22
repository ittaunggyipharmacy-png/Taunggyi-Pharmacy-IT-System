import sys

with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()

target = '''  if (!snap.exists()) {
    // Check if they are in the admins collection to bootstrap
    const isAdminDoc = await checkAdminStatus(uid);
    const initialRole = isAdminDoc ? UserRole.ADMIN : UserRole.STAFF;
    const isUserAdmin = elevatedRoles.includes(initialRole);'''

replacement = '''  const isSuperAdminEmail = firebaseUser.email === "it.taunggyipharmacy@gmail.com";

  if (!snap.exists()) {
    // Check if they are in the admins collection to bootstrap
    const isAdminDoc = await checkAdminStatus(uid);
    const initialRole = (isAdminDoc || isSuperAdminEmail) ? UserRole.ADMIN : UserRole.STAFF;
    const isUserAdmin = elevatedRoles.includes(initialRole);'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/services/firestoreService.ts', 'w') as f:
        f.write(content)
    print('Patched target 1!')
else:
    print('Target 1 not found!')
