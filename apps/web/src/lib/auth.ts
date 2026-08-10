/**
 * ⚠ DO NOT REWRITE THIS FILE ⚠
 *
 * Shipped v2 better-auth configuration. The hooks.before middleware (backfills
 * `name` from email), bearer() plugin (mobile Authorization: Bearer flow),
 * trustedOrigins list, and socialProviders block are ALL load-bearing. A prior
 * AI removed the name backfill and broke every signup with [body.name]
 * validation errors. DO NOT simplify this config without understanding why each
 * piece is present.
 *
 *   Safe:   add user fields to `user.additionalFields`, tune session options.
 *   Unsafe: removing hooks.before, the bearer plugin, or trustedOrigins;
 *           changing cookie attributes (sameSite:'none' is required for
 *           mobile iframes); changing the database pool; hand-editing the
 *           socialProviders block (the platform injects the OAuth credentials
 *           via env vars when a provider is enabled in project settings).
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import { argon2Verify } from 'argon2-wasm-edge';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { verifyPassword } from 'better-auth/crypto';
import { bearer } from 'better-auth/plugins';
import ws from 'ws';
import crypto from 'crypto';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Origins we accept auth requests from. Include every URL the app may be
// served under so better-auth's CSRF check doesn't reject legitimate requests
// as "Invalid origin". The request's own origin + known sandbox / published
// URLs + the mobile iframe proxy URL are all listed here.
//
// BETTER_AUTH_TRUSTED_ORIGINS is a comma-separated list the platform sets at
// publish time to every attached free-host + custom domain. Without it, only
// the first published URL (historically the free host) is trusted and signup
// on a custom domain returns INVALID_ORIGIN after domain attach.
const trustedOrigins = Array.from(
  new Set(
    [
      process.env.BETTER_AUTH_URL,
      process.env.EXPO_PUBLIC_PROXY_BASE_URL,
      process.env.NEXT_PUBLIC_CREATE_BASE_URL,
      process.env.NEXT_PUBLIC_CREATE_HOST
        ? `https://${process.env.NEXT_PUBLIC_CREATE_HOST}`
        : null,
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ].filter((v): v is string => Boolean(v))
  )
);

// Social providers self-activate when the platform has injected their OAuth
// credentials (set in project settings → Authentication, pushed in as env
// vars). A provider with missing credentials is simply not registered, so the
// corresponding sign-in button never reaches a half-configured backend.
const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? {
        apple: {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
          // Required to verify the identity token from native "Sign in with
          // Apple"; harmless when only web is used.
          ...(process.env.APPLE_APP_BUNDLE_IDENTIFIER
            ? {
                appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
              }
            : {}),
        },
      }
    : {}),
};

async function verifyCompatiblePassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}) {
  if (hash.startsWith('$argon2')) {
    return argon2Verify({
      hash,
      password,
    });
  }

  return verifyPassword({
    hash,
    password,
  });
}

export const auth = betterAuth({
  database: pool,
  trustedOrigins,
  socialProviders,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      verify: verifyCompatiblePassword,
    },
  },
  hooks: {
    // better-auth's /sign-up/email schema requires `name`. Generated user apps
    // often collect only email+password, so backfill a name from the email
    // local-part to keep signup working without a visible name field.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return;
      const body = ctx.body as { email?: unknown; name?: unknown } | undefined;
      if (!body || typeof body.email !== 'string') return;
      if (typeof body.name === 'string' && body.name.trim().length > 0) return;
      const derived = body.email.split('@')[0];
      body.name = derived && derived.length > 0 ? derived : 'User';
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return;
      const body = ctx.body as { email?: unknown };
      if (!body || typeof body.email !== 'string') return;
      const email = body.email;

      // Create a unique referral code for this user
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const randomPart = Array.from({ length: 5 })
        .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
        .join('');
      const referralCode = `FB-${new Date().getFullYear()}-${randomPart}`;
      
      // Get ref cookie if it exists
      const cookies = ctx.request?.headers.get('cookie') || '';
      const match = cookies.match(/fb_ref_code=([^;]+)/);
      const referrerCode = match ? match[1] : null;

      try {
        if (referrerCode) {
          // Find referrer user
          const referrerRes = await pool.query('SELECT id FROM auth_users WHERE referral_code = $1', [referrerCode]);
          if (referrerRes.rows.length > 0) {
            const referrerId = referrerRes.rows[0].id;
            
            const newUserRes = await pool.query('SELECT id FROM auth_users WHERE email = $1', [email]);
            if (newUserRes.rows.length > 0) {
              const newUserId = newUserRes.rows[0].id;
              
              // Grant 7-day trial and set referral_code
              const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              await pool.query(
                'UPDATE auth_users SET referral_code = $1, is_restricted_trial = true, subscription_expires_at = $2 WHERE id = $3', 
                [referralCode, expiresAt, newUserId]
              );
              
              // Record the referral
              await pool.query(
                'INSERT INTO referrals (referrer_id, referred_user_id, status) VALUES ($1, $2, $3)',
                [referrerId, newUserId, 'PENDING_REWARD']
              );
              return;
            }
          }
        }
        
        // If no valid referrer, just assign a referral code
        await pool.query('UPDATE auth_users SET referral_code = $1 WHERE email = $2', [referralCode, email]);
      } catch (err) {
        console.error('Error in auth hooks.after setting up referrals:', err);
      }
    }),
  },
  advanced: {
    cookiePrefix: 'better-auth',
    defaultCookieAttributes: {
      sameSite: 'none', // Required for iframes
      secure: true,
      httpOnly: true,
      path: '/',
    },
    cookies: {
      sessionToken: {
        attributes: {
          sameSite: 'none', // Required for iframes
          secure: true,
        },
      },
    },
  },
  session: {
    modelName: 'auth_sessions',
    cookieCache: {
      enabled: false,
    },
  },
  account: {
    modelName: 'auth_accounts',
  },
  verification: {
    modelName: 'auth_verification_token',
  },
  user: {
    modelName: 'auth_users',
    additionalFields: {
      image: { type: 'string', required: false },
      subscription_status: { type: 'string', required: false },
      subscription_expires_at: { type: 'date', required: false },
      user_role: { type: 'string', required: false },
      first_name: { type: 'string', required: false },
      last_name: { type: 'string', required: false },
      username: { type: 'string', required: false },
      referral_code: { type: 'string', required: false },
      is_restricted_trial: { type: 'boolean', required: false },
    },
  },
  // Enable Authorization: Bearer <session-token> so mobile apps (which can't
  // carry cookies through a WebView) authenticate API calls with the token
  // returned from /api/auth/token.
  plugins: [bearer()],
});

export type Session = typeof auth.$Infer.Session;
