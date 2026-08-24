const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/onAssets: \(updatedAssets\) => setAssets\(updatedAssets\),/g, 
  "onAssets: (updatedAssets) => setAssets(updatedAssets),\n        onAssetsError: (err) => { console.error('Asset load error:', err); toast.error('Unable to load assets'); },");

fs.writeFileSync('src/App.tsx', code);
