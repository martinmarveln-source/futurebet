require('dotenv').config({path: '.env.local'});
async function run() {
  const { POST } = await import('./apps/web/src/app/api/ai-recommend-slip/route.ts');
  const req = new Request('http://localhost:3000/api/ai-recommend-slip', {
    method: 'POST',
    body: JSON.stringify({ minMatches: 3, maxMatches: 5, minOdds: 1.5, maxOdds: 4.0 }),
    headers: { 'Content-Type': 'application/json' }
  });
  
  // We need to mock auth() if it's imported from @/auth
  // But wait, we can't easily run Next.js server-side code in raw node due to path aliases (@/auth)
}
run();
