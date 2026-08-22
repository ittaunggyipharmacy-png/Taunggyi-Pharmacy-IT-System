import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = '''// If this window is a popup and has an access token in the URL, close it after Supabase processes it
if (typeof window !== 'undefined' && window.opener && window.location.hash.includes('access_token')) {
  // Wait for Supabase to process the token, then notify the opener and close
  setTimeout(() => {
    window.opener.postMessage('SUPABASE_AUTH_COMPLETED', '*');
    window.close();
  }, 1500);
}

// In the main window, listen for the popup closing
if (typeof window !== 'undefined' && !window.opener) {
  window.addEventListener('message', async (event) => {
    if (event.data === 'SUPABASE_AUTH_COMPLETED') {
      // Force a session refresh
      await supabase.auth.getSession();
      // A full reload ensures everything boots up correctly
      window.location.reload();
    }
  });
}'''

replacement = '''// If this window is a popup and has an access token in the URL, close it after Supabase processes it
if (typeof window !== 'undefined' && window.opener && window.location.hash.includes('access_token')) {
  // Wait for Supabase to process the token, then notify the opener and close
  setTimeout(() => {
    window.opener.postMessage({ 
      type: 'SUPABASE_AUTH_COMPLETED', 
      hash: window.location.hash 
    }, '*');
    window.close();
  }, 1500);
}

// In the main window, listen for the popup closing
if (typeof window !== 'undefined' && !window.opener) {
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SUPABASE_AUTH_COMPLETED') {
      const hash = event.data.hash;
      if (hash) {
        // Parse tokens from hash
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Manually set session in this window's partitioned storage
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        }
      }
      
      // A full reload ensures everything boots up correctly
      window.location.reload();
    } else if (event.data === 'SUPABASE_AUTH_COMPLETED') { // backward compatibility
      await supabase.auth.getSession();
      window.location.reload();
    }
  });
}'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print('Patched successfully!')
else:
    print('Target not found!')
