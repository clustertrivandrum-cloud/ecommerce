import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPreorderReservation, listCustomerPreordersByEmail } from '@/lib/server/preorders';

type PreorderBody = {
  email?: string;
  name?: string;
  phone?: string;
  variantId?: string;
  quantity?: number;
};

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

    const preorders = await listCustomerPreordersByEmail(user.email);
    return NextResponse.json({ success: true, preorders });
  } catch (err: unknown) {
    console.error('Preorder fetch error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load preorders.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { email, name, phone, variantId, quantity } = await req.json() as PreorderBody;

    if (!email || !name || !phone || !variantId) {
      return NextResponse.json(
        { error: 'Name, email, phone, and variant id are required.' },
        { status: 400 }
      );
    }

    const preorder = await createPreorderReservation({
      email,
      name,
      phone,
      variantId,
      quantity,
    });

    return NextResponse.json({
      success: true,
      ...preorder,
    });
  } catch (err: unknown) {
    console.error('Preorder reservation error', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Could not save preorder reservation.',
      },
      { status: 500 }
    );
  }
}
