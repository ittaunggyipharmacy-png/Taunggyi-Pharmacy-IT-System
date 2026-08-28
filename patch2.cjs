const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');
code = code.replace("const filteredAssets = displayedAssets.filter(asset => {", "const rawFilteredAssets = displayedAssets.filter(asset => {");
fs.writeFileSync('src/features/assets/AssetsPage.tsx', code);
