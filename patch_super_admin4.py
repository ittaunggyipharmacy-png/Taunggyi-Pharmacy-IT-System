import sys

with open('src/services/firestoreService.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "if (!snap.exists()) {" in line:
        indent = line.split("if")[0]
        new_lines.append(indent + 'const isSuperAdminEmail = firebaseUser.email === "it.taunggyipharmacy@gmail.com";\n\n')
        new_lines.append(line)
    elif "const initialRole = isAdminDoc ? UserRole.ADMIN : UserRole.STAFF;" in line:
        indent = line.split("const")[0]
        new_lines.append(indent + "const initialRole = (isAdminDoc || isSuperAdminEmail) ? UserRole.ADMIN : UserRole.STAFF;\n")
    else:
        new_lines.append(line)

with open('src/services/firestoreService.ts', 'w') as f:
    f.writelines(new_lines)
print('Patched target 1!')
