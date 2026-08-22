with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """import { 
  subscribeToSync, getSettings, migrateExistingUsersToAdmins, subscribeToSupervisorFeatures
} from './services/firestoreService';"""

replacement = """import { subscribeToSync, subscribeToSupervisorFeatures } from './services/syncService';
import { getSettings } from './services/settingsService';
import { migrateExistingUsersToAdmins } from './services/userService';"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Fixed App.tsx imports")
else:
    print("Could not find App.tsx imports")
