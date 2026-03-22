import { NextResponse } from 'next/server';
import { markOrderPaymentFailed, verifyRazorpayWebhookSignature } from '@/lib/server/checkout';

type CheckoutStatusBody = {
  orderId: string;
  amount?: number;
  razorpayOrderId: string;
  status: 'failed';
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { orderId, amount, razorpayOrderId, status } = JSON.parse(rawBody) as CheckoutStatusBody;

    if (status === 'failed') {
      await markOrderPaymentFailed({
        orderId,
        provider: 'razorpay',
        providerReference: razorpayOrderId,
        amount,
      });
    }

    return NextResponse.json({ success: true, orderId, status });
  } catch (err: unknown) {
    console.error('Checkout status update error', err);
    return NextResponse.json({ error: 'Could not update checkout status.' }, { status: 500 });
  }
}
