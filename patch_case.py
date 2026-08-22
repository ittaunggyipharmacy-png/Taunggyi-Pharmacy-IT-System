import sys

# Patch firestoreService.ts
with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()

target = 'const isSuperAdminEmail = firebaseUser.email === "it.taunggyipharmacy@gmail.com";'
replacement = 'const isSuperAdminEmail = firebaseUser.email?.toLowerCase() === "it.taunggyipharmacy@gmail.com";'

if target in content:
    content = content.replace(target, replacement)
    with open('src/services/firestoreService.ts', 'w') as f:
        f.write(content)
    print("Patched firestoreService.ts")
else:
    print("Failed to patch firestoreService.ts")

# Patch server.ts
with open('server.ts', 'r') as f:
    content = f.read()

target2 = 'if (email === "it.taunggyipharmacy@gmail.com") return true;'
replacement2 = 'if (email?.toLowerCase() === "it.taunggyipharmacy@gmail.com") return true;'

if target2 in content:
    content = content.replace(target2, replacement2)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Patched server.ts")
else:
    print("Failed to patch server.ts")

