import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = ' const handleLogin = async () => {\n try {\n const { error } = await supabase.auth.signInWithOAuth({ provider: \'google\' });\n if (error) throw error;\n } catch (error) {\n console.error("Login failed", error);\n }\n };'

replacement = ''' const handleLogin = async () => {
 try {
 const { data, error } = await supabase.auth.signInWithOAuth({ 
 provider: 'google',
 options: {
 skipBrowserRedirect: true // Crucial for iframes
 }
 });
 if (error) throw error;
 
 if (data?.url) {
 // Open in a popup to escape the iframe
 window.open(data.url, 'oauth_popup', 'width=600,height=700');
 }
 } catch (error) {
 console.error("Login failed", error);
 }
 };'''

if target in content:
    content = content.replace(target, replacement)
    
    # Add a popup closer at the top of the file
    import_target = 'import { supabase } from "./lib/supabase";\n'
    closer_code = '''import { supabase } from "./lib/supabase";

// If this window is a popup and has an access token in the URL, close it after Supabase processes it
if (typeof window !== 'undefined' && window.opener && window.location.hash.includes('access_token')) {
  setTimeout(() => window.close(), 1500);
}
'''
    content = content.replace(import_target, closer_code)

    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print('Patched login!')
else:
    print('Target not found!')
