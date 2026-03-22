import { NextResponse } from 'next/server';
import {
  claimWebhookEvent,
  completeWebhookEvent,
  deriveWebhookDeliveryId,
  failWebhookEvent,
  finalizePaidOrder,
  getOrderIdByProviderReference,
  hasRazorpayWebhookSecret,
  markOrderPaymentFailed,
  verifyRazorpayWebhookSignature,
} from '@/lib/server/checkout';

type RazorpayWebhookPayload = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        amount?: number;
        id?: string;
        order_id?: string;
      };
    };
    order?: {
      entity?: {
        amount_paid?: number;
        id?: string;
      };
    };
  };
};

export async function POST(req: Request) {
  let claimedEventId: string | null = null;
  try {
    if (!hasRazorpayWebhookSecret()) {
      return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 500 });
    }

    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature.' }, { status: 400 });
    }

    const rawBody = await req.text();
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const deliveryId = deriveWebhookDeliveryId(rawBody, req.headers.get('x-razorpay-event-id'));
    const claimedEvent = await claimWebhookEvent({
      provider: 'razorpay',
      deliveryId,
      eventType: payload.event,
      payload,
    });
    claimedEventId = claimedEvent.event.id;

    if (claimedEvent.duplicate && claimedEvent.event.status !== 'failed') {
      return NextResponse.json({
        success: true,
        duplicate: true,
        status: claimedEvent.event.status,
      });
    }

    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

    if (!razorpayOrderId) {
      await completeWebhookEvent(claimedEvent.event.id, 'ignored');
      return NextResponse.json({ success: true, ignored: true });
    }

    const orderId = await getOrderIdByProviderReference('razorpay', razorpayOrderId);
    if (!orderId) {
      await completeWebhookEvent(claimedEvent.event.id, 'ignored');
      return NextResponse.json({ success: true, ignored: true });
    }

    if (payload.event === 'payment.failed') {
      await markOrderPaymentFailed({
        orderId,
        provider: 'razorpay',
        providerReference: razorpayOrderId,
        amount: paymentEntity?.amount ? paymentEntity.amount / 100 : undefined,
      });
    }

    if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
      await finalizePaidOrder({
        orderId,
        provider: 'razorpay',
        providerReference: razorpayOrderId,
        amount: paymentEntity?.amount
          ? paymentEntity.amount / 100
          : orderEntity?.amount_paid
            ? orderEntity.amount_paid / 100
          : undefined,
      });
    }

    if (payload.event !== 'payment.failed' && payload.event !== 'payment.captured' && payload.event !== 'order.paid') {
      await completeWebhookEvent(claimedEvent.event.id, 'ignored');
      return NextResponse.json({ success: true, ignored: true });
    }

    await completeWebhookEvent(claimedEvent.event.id, 'processed');
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : 'Unknown webhook processing error.';
    console.error('Razorpay webhook error', err);
    if (claimedEventId) {
      try {
        await failWebhookEvent(claimedEventId, rawError);
      } catch (loggingError) {
        console.error('Razorpay webhook error logging failed', loggingError);
      }
    }
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
