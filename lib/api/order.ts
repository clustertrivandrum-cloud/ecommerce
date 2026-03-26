export interface CheckoutData {
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  address: {
    firstName: string;
    lastName: string;
    addressLine: string;
    apartment?: string;
    city: string;
    state?: string;
    pincode: string;
  };
  shippingCharge: number;
  discountAmount?: number;
  couponCode?: string;
}

export interface CartItemInput {
  id: string;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string | null;
  variantLabel?: string;
}

export interface CheckoutSessionResponse {
  orderId: string;
  paymentRequestToken?: string | null;
  razorpayOrderId?: string | null;
  amount: number;
  razorpayKeyId: string | null;
}

export async function createOrder(data: CheckoutData, items: CartItemInput[], subtotal: number) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      items,
      subtotal,
    }),
  });

  const payload = await response.json() as CheckoutSessionResponse & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Could not create order.');
  }

  return payload;
}
