import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listCustomerOrdersByIdentity } from '@/lib/server/orders';

function getAuthClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const authClient = getAuthClient(token);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const orders = await listCustomerOrdersByIdentity({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({ success: true, orders });
  } catch (err: unknown) {
    console.error('Order fetch error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load orders.' },
      { status: 500 }
    );
  }
}
