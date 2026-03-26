import { NextResponse } from 'next/server';
import { getOrderIdByProviderReference, markOrderPaymentFailed, orderMatchesPaymentRequestToken } from '@/lib/server/checkout';

type CheckoutStatusBody = {
  orderId: string;
  amount?: number;
  razorpayOrderId: string;
  status: 'failed';
  paymentRequestToken?: string;
};

export async function POST(req: Request) {
  try {
    const { orderId, amount, razorpayOrderId, status, paymentRequestToken } = await req.json() as CheckoutStatusBody;

    if (!paymentRequestToken) {
      return NextResponse.json({ error: 'Payment token is required.' }, { status: 401 });
    }

    const tokenMatchesOrder = await orderMatchesPaymentRequestToken(orderId, paymentRequestToken);
    if (!tokenMatchesOrder) {
      return NextResponse.json({ error: 'Invalid payment token.' }, { status: 401 });
    }

    const matchedOrderId = await getOrderIdByProviderReference('razorpay', razorpayOrderId);
    if (!matchedOrderId || matchedOrderId !== orderId) {
      return NextResponse.json({ error: 'Payment does not belong to this order.' }, { status: 400 });
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
