import re

with open('src/services/userService.ts', 'r') as f:
    content = f.read()

# Remove migrateExistingUsersToAdmins
migration_func_pattern = r"export\s+const\s+migrateExistingUsersToAdmins\s*=\s*async\s*\(\)\s*=>\s*{[\s\S]*?};\n"
content = re.sub(migration_func_pattern, "", content)

with open('src/services/userService.ts', 'w') as f:
    f.write(content)

print("Cleaned userService.ts")
