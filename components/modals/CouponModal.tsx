'use client';

import { X, Tag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number | string | null;
  min_order_value: number | string | null;
  max_discount: number | string | null;
  usage_limit: number | null;
  used_count: number | null;
  is_active: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
};

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (discount: number, code: string) => void;
  cartTotal: number;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDiscountAmount(coupon: CouponRow, orderTotal: number) {
  if (coupon.discount_type === 'percentage') {
    const amount = orderTotal * (toNumber(coupon.discount_value) / 100);
    const maxDiscount = toNumber(coupon.max_discount);
    return maxDiscount > 0 ? Math.min(amount, maxDiscount) : amount;
  }

  return toNumber(coupon.discount_value);
}

function isCouponEligible(coupon: CouponRow, orderTotal: number) {
  const now = new Date();

  if (!coupon.is_active) return false;
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return false;
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return false;
  if (coupon.usage_limit && (coupon.used_count || 0) >= coupon.usage_limit) return false;
  if (toNumber(coupon.min_order_value) > 0 && orderTotal < toNumber(coupon.min_order_value)) return false;

  return getDiscountAmount(coupon, orderTotal) > 0;
}

function getCouponOfferLabel(coupon: CouponRow) {
  if (coupon.discount_type === 'percentage') {
    const maxDiscount = toNumber(coupon.max_discount);
    return `${toNumber(coupon.discount_value)}% off${maxDiscount > 0 ? ` up to ₹${maxDiscount}` : ''}`;
  }

  return `Flat ₹${toNumber(coupon.discount_value)} off`;
}

export function CouponModal({ isOpen, onClose, onApply, cartTotal }: CouponModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadCoupons = async () => {
      setCouponsLoading(true);

      const { data, error: fetchError } = await supabase
        .from('coupons')
        .select('id, code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, used_count, is_active, starts_at, expires_at')
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (fetchError || !data) {
          setCoupons([]);
        } else {
          setCoupons(data as CouponRow[]);
        }
        setCouponsLoading(false);
      }
    };

    void loadCoupons();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const eligibleCoupons = useMemo(
    () =>
      coupons
        .filter((coupon) => isCouponEligible(coupon, cartTotal))
        .sort((a, b) => getDiscountAmount(b, cartTotal) - getDiscountAmount(a, cartTotal)),
    [coupons, cartTotal]
  );

  const applyCoupon = (coupon: CouponRow) => {
    const discountAmount = getDiscountAmount(coupon, cartTotal);
    if (discountAmount <= 0) return;

    onApply(discountAmount, coupon.code);
    onClose();
  };

  if (!isOpen) return null;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    setError(null);

    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', code.trim().toUpperCase())
      .maybeSingle();

    if (fetchError || !coupon) {
      setError('Invalid coupon code.');
    } else if (!coupon.is_active) {
      setError('This coupon is no longer active.');
    } else if (coupon.min_order_value && cartTotal < coupon.min_order_value) {
      setError(`Minimum order value of ₹${coupon.min_order_value} required.`);
    } else {
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = cartTotal * (coupon.discount_value / 100);
        if (coupon.max_discount && discountAmount > coupon.max_discount) {
          discountAmount = coupon.max_discount;
        }
      } else {
        discountAmount = coupon.discount_value;
      }

      onApply(discountAmount, coupon.code);
      onClose();
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-card border border-border flex flex-col p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            <h2 className="text-xl font-heading tracking-widest uppercase">Apply Coupon</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary transition-colors -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="space-y-4 text-sm">
          {error && <p className="text-red-400 text-xs bg-red-950/30 p-3 border border-red-500/50">{error}</p>}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-text-secondary">Eligible coupons</p>
              {eligibleCoupons.length > 0 ? (
                <span className="text-[11px] uppercase tracking-[0.2em] text-accent-gold">
                  {eligibleCoupons.length} available
                </span>
              ) : null}
            </div>

            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {couponsLoading ? (
                <div className="border border-border bg-primary/20 p-4 text-xs text-text-secondary">
                  Loading coupons...
                </div>
              ) : eligibleCoupons.length > 0 ? (
                eligibleCoupons.map((coupon) => (
                  <button
                    key={coupon.id}
                    type="button"
                    onClick={() => applyCoupon(coupon)}
                    className="w-full border border-border bg-primary/20 p-4 text-left transition-colors hover:border-accent-gold hover:bg-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-text-primary">
                          {coupon.code}
                        </p>
                        <p className="mt-1 text-sm text-text-primary">{getCouponOfferLabel(coupon)}</p>
                        {coupon.description ? (
                          <p className="mt-1 text-xs text-text-secondary">{coupon.description}</p>
                        ) : null}
                        {toNumber(coupon.min_order_value) > 0 ? (
                          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-text-secondary">
                            Valid on orders above ₹{toNumber(coupon.min_order_value)}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="block text-xs uppercase tracking-[0.2em] text-accent-mint">
                          Save ₹{getDiscountAmount(coupon, cartTotal).toFixed(0)}
                        </span>
                        <span className="mt-3 inline-block border border-border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-text-primary transition-colors hover:border-accent-gold hover:text-accent-gold">
                          Apply
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="border border-border bg-primary/20 p-4 text-sm text-text-secondary">
                  No eligible coupons for this cart total right now.
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-text-secondary">Have a code?</p>
          </div>

          <input
            required
            placeholder="Enter promo code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="w-full bg-transparent border border-border p-4 outline-none focus:border-text-primary transition-colors placeholder:text-text-secondary/50 uppercase"
          />
          
          <button
            type="submit"
            disabled={loading || !code}
            className="w-full bg-text-primary text-primary py-4 font-bold tracking-widest uppercase transition-all hover:bg-accent-gold hover:text-primary active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Apply Discount'}
          </button>
        </form>
      </div>
    </div>
  );
}
