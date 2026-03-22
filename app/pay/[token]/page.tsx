'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { NoticeBanner } from '@/components/ui/NoticeBanner';

type PaymentRequestOrderItem = {
  id: string;
  title: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type PaymentRequestOrder = {
  id: string;
  orderNumber: number | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  grandTotal: number;
  currency: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  createdAt: string;
  paymentRequestCreatedAt: string | null;
  items: PaymentRequestOrderItem[];
};

type PaymentRequestResponse = {
  error?: string;
  order?: PaymentRequestOrder;
};

type PaymentSessionResponse = {
  error?: string;
  orderId?: string;
  razorpayOrderId?: string | null;
  amount?: number;
  razorpayKeyId?: string | null;
};

type VerifyPaymentResponse = {
  error?: string;
};

type CheckoutStatusResponse = {
  error?: string;
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
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void | Promise<void>) => void;
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

type Notice = {
  tone: 'error' | 'success' | 'info';
  text: string;
};

export default function PaymentRequestPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [order, setOrder] = useState<PaymentRequestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadOrder = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/payment-request/${token}`, { cache: 'no-store' });
      const payload = await response.json() as PaymentRequestResponse;

      if (!response.ok || !payload.order) {
        throw new Error(payload.error || 'Payment request not found.');
      }

      setOrder(payload.order);
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not load payment request.',
      });
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handlePayNow = async () => {
    if (!token || !order) return;

    setSubmitting(true);
    setNotice(null);

    try {
      const sessionResponse = await fetch(`/api/payment-request/${token}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const sessionPayload = await sessionResponse.json() as PaymentSessionResponse;
      if (!sessionResponse.ok || !sessionPayload.orderId || !sessionPayload.razorpayOrderId || !sessionPayload.amount) {
        throw new Error(sessionPayload.error || 'Could not create payment session.');
      }

      let terminalStateHandled = false;

      const markFailed = async (razorpayOrderId: string, message: string) => {
        if (terminalStateHandled) return;
        terminalStateHandled = true;

        try {
          const statusResponse = await fetch('/api/checkout/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: sessionPayload.orderId,
              amount: sessionPayload.amount! / 100,
              razorpayOrderId,
              status: 'failed',
            }),
          });

          const statusPayload = await statusResponse.json() as CheckoutStatusResponse;
          if (!statusResponse.ok) {
            throw new Error(statusPayload.error || 'Could not update payment status.');
          }
        } catch (statusError) {
          console.error(statusError);
        }

        setNotice({
          tone: 'error',
          text: message,
        });
        await loadOrder();
      };

      const RazorpayCtor = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!RazorpayCtor) {
        throw new Error('Razorpay SDK failed to load.');
      }

      const options: RazorpayCheckoutOptions = {
        key: sessionPayload.razorpayKeyId || null,
        amount: sessionPayload.amount,
        currency: order.currency || 'INR',
        name: 'Cluster Fascination',
        description: `Payment for order #${order.orderNumber || order.id.slice(0, 8)}`,
        order_id: sessionPayload.razorpayOrderId,
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: sessionPayload.orderId,
                amount: sessionPayload.amount! / 100,
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyPayload = await verifyResponse.json() as VerifyPaymentResponse;
            if (!verifyResponse.ok) {
              throw new Error(verifyPayload.error || 'Payment verification failed.');
            }

            terminalStateHandled = true;
            setNotice({
              tone: 'success',
              text: 'Payment confirmed. Your order has been paid successfully.',
            });
            await loadOrder();
          } catch (verificationError) {
            await markFailed(
              paymentResponse.razorpay_order_id,
              verificationError instanceof Error ? verificationError.message : 'Payment verification failed.'
            );
          }
        },
        prefill: {
          name: order.guestName || '',
          email: order.guestEmail || '',
          contact: order.guestPhone || '',
        },
        theme: {
          color: '#C9A96E',
        },
        modal: {
          ondismiss: () => {
            if (terminalStateHandled) return;
            setNotice({
              tone: 'info',
              text: 'Payment was not completed. You can reopen this payment request any time.',
            });
          },
        },
      };

      const rzp = new RazorpayCtor(options);
      rzp.on('payment.failed', async (failureResponse) => {
        const failureMessage = failureResponse.error?.description || 'Payment failed.';
        const failureOrderId = failureResponse.error?.metadata?.order_id || sessionPayload.razorpayOrderId || '';
        await markFailed(failureOrderId, failureMessage);
      });
      rzp.open();
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not start payment.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="border-b border-border pb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-text-secondary mb-4">Secure Payment Request</p>
          <h1 className="text-3xl md:text-5xl font-heading tracking-tight">
            {order?.orderNumber ? `Order #${order.orderNumber}` : 'Payment Request'}
          </h1>
          {order && (
            <p className="mt-4 text-sm text-text-secondary">
              Created on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {notice && (
          <NoticeBanner tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.text}
          </NoticeBanner>
        )}

        {loading ? (
          <div className="border border-border bg-card px-8 py-16 text-center text-text-secondary animate-pulse">
            Loading payment request...
          </div>
        ) : !order ? (
          <div className="border border-border bg-card px-8 py-16 text-center">
            <h2 className="text-2xl font-heading mb-4">Payment request unavailable</h2>
            <p className="text-text-secondary text-sm">
              This link is invalid or no longer active.
            </p>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="border border-border bg-card p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-heading mb-3">Order Summary</h2>
                <p className="text-sm text-text-secondary">
                  Complete payment to confirm this preorder order.
                </p>
              </div>

              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p>{item.title || 'Item'}</p>
                      <p className="text-text-secondary">Qty {item.quantity}</p>
                    </div>
                    <span>₹{item.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-6 flex items-center justify-between text-lg font-heading">
                <span>Total Due</span>
                <span className="text-accent-gold">₹{order.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="border border-border bg-card p-8 h-max space-y-6">
              <div>
                <h2 className="text-xl font-heading mb-3">Payment</h2>
                <p className="text-sm text-text-secondary flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Powered by Razorpay secure checkout.
                </p>
              </div>

              <div className="space-y-2 text-sm text-text-secondary">
                {order.guestName && <p>Name: {order.guestName}</p>}
                {order.guestEmail && <p>Email: {order.guestEmail}</p>}
                {order.guestPhone && <p>Phone: {order.guestPhone}</p>}
                <p>Status: <span className="uppercase text-text-primary">{order.financialStatus || 'pending'}</span></p>
              </div>

              <button
                type="button"
                onClick={handlePayNow}
                disabled={submitting || order.financialStatus === 'paid'}
                className="w-full bg-accent-mint text-primary py-4 font-bold tracking-widest uppercase transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {order.financialStatus === 'paid' ? 'Already Paid' : submitting ? 'Opening Payment...' : 'Pay Now'}
              </button>
            </div>
          </div>
        )}
      </div>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    </main>
  );
}
