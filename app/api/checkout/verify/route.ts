import { NextResponse } from 'next/server';
import {
  finalizePaidOrder,
  getOrderIdByProviderReference,
  verifyRazorpaySignature,
} from '@/lib/server/checkout';
import { logAudit } from '@/lib/server/audit';

type VerifyCheckoutBody = {
  orderId: string;
  amount?: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export async function POST(req: Request) {
  try {
    const {
      orderId,
      amount,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = await req.json() as VerifyCheckoutBody;

    const isValidSignature = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    const matchedOrderId = await getOrderIdByProviderReference('razorpay', razorpayOrderId);
    if (!matchedOrderId || matchedOrderId !== orderId) {
      return NextResponse.json({ error: 'Payment does not belong to this order.' }, { status: 400 });
    }

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
    }

    await finalizePaidOrder({
      orderId,
      provider: 'razorpay',
      providerReference: razorpayOrderId,
      amount,
    });

    await logAudit({
      action: 'payment.paid',
      entityType: 'order',
      entityId: orderId,
      after: { razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, amount }
    })

    return NextResponse.json({ success: true, orderId });
  } catch (err: unknown) {
    console.error('Payment verification error', err);
    return NextResponse.json({ error: 'Could not verify payment.' }, { status: 500 });
  }
}
