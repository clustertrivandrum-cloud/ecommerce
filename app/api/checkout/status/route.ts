import { NextResponse } from 'next/server';
import { markOrderPaymentFailed, orderMatchesPaymentRequestToken, verifyRazorpayWebhookSignature } from '@/lib/server/checkout';

type CheckoutStatusBody = {
  orderId: string;
  amount?: number;
  razorpayOrderId: string;
  status: 'failed';
  paymentRequestToken?: string;
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const { orderId, amount, razorpayOrderId, status, paymentRequestToken } = JSON.parse(rawBody) as CheckoutStatusBody;

    if (signature) {
      const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      if (!paymentRequestToken) {
        return NextResponse.json({ error: 'Payment token is required.' }, { status: 401 });
      }

      const tokenMatchesOrder = await orderMatchesPaymentRequestToken(orderId, paymentRequestToken);
      if (!tokenMatchesOrder) {
        return NextResponse.json({ error: 'Invalid payment token.' }, { status: 401 });
      }
    }

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
