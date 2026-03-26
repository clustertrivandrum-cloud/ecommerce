import { NextResponse } from 'next/server';
import { createPaymentRequestSessionByToken, updatePaymentRequestOrderAddressByToken } from '@/lib/server/checkout';
import { logAudit } from '@/lib/server/audit';

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json({ error: 'Payment request token is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    if (body.address) {
      await updatePaymentRequestOrderAddressByToken(token, body.address);
    }

    const session = await createPaymentRequestSessionByToken(token);
    await logAudit({
      action: 'payment_request.session',
      entityType: 'order',
      entityId: session.orderId,
      before: null,
      after: { razorpay_order_id: session.razorpayOrderId, amount: session.amount }
    })
    return NextResponse.json({ success: true, ...session });
  } catch (err: unknown) {
    console.error('Payment request session error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not start payment request.' },
      { status: err instanceof Error && err.message.includes('expired') ? 410 : 500 }
    );
  }
}
