import { betterAuth } from 'better-auth';
const auth = betterAuth({
  database: null as any,
  user: { modelName: 'auth_users' },
  session: { modelName: 'auth_sessions' },
  account: { modelName: 'auth_accounts' },
  verification: { modelName: 'auth_verification_token' },
});
