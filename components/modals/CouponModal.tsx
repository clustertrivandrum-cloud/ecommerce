'use client';

import { X, Tag } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (discount: number, code: string) => void;
  cartTotal: number;
}

export function CouponModal({ isOpen, onClose, onApply, cartTotal }: CouponModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
