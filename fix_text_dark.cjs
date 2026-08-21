const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function replaceInFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // For each text-slate-XYZ, if not followed by dark:text-..., add dark:text-slate-200 or white
  // Let's use a simpler approach. Just replace all occurrences of specific text colors without dark mode equivalents.
  content = content.replace(/text-slate-900(?!\s+dark:text-)/g, 'text-slate-900 dark:text-white');
  content = content.replace(/text-slate-800(?!\s+dark:text-)/g, 'text-slate-800 dark:text-slate-100');
  content = content.replace(/text-slate-700(?!\s+dark:text-)/g, 'text-slate-700 dark:text-slate-200');
  content = content.replace(/text-slate-600(?!\s+dark:text-)/g, 'text-slate-600 dark:text-slate-300');
  content = content.replace(/text-slate-500(?!\s+dark:text-)/g, 'text-slate-500 dark:text-slate-400');
  
  content = content.replace(/text-gray-900(?!\s+dark:text-)/g, 'text-gray-900 dark:text-white');
  content = content.replace(/text-gray-800(?!\s+dark:text-)/g, 'text-gray-800 dark:text-slate-100');
  content = content.replace(/text-gray-700(?!\s+dark:text-)/g, 'text-gray-700 dark:text-slate-200');
  content = content.replace(/text-gray-600(?!\s+dark:text-)/g, 'text-gray-600 dark:text-slate-300');
  content = content.replace(/text-gray-500(?!\s+dark:text-)/g, 'text-gray-500 dark:text-slate-400');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated text classes in', filePath);
  }
}

walkDir('./src', replaceInFile);
