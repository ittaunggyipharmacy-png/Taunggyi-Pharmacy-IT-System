const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const p1 = app.match(/\s*useEffect\(\(\) => \{\s*if \(isAdmin\) \{\s*const loadAndMigratePasswords.*?loadAndMigratePasswords\(\);\s*\}\s*\}, \[isAdmin, settings, setSettings\]\);/s);
console.log("Match 1:", !!p1);

const p4 = app.match(/\s*\{\/\* RESET DATABASE TOOL \*\/\}.*?<\/ResetAssetsButton>\n\s*<\/div>\n\s*\)}/s);
console.log("Match 4:", !!p4);
