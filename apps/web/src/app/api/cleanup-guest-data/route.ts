// @ts-nocheck
import sql from "@/app/api/utils/sql";

export async function POST(req) {
  try {
    // Clean up guest comparison data older than 7 days
    const guestResult = await sql`
      DELETE FROM guest_comparisons 
      WHERE created_at < NOW() - INTERVAL '7 days'
    `;

    // Clean up user comparison data older than 7 days
    const userResult = await sql`
      DELETE FROM user_comparisons 
      WHERE created_at < NOW() - INTERVAL '7 days'
    `;

    // Also clean up expired AI insights cache
    const cacheResult = await sql`
      DELETE FROM ai_insights_cache 
      WHERE expires_at < NOW()
    `;

    return Response.json({
      success: true,
      deletedGuestComparisons: guestResult.length,
      deletedUserComparisons: userResult.length,
      deletedCacheEntries: cacheResult.length,
      message: "Cleanup completed successfully",
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return Response.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
