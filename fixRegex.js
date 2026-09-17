const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', 'utf8');

// Fix the invalid regex - /(**[^*]+**)/g → use string split instead of regex
const OLD = "const parts = line.split(/(**[^*]+**)/g);";
const NEW = "const boldRegex = /([*][*][^*]+[*][*])/g; const parts = line.split(boldRegex);";

if (code.includes(OLD)) {
  code = code.replace(OLD, NEW);
  console.log('✅ Fixed invalid regex');
} else {
  console.warn('Not found, trying alternate...');
  // Try with escaped asterisks variation
  const OLD2 = 'const parts = line.split(/(\\*\\*[^*]+\\*\\*)/g);';
  if (code.includes(OLD2)) {
    code = code.replace(OLD2, NEW);
    console.log('✅ Fixed (variation 2)');
  } else {
    console.error('❌ Could not find regex to fix');
    const idx = code.indexOf('line.split(');
    console.log('Context:', JSON.stringify(code.substring(idx, idx + 80)));
  }
}

fs.writeFileSync('apps/web/src/components/Dashboard/BetSlip.tsx', code);
console.log('Done');
