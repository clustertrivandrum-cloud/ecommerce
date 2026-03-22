import { NextResponse } from 'next/server';
import {
  finalizePaidOrder,
  markOrderPaymentFailed,
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

    if (!isValidSignature) {
      await markOrderPaymentFailed({
        orderId,
        provider: 'razorpay',
        providerReference: razorpayOrderId,
        amount,
      });

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
