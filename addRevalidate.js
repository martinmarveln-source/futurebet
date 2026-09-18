const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/api/cron/missing-scores/route.ts', 'utf8');

if (!code.includes('revalidate = 0')) {
  code = code.replace(
    "export const dynamic = 'force-dynamic';",
    "export const dynamic = 'force-dynamic';\nexport const revalidate = 0;\nexport const fetchCache = 'force-no-store';"
  );
  fs.writeFileSync('apps/web/src/app/api/cron/missing-scores/route.ts', code);
  console.log('Added no-store pragmas.');
}
