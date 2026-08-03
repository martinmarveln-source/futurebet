import { hashPassword } from 'better-auth/crypto';

async function run() {
  const hash = await hashPassword('warwar99');
  console.log("Hashed password:", hash);
}

run().catch(console.error);
