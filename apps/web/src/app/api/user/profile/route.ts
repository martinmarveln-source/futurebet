import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { argon2Verify } from "argon2-wasm-edge";

/**
 * Verify a stored password hash against a plain-text password.
 * Supports both argon2 (legacy) and scrypt (better-auth default) hashes.
 */
async function verifyStoredPassword(hash: string, plain: string): Promise<boolean> {
  try {
    if (hash.startsWith("$argon2")) {
      return await argon2Verify({ hash, password: plain });
    }
    return await verifyPassword({ hash, password: plain });
  } catch {
    return false;
  }
}

export async function PUT(request: Request) {
  try {
    // ── 1. Auth guard ─────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id; // NEVER trust client-supplied userId

    // ── 2. Parse & basic sanitise ─────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const username = String(body.username ?? "").trim();
    const profilePicture =
      typeof body.profilePicture === "string" ? body.profilePicture : null;
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    // ── 3. Field validation ───────────────────────────────────────────────────
    if (firstName.length < 1) {
      return Response.json({ error: "First name is required" }, { status: 400 });
    }

    if (username.length < 3) {
      return Response.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    // Alphanumeric + underscore only for usernames
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return Response.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // ── 4. Username uniqueness check ──────────────────────────────────────────
    const existingUser = await sql`
      SELECT id FROM auth_users
      WHERE username = ${username} AND id != ${userId}
    `;
    if (existingUser.length > 0) {
      return Response.json({ error: "Username is already taken" }, { status: 400 });
    }

    // ── 5. Password change (secure) ───────────────────────────────────────────
    if (newPassword) {
      // 5a. Require current password
      if (!currentPassword) {
        return Response.json(
          { error: "Current password is required to change your password" },
          { status: 400 }
        );
      }

      // 5b. Minimum length
      if (newPassword.length < 8) {
        return Response.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }

      // 5c. Load the stored hash for THIS user only
      const accounts = await sql`
        SELECT password FROM auth_accounts
        WHERE "userId" = ${userId} AND type = 'credentials'
        LIMIT 1
      `;

      if (accounts.length === 0) {
        return Response.json(
          { error: "No password account found. If you signed in via Google, set a password via account settings." },
          { status: 400 }
        );
      }

      const storedHash = accounts[0].password as string;

      // 5d. Verify current password — reject if wrong
      const isCurrentPasswordValid = await verifyStoredPassword(storedHash, currentPassword);
      if (!isCurrentPasswordValid) {
        return Response.json(
          { error: "Current password is incorrect" },
          { status: 403 }
        );
      }

      // 5e. Hash new password with better-auth's scrypt before storing
      const newHash = await hashPassword(newPassword);

      await sql`
        UPDATE auth_accounts
        SET password = ${newHash}
        WHERE "userId" = ${userId} AND type = 'credentials'
      `;
    }

    // ── 6. Update profile fields ──────────────────────────────────────────────
    await sql`
      UPDATE auth_users
      SET
        first_name      = ${firstName},
        last_name       = ${lastName || null},
        username        = ${username},
        profile_picture = ${profilePicture}
      WHERE id = ${userId}
    `;

    // ── 7. Return updated profile ─────────────────────────────────────────────
    const updatedUser = await sql`
      SELECT id, name, email, "emailVerified", image, user_role,
             first_name, last_name, username, profile_picture
      FROM auth_users
      WHERE id = ${userId}
    `;

    return Response.json({ success: true, user: updatedUser[0] });
  } catch (error) {
    console.error("Profile update error:", error);
    return Response.json(
      { error: "Failed to update profile. Please try again." },
      { status: 500 }
    );
  }
}