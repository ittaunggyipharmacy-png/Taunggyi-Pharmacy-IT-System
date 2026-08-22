import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = '''      // A full reload ensures everything boots up correctly
      window.location.reload();
    } else if (event.data === 'SUPABASE_AUTH_COMPLETED') { // backward compatibility
      await supabase.auth.getSession();
      window.location.reload();
    }'''

replacement = '''      // Avoid reloading the window here! 
      // In the AI Studio preview iframe, localStorage is often blocked.
      // If Supabase falls back to in-memory storage, reloading the page destroys the session.
      // Setting the session above will automatically trigger onAuthStateChange in React.
    } else if (event.data === 'SUPABASE_AUTH_COMPLETED') { // backward compatibility
      await supabase.auth.getSession();
    }'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print('Patched successfully!')
else:
    print('Target not found!')
