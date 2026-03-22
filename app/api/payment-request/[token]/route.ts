import { NextResponse } from 'next/server';
import { getPaymentRequestOrderByToken } from '@/lib/server/checkout';

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json({ error: 'Payment request token is required.' }, { status: 400 });
    }

    const order = await getPaymentRequestOrderByToken(token);

    if (!order) {
      return NextResponse.json({ error: 'Payment request not found or expired.' }, { status: 410 });
    }

    return NextResponse.json({ success: true, order });
  } catch (err: unknown) {
    console.error('Payment request fetch error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not load payment request.' },
      { status: 500 }
    );
  }
}
