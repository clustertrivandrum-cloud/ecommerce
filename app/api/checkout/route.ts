import { NextResponse } from 'next/server';
import type { CartItemInput, CheckoutData } from '@/lib/api/order';
import {
  createPendingOrder,
  getRazorpay,
  hasRazorpayCredentials,
  upsertPaymentRecord,
} from '@/lib/server/checkout';

export async function POST(req: Request) {
  try {
    const { data, items } = await req.json() as {
      data: CheckoutData;
      items: CartItemInput[];
    };

    if (!hasRazorpayCredentials()) {
      return NextResponse.json(
        { error: 'Online payments are temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Server will recompute pricing/stock and coupon validity
    const { orderId, grandTotal } = await createPendingOrder(data, items);
    const amountInPaise = Math.round(grandTotal * 100);

    if (amountInPaise <= 0) {
      return NextResponse.json(
        { error: 'Order total must be greater than zero.' },
        { status: 400 }
      );
    }

    const razorpay = getRazorpay();
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId.substring(0, 40),
    });

    await upsertPaymentRecord({
      orderId,
      provider: 'razorpay',
      providerReference: razorpayOrder.id,
      amount: grandTotal,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    });
  } catch (err: unknown) {
    console.error('Serverside Checkout Error', err);
    const message = err instanceof Error ? err.message : 'Server process crashed.';
    const isUserFacingError =
      typeof message === 'string' && (
        message.includes('Coupon') ||
        message.includes('coupon') ||
        message.includes('stock') ||
        message.includes('Variant') ||
        message.includes('variant') ||
        message.includes('Order total') ||
        message.includes('No variants provided') ||
        message.includes('Each cart item must include a variant')
      );

    return NextResponse.json(
      { error: isUserFacingError ? message : 'Server process crashed.' },
      { status: isUserFacingError ? 400 : 500 }
    );
  }
}
