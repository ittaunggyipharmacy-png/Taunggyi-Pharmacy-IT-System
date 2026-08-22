import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Remove import
content = re.sub(r"import\s*{\s*migrateExistingUsersToAdmins\s*}\s*from\s*'./services/userService';\n?", "", content)

# Remove the runFullMigration block
migration_block = """  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const runFullMigration = async () => {
    setMigrationRunning(true);
    setMigrationResult(null);
    try {
      const res = await migrateExistingUsersToAdmins();
      if (res.success) {
        setMigrationResult(`Successfully migrated ${res.count} records from Firebase to Supabase!`);
        toast.success(`Successfully migrated ${res.count} records from Firebase to Supabase!`);
      } else {
        setMigrationResult(`Migration failed: ${res.error || 'Unknown error'}`);
        toast.error(`Migration failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setMigrationResult(`Error: ${err.message || String(err)}`);
      toast.error(`Error during migration`);
    } finally {
      setMigrationRunning(false);
    }
  };"""

content = content.replace(migration_block, "")

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Cleaned App.tsx")
