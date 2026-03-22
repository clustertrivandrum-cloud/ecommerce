import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWishlistState, toggleWishlistState } from '@/lib/server/customer-wishlist';

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
    return { token: null, user: null };
  }

  const authClient = getAuthClient(token);
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user?.email) {
    return { token: null, user: null };
  }

  return { token, user };
}

function getUserProfileHints(user: { user_metadata?: Record<string, unknown> | null }) {
  const metadata = user.user_metadata ?? {};

  return {
    fullName: typeof metadata.full_name === 'string' ? metadata.full_name : null,
    phone: typeof metadata.phone === 'string' ? metadata.phone : null,
  };
}

export async function GET(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId')?.trim();

    if (!productId) {
      return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
    }

    const hints = getUserProfileHints(user);
    const result = await getWishlistState({
      email: user.email,
      fullName: hints.fullName,
      phone: hints.phone,
      productId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Wishlist state error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load wishlist state.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json() as { productId?: string };
    const productId = body.productId?.trim();

    if (!productId) {
      return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
    }

    const hints = getUserProfileHints(user);
    const result = await toggleWishlistState({
      email: user.email,
      fullName: hints.fullName,
      phone: hints.phone,
      productId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Wishlist toggle error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update wishlist.' },
      { status: 500 }
    );
  }
}
