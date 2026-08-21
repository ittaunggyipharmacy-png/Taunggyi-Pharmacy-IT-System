import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = "skipBrowserRedirect: true // Crucial for iframes"
replacement = "skipBrowserRedirect: true, redirectTo: window.location.origin // Crucial for iframes"

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print('Patched redirect!')
else:
    print('Target not found!')
