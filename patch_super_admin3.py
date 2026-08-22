import sys

with open('src/services/firestoreService.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "const userData = snap.data() as SystemUser;" in line:
        indent = line.split("const")[0]
        new_lines.append(indent + "const userData = snap.data() as SystemUser;\n")
        new_lines.append(indent + "let updatedRole = userData.role;\n")
        new_lines.append(indent + "if (isSuperAdminEmail && !elevatedRoles.includes(userData.role)) {\n")
        new_lines.append(indent + "  updatedRole = UserRole.ADMIN;\n")
        new_lines.append(indent + "}\n")
        new_lines.append(indent + "const isUserAdmin = elevatedRoles.includes(updatedRole);\n")
        new_lines.append(indent + "\n")
        new_lines.append(indent + "await setDoc(userRef, { \n")
        new_lines.append(indent + "  lastLogin: serverTimestamp(),\n")
        new_lines.append(indent + "  displayName: firebaseUser.displayName || userData.displayName,\n")
        new_lines.append(indent + "  photoURL: firebaseUser.photoURL || userData.photoURL,\n")
        new_lines.append(indent + "  role: updatedRole,\n")
        new_lines.append(indent + "  isAdmin: isUserAdmin\n")
        new_lines.append(indent + "}, { merge: true });\n")
        new_lines.append(indent + "\n")
        new_lines.append(indent + "userData.role = updatedRole;\n")
        skip = True
        continue
        
    if skip:
        if "}, { merge: true });" in line:
            skip = False
        continue
        
    new_lines.append(line)

with open('src/services/firestoreService.ts', 'w') as f:
    f.writelines(new_lines)
print('Patched super admin successfully!')
