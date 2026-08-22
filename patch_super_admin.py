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
    
target2 = '''    const isUserAdmin = elevatedRoles.includes(userData.role);
    
    await setDoc(userRef, { 
      lastLogin: serverTimestamp(),
      displayName: firebaseUser.displayName || userData.displayName,
      photoURL: firebaseUser.photoURL || userData.photoURL,
      email: firebaseUser.email || userData.email,
      isAdmin: isUserAdmin
    }, { merge: true });'''

replacement2 = '''    let updatedRole = userData.role;
    if (isSuperAdminEmail && !elevatedRoles.includes(userData.role)) {
      updatedRole = UserRole.ADMIN;
    }
    const isUserAdmin = elevatedRoles.includes(updatedRole);
    
    await setDoc(userRef, { 
      lastLogin: serverTimestamp(),
      displayName: firebaseUser.displayName || userData.displayName,
      photoURL: firebaseUser.photoURL || userData.photoURL,
      email: firebaseUser.email || userData.email,
      role: updatedRole,
      isAdmin: isUserAdmin
    }, { merge: true });
    
    // Also ensure userData reflects the updated role for the admin sync below
    userData.role = updatedRole;'''

if target2 in content:
    content = content.replace(target2, replacement2)
    with open('src/services/firestoreService.ts', 'w') as f:
        f.write(content)
    print('Patched super admin successfully!')
else:
    print('Target 2 not found!')
