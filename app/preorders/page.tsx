'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { NoticeBanner } from '@/components/ui/NoticeBanner';

type Preorder = {
  id: string;
  quantity: number;
  status: string;
  createdAt: string;
  productName: string;
  productSlug: string | null;
  productImage: string | null;
  variantLabel: string | null;
  unitPrice: number | null;
  orderId: string | null;
  orderNumber: number | null;
  orderFinancialStatus: string | null;
};

type PreordersResponse = {
  error?: string;
  preorders?: Preorder[];
};

const statusStyles: Record<string, string> = {
  pending: 'border-accent-gold/30 bg-accent-gold/10 text-accent-gold',
  fulfilled: 'border-accent-mint/30 bg-accent-mint/10 text-accent-mint',
  cancelled: 'border-red-500/30 bg-red-950/20 text-red-300',
};

export default function PreordersPage() {
  const { user, session } = useUserStore();
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreorders(accessToken: string) {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/preorders', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: 'no-store',
        });

        const payload = await response.json() as PreordersResponse;
        if (!response.ok) {
          throw new Error(payload.error || 'Could not load preorder history.');
        }

        setPreorders(payload.preorders || []);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Could not load preorder history.');
      } finally {
        setLoading(false);
      }
    }

    if (!user || !session?.access_token) {
      setPreorders([]);
      setLoading(false);
      return;
    }

    loadPreorders(session.access_token);
  }, [session?.access_token, user]);

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-32 flex flex-col items-center">
        <h1 className="text-3xl font-heading mb-6">My Preorders</h1>
        <p className="text-text-secondary mb-8">Please log in to view your preorder reservations.</p>
        <Link href="/auth?redirect=/preorders" className="bg-text-primary text-primary px-8 py-4 text-sm font-medium hover:bg-accent-gold transition-colors uppercase tracking-widest">
          Sign In
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      <h1 className="text-3xl md:text-5xl font-heading tracking-tight mb-16 border-b border-border pb-8">
        My Preorders
      </h1>

      {error && (
        <NoticeBanner tone="error" className="mb-8">
          {error}
        </NoticeBanner>
      )}

      {loading ? (
        <div className="py-20 text-center text-text-secondary animate-pulse">Loading preorder history...</div>
      ) : preorders.length === 0 ? (
        <div className="border border-border bg-card px-8 py-12 text-center">
          <h2 className="text-2xl font-heading mb-4">No preorder reservations yet.</h2>
          <p className="text-text-secondary text-sm mb-8">
            When you reserve an out-of-stock item, it will appear here until it is fulfilled or cancelled.
          </p>
          <Link href="/products" className="bg-text-primary text-primary px-6 py-3 text-sm font-medium hover:bg-accent-gold transition-colors uppercase tracking-widest">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {preorders.map((preorder) => (
            <div key={preorder.id} className="border border-border bg-card p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex gap-4 min-w-0">
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden bg-border">
                    {preorder.productImage ? (
                      <Image
                        src={preorder.productImage}
                        alt={preorder.productName}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    {preorder.productSlug ? (
                      <Link href={`/product/${preorder.productSlug}`} className="text-xl font-heading hover:text-accent-gold transition-colors">
                        {preorder.productName}
                      </Link>
                    ) : (
                      <h2 className="text-xl font-heading">{preorder.productName}</h2>
                    )}

                    {preorder.variantLabel && (
                      <p className="mt-2 text-sm text-text-secondary">{preorder.variantLabel}</p>
                    )}

                    <div className="mt-4 space-y-1 text-sm text-text-secondary">
                      <p>Reserved on {new Date(preorder.createdAt).toLocaleDateString()}</p>
                      <p>Quantity: {preorder.quantity}</p>
                      {preorder.unitPrice !== null && <p>Expected price: ₹{preorder.unitPrice.toFixed(2)}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider ${statusStyles[preorder.status] || 'border-border text-text-secondary'}`}>
                    {preorder.status}
                  </span>
                  <p className="text-sm text-text-secondary max-w-xs md:text-right">
                    {preorder.orderId
                      ? `This reservation has been converted into order #${preorder.orderNumber || preorder.orderId.slice(0, 8)}.`
                      : preorder.status === 'fulfilled'
                      ? 'This reservation has been fulfilled and is ready for payment follow-up.'
                      : preorder.status === 'cancelled'
                        ? 'This reservation has been cancelled and will no longer be held.'
                        : 'Your reservation is pending review. We will contact you when stock is ready.'}
                  </p>
                  {preorder.orderId && (
                    <Link
                      href={`/orders?orderId=${preorder.orderId}&status=${preorder.orderFinancialStatus === 'paid' ? 'paid' : 'pending'}`}
                      className="text-sm font-medium text-accent-gold hover:text-text-primary transition-colors"
                    >
                      View Order
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
