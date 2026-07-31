// @ts-nocheck
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import crypto from "crypto";

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    // 1. Generate a secure, random verification token
    const token = crypto.randomBytes(32).toString("hex");

    // 2. Set expiration time (e.g., 24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 3. Save the token to the database.
    // (Assuming standard NextAuth/Auth.js schema with a verification_tokens table)
    await sql`
      INSERT INTO verification_tokens (identifier, token, expires)
      VALUES (${userEmail}, ${token}, ${expiresAt})
    `;

    // 4. Construct the verification URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(
      userEmail
    )}`;

    // 5. Send the actual email
    // ----------------------------------------------------------------------
    // 🔥 DROP YOUR EMAIL PROVIDER LOGIC HERE (Resend, SendGrid, Nodemailer)
    // ----------------------------------------------------------------------
    /*
      Example using Resend:
      
      import { Resend } from 'resend';
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: 'FutureBet <noreply@futurebet.com>',
        to: userEmail,
        subject: 'Verify your email address',
        html: `
          <h2>Welcome to FutureBet!</h2>
          <p>Please click the link below to verify your email address.</p>
          <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px;">
            Verify Email
          </a>
          <p>Or paste this link into your browser: <br/> ${verificationUrl}</p>
        `
      });
    */

    // For development testing, log the URL to the terminal so you can click it
    if (process.env.NODE_ENV === "development") {
      console.log(`\n📧 VERIFICATION EMAIL SENT TO: ${userEmail}`);
      console.log(`🔗 CLICK HERE TO VERIFY: ${verificationUrl}\n`);
    }

    return Response.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Send verification error:", error);
    return Response.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}