const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/api/cron/sync-missed-scores/route.ts', 'utf8');

// Remove the auth block
const authBlock = `    // Secure with CRON_SECRET if provided
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const envSecret = process.env.CRON_SECRET;
    if (envSecret && secret !== envSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }`;

code = code.replace(authBlock, '');

// Sometimes line endings are CRLF, replace using regex if strict string replace fails
if (code.includes('CRON_SECRET')) {
  code = code.replace(/const { searchParams } = new URL\(request\.url\);\s*const secret = searchParams\.get\("secret"\);\s*const envSecret = process\.env\.CRON_SECRET;\s*if \(envSecret && secret !== envSecret\) {\s*return NextResponse\.json\({ error: "Unauthorized" }, { status: 401 }\);\s*}/g, '');
}
if (code.includes('CRON_SECRET')) {
    code = code.replace(/\/\/ Secure with CRON_SECRET if provided/g, '');
}

fs.writeFileSync('apps/web/src/app/api/cron/sync-missed-scores/route.ts', code);
console.log('Done');
