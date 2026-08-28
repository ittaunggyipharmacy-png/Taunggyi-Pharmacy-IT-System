const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');
const start = code.indexOf('const filteredAssets = useMemo(() => {');
const end = code.indexOf('const groupedByUser = useMemo(() => {');
console.log(code.substring(start, end));
