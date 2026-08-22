import re

with open('src/features/user-management/UserManagement.tsx', 'r') as f:
    content = f.read()

# Remove import
content = re.sub(r",\s*migrateExistingUsersToAdmins", "", content)

# Remove state
content = re.sub(r"const \[migrationStatus.*?null\);", "", content)

# Remove handleMigration
handle_migration_pattern = r"const handleMigration\s*=\s*async\s*\(\)\s*=>\s*{[\s\S]*?};\n\n\s*const fetchUsers"
content = re.sub(handle_migration_pattern, "const fetchUsers", content)

# Remove UI block
ui_block_pattern = r"{isSuperAdmin\s*&&\s*\(\s*<div\s*className=\"bg-slate-50.*?Database Role Migration Tool.*?</AnimatePresence>\s*</div>\s*\)}"
content = re.sub(ui_block_pattern, "", content, flags=re.DOTALL)

with open('src/features/user-management/UserManagement.tsx', 'w') as f:
    f.write(content)

print("Cleaned UserManagement.tsx")
