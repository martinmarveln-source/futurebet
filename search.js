const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (full.includes('node_modules') || full.includes('.git') || full.includes('.next')) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      search(full);
    } else if (stat.isFile()) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('anything.com') || content.includes('create.xyz')) {
          console.log(full);
        }
      } catch (e) {}
    }
  }
}

search(process.cwd());
