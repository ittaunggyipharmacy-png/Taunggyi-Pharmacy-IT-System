const fs = require('fs');
let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

code = code.replace(/fetchAssets\(\)\.then\(handlers\.onAssets\);/g, 
  "fetchAssets().then(handlers.onAssets).catch(err => { console.error('Failed to load assets', err); if (handlers.onAssetsError) handlers.onAssetsError(err); });");

fs.writeFileSync('src/services/syncService.ts', code);
