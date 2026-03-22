import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { CustomerAddressInput } from '@/lib/customer-addresses';
import { saveCustomerAddressByEmail } from '@/lib/server/customer-addresses';

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

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { error: 'Unauthorized.', status: 401 as const, user: null };
  }

  const authClient = getAuthClient(token);
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user?.email) {
    return { error: 'Unauthorized.', status: 401 as const, user: null };
  }

  return { error: null, status: 200 as const, user };
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const email = auth.user.email;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json() as CustomerAddressInput;
    const address = await saveCustomerAddressByEmail({
      email,
      addressId: id,
      address: body,
    });

    return NextResponse.json({ success: true, address });
  } catch (err: unknown) {
    console.error('Address update error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not update address.' },
      { status: 500 }
    );
  }
}
