import { NextResponse } from 'next/server';
import sql from '../../utils/sql';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const subscription = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const { endpoint, keys: { p256dh, auth: authKey } } = subscription;

    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, endpoint)
      )
    `;

    await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (${userId}, ${endpoint}, ${p256dh}, ${authKey})
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        created_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
