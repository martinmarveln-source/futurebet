const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('apps/web/src/app/api', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('"@/lib/auth"')) {
      content = content.replace(/"@\/lib\/auth"/g, '"@/auth"');
      fs.writeFileSync(filePath, content);
      console.log('Reverted auth import in', filePath);
    }
  }
});
