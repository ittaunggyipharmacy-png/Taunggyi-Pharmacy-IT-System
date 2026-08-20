const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
const p4 = app.match(/\s*\{\/\* RESET DATABASE TOOL \*\/\}.*?isCompact=\{true\} \/>\n\s*<\/div>\n\s*\)}/s);
console.log("Match 4:", !!p4);
