with open('src/features/auth/hooks/useAuth.ts', 'r') as f:
    content = f.read()

content = content.replace("import { \n  syncSystemUser, \n  isUserAdmin \n} from '../../../services/userService';", "import { \n  syncSystemUser \n} from '../../../services/userService';")

content = content.replace("setIsAdmin(isUserAdmin(profile.role));", "setIsAdmin(profile.role === UserRole.IT_SUPERVISOR || profile.role === UserRole.IT_SUPERVISOR_CAPS || profile.role === UserRole.ADMIN || profile.role === UserRole.ADMIN_CAPS);")

content = content.replace("setIsAdmin(isUserAdmin(updatedProfile.role));", "setIsAdmin(updatedProfile.role === UserRole.IT_SUPERVISOR || updatedProfile.role === UserRole.IT_SUPERVISOR_CAPS || updatedProfile.role === UserRole.ADMIN || updatedProfile.role === UserRole.ADMIN_CAPS);")

with open('src/features/auth/hooks/useAuth.ts', 'w') as f:
    f.write(content)
