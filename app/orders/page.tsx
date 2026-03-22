'use client';

import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { NoticeBanner } from '@/components/ui/NoticeBanner';

type OrderItem = { title: string; quantity: number; unit_price: number; total_price: number };
type Order = {
  id: string;
  order_number: string;
  financial_status: string;
  fulfillment_status: string;
  grand_total: number;
  created_at: string;
  order_items: OrderItem[];
};

type RetryPaymentResponse = {
  error?: string;
  orderId: string;
  razorpayOrderId?: string | null;
  amount: number;
  razorpayKeyId: string | null;
};

type VerifyPaymentResponse = {
  error?: string;
};

type CheckoutStatusResponse = {
  error?: string;
};

type OrderNotice = {
  text: string;
  tone: 'error' | 'success' | 'info';
};

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
    metadata?: {
      order_id?: string;
    };
  };
};

type RazorpayCheckoutOptions = {
  key: string | null;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  modal?: {
    ondismiss: () => void;
  };
  theme: {
    color: string;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void | Promise<void>) => void;
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

export default function OrdersPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [orderNotice, setOrderNotice] = useState<OrderNotice | null>(null);
  const searchParams = useSearchParams();
  const highlightedOrderId = searchParams.get('orderId');
  const checkoutStatus = searchParams.get('status');
  const checkoutMessage = searchParams.get('message');

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          financial_status,
          fulfillment_status,
          grand_total,
          created_at,
          order_items ( title, quantity, unit_price, total_price )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data);
      setLoading(false);
    }
    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-32 flex flex-col items-center text-center">
        <h1 className="text-3xl font-heading mb-6 tracking-widest uppercase">Order History</h1>
        <p className="text-text-secondary mb-8">Please log in to view your orders.</p>
        <Link href="/auth" className="bg-text-primary text-primary px-8 py-4 text-sm font-medium hover:bg-accent-gold transition-colors tracking-widest uppercase">
          Sign In
        </Link>
      </main>
    );
  }

  const checkoutBanner = checkoutMessage || (checkoutStatus === 'pending'
    ? 'Payment was not completed. Your pending order is saved below.'
    : checkoutStatus === 'failed'
      ? 'Payment failed. The related order is marked failed below.'
        : checkoutStatus === 'paid'
          ? 'Payment confirmed. Your latest order is listed below.'
        : null);

  const checkoutBannerTone: OrderNotice['tone'] = checkoutStatus === 'paid' ? 'success' : checkoutStatus ? 'error' : 'info';

  const routeWithStatus = (
    orderId: string,
    status: 'pending' | 'failed' | 'paid',
    message?: string
  ) => {
    const params = new URLSearchParams({ orderId, status });
    if (message) {
      params.set('message', message);
    }
    router.push(`/orders?${params.toString()}`);
  };

  const handleRetryPayment = async (orderId: string) => {
    setRetryingOrderId(orderId);
    setOrderNotice(null);
    try {
      const retryResponse = await fetch('/api/orders/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const retryData = await retryResponse.json() as RetryPaymentResponse;
      if (!retryResponse.ok || !retryData.razorpayOrderId) {
        throw new Error(retryData.error || 'Could not start payment retry.');
      }

      let checkoutTerminalStateHandled = false;

      const markFailed = async (razorpayOrderId: string, message: string) => {
        if (checkoutTerminalStateHandled) return;
        checkoutTerminalStateHandled = true;

        try {
          const statusResponse = await fetch('/api/checkout/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              amount: retryData.amount / 100,
              razorpayOrderId,
              status: 'failed',
            }),
          });

          const statusData = await statusResponse.json() as CheckoutStatusResponse;
          if (!statusResponse.ok) {
            throw new Error(statusData.error || 'Could not update order status.');
          }
        } catch (statusError) {
          console.error(statusError);
        }

        routeWithStatus(orderId, 'failed', message);
      };

      const RazorpayCtor = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!RazorpayCtor) {
        throw new Error('Razorpay SDK failed to load.');
      }

      const options: RazorpayCheckoutOptions = {
        key: retryData.razorpayKeyId,
        amount: retryData.amount,
        currency: 'INR',
        name: 'Cluster Fascination',
        description: `Retry payment for order #${orderId}`,
        order_id: retryData.razorpayOrderId,
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId,
                amount: retryData.amount / 100,
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json() as VerifyPaymentResponse;
            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }

            checkoutTerminalStateHandled = true;
            routeWithStatus(orderId, 'paid');
          } catch (verificationError) {
            await markFailed(
              paymentResponse.razorpay_order_id,
              verificationError instanceof Error ? verificationError.message : 'Payment verification failed.'
            );
          }
        },
        modal: {
          ondismiss: () => {
            if (checkoutTerminalStateHandled) return;
            checkoutTerminalStateHandled = true;
            routeWithStatus(orderId, 'pending');
          },
        },
        theme: {
          color: '#C9A96E',
        },
      };

      const rzp = new RazorpayCtor(options);
      rzp.on('payment.failed', async (failureResponse) => {
        const failureMessage = failureResponse.error?.description || 'Payment failed.';
        const failureOrderId = failureResponse.error?.metadata?.order_id || retryData.razorpayOrderId || '';
        await markFailed(failureOrderId, failureMessage);
      });
      rzp.open();
    } catch (err: unknown) {
      console.error(err);
      setOrderNotice({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not retry payment.',
      });
    } finally {
      setRetryingOrderId(null);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      <h1 className="text-3xl md:text-5xl font-heading tracking-tight mb-16 border-b border-border pb-8">
        Order History
      </h1>

      {checkoutBanner && (
        <NoticeBanner tone={checkoutBannerTone} className="mb-8">
          {checkoutBanner}
        </NoticeBanner>
      )}

      {orderNotice && (
        <NoticeBanner
          tone={orderNotice.tone}
          className="mb-8"
          onDismiss={() => setOrderNotice(null)}
        >
          {orderNotice.text}
        </NoticeBanner>
      )}

      {loading ? (
        <div className="py-20 text-center"><p className="text-text-secondary animate-pulse">Loading orders...</p></div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-border bg-card">
          <h2 className="text-xl font-heading mb-4">You have no prior orders.</h2>
          <p className="text-text-secondary text-sm mb-8">Let&apos;s find something beautiful for you.</p>
          <Link href="/category" className="bg-text-primary text-primary px-6 py-3 text-sm font-medium hover:bg-accent-gold transition-colors uppercase tracking-widest">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`border p-6 bg-card ${highlightedOrderId === order.id ? 'border-accent-gold shadow-[0_0_0_1px_rgba(201,169,110,0.35)]' : 'border-border'}`}
            >
              <div className="flex flex-wrap justify-between gap-4 mb-6 pb-6 border-b border-border">
                <div>
                  <h3 className="font-bold mb-1">Order #{order.order_number}</h3>
                  <p className="text-text-secondary text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold tracking-wide">₹{order.grand_total?.toFixed(2) || '0.00'}</p>
                  <p className="text-text-secondary text-sm uppercase tracking-wider">{order.financial_status || 'Pending'} • {order.fulfillment_status || 'Unfulfilled'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {order.order_items?.map((item: { title: string; quantity: number; unit_price: number }, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">
                      {item.quantity}x {item.title}
                    </span>
                    <span>₹{item.unit_price?.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {(order.financial_status === 'pending' || order.financial_status === 'failed') && (
                <div className="mt-6 pt-6 border-t border-border flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRetryPayment(order.id)}
                    disabled={retryingOrderId === order.id}
                    className="bg-text-primary text-primary px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all hover:bg-accent-gold disabled:opacity-50"
                  >
                    {retryingOrderId === order.id ? 'Opening...' : 'Resume Payment'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </main>
  );
}
