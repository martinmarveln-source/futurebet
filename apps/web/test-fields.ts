import { betterAuth } from 'better-auth';
const auth = betterAuth({
  database: null as any,
  account: {
    modelName: 'auth_accounts',
    fields: {
      accountId: 'providerAccountId',
      providerId: 'provider',
    }
  },
  user: {
    modelName: 'auth_users',
    fields: {
      emailVerified: 'emailVerified',
    }
  }
});
