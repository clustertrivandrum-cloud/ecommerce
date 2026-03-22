'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';

type OutstandingOrder = {
  id: string;
  order_number: string;
  financial_status: string;
  grand_total: number;
  created_at: string;
  guest_email?: string | null;
  guest_phone?: string | null;
};

type WebhookEvent = {
  id: string;
  delivery_id: string;
  event_type: string;
  status: string;
  first_seen_at: string;
  processed_at?: string | null;
  last_error?: string | null;
};

type DebugPayload = {
  health: {
    siteUrl: string | null;
    webhookUrl: string | null;
    hasSiteUrl: boolean;
    hasRazorpayKeys: boolean;
    hasWebhookSecret: boolean;
  };
  outstandingOrders: OutstandingOrder[];
  webhookEvents: WebhookEvent[];
};

export default function PaymentDebugPage() {
  const { user } = useUserStore();
  const [data, setData] = useState<DebugPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDiagnostics() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/debug/payments', { cache: 'no-store' });
      const payload = await response.json() as DebugPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Could not load payment diagnostics.');
      }

      setData(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load payment diagnostics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadDiagnostics();
  }, [user]);

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-32 flex flex-col items-center">
        <h1 className="text-3xl font-heading mb-6">Payment Debug</h1>
        <p className="text-text-secondary mb-8">Please log in to view payment diagnostics.</p>
        <Link href="/auth" className="bg-text-primary text-primary px-8 py-4 text-sm font-medium hover:bg-accent-gold transition-colors uppercase tracking-widest">
          Sign In
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      <div className="flex items-center justify-between gap-6 mb-12 border-b border-border pb-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-heading tracking-tight">Payment Debug</h1>
          <p className="text-text-secondary mt-3 text-sm">Webhook health, idempotency status, and recent unresolved orders.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void loadDiagnostics()}
            className="text-sm uppercase tracking-widest text-text-secondary hover:text-accent-gold transition-colors"
          >
            Refresh
          </button>
          <Link href="/orders" className="text-sm uppercase tracking-widest text-text-secondary hover:text-accent-gold transition-colors">
            Back to Orders
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><p className="text-text-secondary animate-pulse">Loading diagnostics...</p></div>
      ) : error ? (
        <div className="border border-border bg-card px-6 py-4 text-sm text-red-400">{error}</div>
      ) : data && (
        <div className="space-y-10">
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatusCard label="Site URL" value={data.health.hasSiteUrl ? 'Configured' : 'Missing'} tone={data.health.hasSiteUrl ? 'good' : 'bad'} />
            <StatusCard label="Razorpay Keys" value={data.health.hasRazorpayKeys ? 'Present' : 'Missing'} tone={data.health.hasRazorpayKeys ? 'good' : 'bad'} />
            <StatusCard label="Webhook Secret" value={data.health.hasWebhookSecret ? 'Present' : 'Missing'} tone={data.health.hasWebhookSecret ? 'good' : 'bad'} />
            <StatusCard label="Outstanding Orders" value={String(data.outstandingOrders.length)} tone={data.outstandingOrders.length > 0 ? 'warn' : 'good'} />
            <StatusCard label="Recent Webhooks" value={String(data.webhookEvents.length)} tone={data.webhookEvents.some((event) => event.status === 'failed') ? 'warn' : 'good'} />
          </section>

          <section className="border border-border bg-card p-6">
            <h2 className="text-xl font-heading mb-4">Webhook Endpoint</h2>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>Site URL: <span className="text-text-primary">{data.health.siteUrl || 'Not derived'}</span></p>
              <p>Webhook URL: <span className="text-text-primary break-all">{data.health.webhookUrl || 'Not derived'}</span></p>
              <p>Events: <span className="text-text-primary">payment.failed, payment.captured, order.paid</span></p>
            </div>
          </section>

          <section className="border border-border bg-card p-6">
            <h2 className="text-xl font-heading mb-4">Recent Pending / Failed Orders</h2>
            {data.outstandingOrders.length === 0 ? (
              <p className="text-sm text-text-secondary">No pending or failed orders.</p>
            ) : (
              <div className="space-y-3">
                {data.outstandingOrders.map((order) => (
                  <div key={order.id} className="flex flex-col gap-2 border border-border px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-text-primary">Order #{order.order_number}</p>
                      <p className="text-text-secondary">{new Date(order.created_at).toLocaleString()}</p>
                      <p className="text-text-secondary">{order.guest_email || order.guest_phone || order.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="uppercase tracking-widest text-xs text-text-secondary">{order.financial_status}</span>
                      <span className="font-medium text-text-primary">₹{order.grand_total?.toFixed(2) || '0.00'}</span>
                      <Link href={`/orders?orderId=${order.id}`} className="text-xs uppercase tracking-widest text-accent-gold hover:text-text-primary transition-colors">
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border border-border bg-card p-6">
            <h2 className="text-xl font-heading mb-4">Recent Webhook Events</h2>
            {data.webhookEvents.length === 0 ? (
              <p className="text-sm text-text-secondary">No webhook events logged yet.</p>
            ) : (
              <div className="space-y-3">
                {data.webhookEvents.map((event) => (
                  <div key={event.id} className="border border-border px-4 py-3 text-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-text-primary">{event.event_type}</p>
                        <p className="text-text-secondary break-all">{event.delivery_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="uppercase tracking-widest text-xs text-text-secondary">{event.status}</p>
                        <p className="text-text-secondary">{new Date(event.first_seen_at).toLocaleString()}</p>
                      </div>
                    </div>
                    {event.last_error && (
                      <p className="mt-3 text-red-400">{event.last_error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad';
}) {
  const toneClass = tone === 'good'
    ? 'text-accent-mint'
    : tone === 'warn'
      ? 'text-accent-gold'
      : 'text-red-400';

  return (
    <div className="border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-widest text-text-secondary mb-2">{label}</p>
      <p className={`text-lg font-medium ${toneClass}`}>{value}</p>
    </div>
  );
}
