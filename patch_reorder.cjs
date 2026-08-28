const fs = require('fs');
let code = fs.readFileSync('src/features/assets/AssetsPage.tsx', 'utf8');

console.log(code.substring(code.indexOf('const groupedByUser'), code.indexOf('const analysis =')));
