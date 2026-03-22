import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncCustomerProfile } from '@/lib/server/customer-profile';

type ProfileBody = {
  fullName?: string;
  phone?: string;
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

export async function POST(req: Request) {
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

    if (authError || !user?.id || !user.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json() as ProfileBody;
    const fullName = body.fullName?.trim();
    const phone = body.phone?.trim();

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: 'Full name and phone number are required.' },
        { status: 400 }
      );
    }

    const result = await syncCustomerProfile({
      userId: user.id,
      email: user.email,
      fullName,
      phone,
      existingUserMetadata:
        user.user_metadata && typeof user.user_metadata === 'object'
          ? user.user_metadata as Record<string, unknown>
          : null,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    console.error('Profile sync error', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Could not save profile.',
      },
      { status: 500 }
    );
  }
}
