import sql from "@/app/api/utils/sql";

export const dynamic = "force-dynamic";
export const revalidate = 60; // cache for 60 seconds

export async function GET() {
  try {
    // 1. Get recent premium/silver upgrades
    const recentUpgrades = await sql`
      SELECT name, subscription_status 
      FROM auth_users 
      WHERE subscription_status IN ('premium', 'silver') 
        AND subscription_expires_at > NOW()
        AND name IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 20
    `;

    // 2. Get recent active users (for general actions like viewing AI, verifying phone, etc)
    const activeUsers = await sql`
      SELECT name
      FROM auth_users
      WHERE name IS NOT NULL AND name != ''
      ORDER BY updated_at DESC
      LIMIT 50
    `;

    return Response.json({
      ok: true,
      upgrades: recentUpgrades.map(u => ({
        name: u.name?.split(' ')[0] || 'User',
        tier: u.subscription_status
      })),
      names: activeUsers.map(u => u.name?.split(' ')[0] || 'User')
    });
  } catch (error) {
    console.error("Error fetching FOMO data:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
