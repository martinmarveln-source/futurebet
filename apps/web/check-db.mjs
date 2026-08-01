import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const users = await sql`SELECT id, email, user_role, subscription_status FROM auth_users LIMIT 10`;
console.log("Users:", JSON.stringify(users, null, 2));
