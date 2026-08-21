with open('src/contexts/AccessControlContext.tsx', 'r') as f:
    content = f.read()

target_imports = "import { onAuthStateChanged } from 'firebase/auth';"
replacement_imports = "import { supabase } from '../lib/supabase';"
content = content.replace(target_imports, replacement_imports)

target_auth = " const unsubscribeAuth = onAuthStateChanged(auth, (user) => {"
replacement_auth = " const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {\n const user = session?.user;"
content = content.replace(target_auth, replacement_auth)

target_cleanup = " unsubscribeAuth();\n if (unsubscribeSnapshot) {"
replacement_cleanup = " subscription.unsubscribe();\n if (unsubscribeSnapshot) {"
content = content.replace(target_cleanup, replacement_cleanup)

with open('src/contexts/AccessControlContext.tsx', 'w') as f:
    f.write(content)
print('Access control patched!')
