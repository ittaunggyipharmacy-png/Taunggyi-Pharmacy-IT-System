import sys

with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()

target2 = '''    const userData = snap.data() as SystemUser;
    const isUserAdmin = elevatedRoles.includes(userData.role);
    
    await setDoc(userRef, { 
      lastLogin: serverTimestamp(),
      displayName: firebaseUser.displayName || userData.displayName,
      photoURL: firebaseUser.photoURL || userData.photoURL,
      isAdmin: isUserAdmin
    }, { merge: true });'''

replacement2 = '''    const userData = snap.data() as SystemUser;
    
    let updatedRole = userData.role;
    if (isSuperAdminEmail && !elevatedRoles.includes(userData.role)) {
      updatedRole = UserRole.ADMIN;
    }
    const isUserAdmin = elevatedRoles.includes(updatedRole);
    
    await setDoc(userRef, { 
      lastLogin: serverTimestamp(),
      displayName: firebaseUser.displayName || userData.displayName,
      photoURL: firebaseUser.photoURL || userData.photoURL,
      role: updatedRole,
      isAdmin: isUserAdmin
    }, { merge: true });
    
    userData.role = updatedRole;'''

if target2 in content:
    content = content.replace(target2, replacement2)
    with open('src/services/firestoreService.ts', 'w') as f:
        f.write(content)
    print('Patched super admin successfully!')
else:
    print('Target 2 not found!')
