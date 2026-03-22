import { NextResponse } from 'next/server';
import { createRetryPaymentSession } from '@/lib/server/checkout';

type RetryOrderBody = {
  orderId: string;
};

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json() as RetryOrderBody;

    if (!orderId) {
      return NextResponse.json({ error: 'Order id is required.' }, { status: 400 });
    }

    const session = await createRetryPaymentSession(orderId);
    return NextResponse.json({ success: true, ...session });
  } catch (err: unknown) {
    console.error('Retry payment session error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not create retry payment session.' },
      { status: 500 }
    );
  }
}
