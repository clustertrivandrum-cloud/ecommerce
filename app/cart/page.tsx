'use client';

import { useCartStore } from '@/store/cartStore';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { CouponModal } from '@/components/modals/CouponModal';

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCartStore();
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [discount, setDiscount] = useState({ amount: 0, code: '' });

  if (items.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-32 min-h-[60vh] flex flex-col items-center justify-center space-y-8 text-center">
        <h1 className="text-4xl font-heading tracking-widest uppercase">Your Cart is Empty</h1>
        <p className="text-text-secondary max-w-sm">
          Discover our latest collection and find something exceptional to elevate your wardrobe.
        </p>
        <Link 
          href="/category" 
          className="bg-text-primary text-primary px-8 py-4 font-medium text-sm transition-all hover:bg-accent-gold hover:text-primary active:scale-95 uppercase tracking-wider"
        >
          Explore Collection
        </Link>
      </main>
    );
  }

  const finalTotal = total - discount.amount;

  return (
    <>
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
        <h1 className="text-3xl md:text-5xl font-heading tracking-tight mb-16 border-b border-border pb-8">
          Shopping Cart ({items.reduce((acc, i) => acc + i.quantity, 0)})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-24">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-12">
            {items.map((item) => (
              <div key={`${item.id}-${item.variantId || 'default'}`} className="flex gap-6 group">
                <div className="relative aspect-[3/4] w-32 md:w-40 bg-card flex-shrink-0 cursor-pointer">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-border" />
                  )}
                </div>
                
                <div className="flex flex-col flex-1 py-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium font-heading">
                      <Link href={item.slug ? `/product/${item.slug}` : '#'} className="hover:text-accent-gold transition-colors">{item.name}</Link>
                    </h3>
                    <p className="text-lg font-light">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  
                  <p className="text-text-secondary text-sm mb-6">{item.variantLabel || 'Standard'}</p>
                  
                  <div className="mt-auto flex items-center justify-between border border-border w-max">
                    <button 
                      onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)}
                      className="p-3 hover:bg-card hover:text-accent-gold transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)}
                      className="p-3 hover:bg-card hover:text-accent-mint transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <button 
                  onClick={() => removeItem(item.id, item.variantId)}
                  className="self-start p-2 text-text-secondary hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 pt-8 lg:pt-0">
            <div className="bg-card p-8 sticky top-32">
              <h2 className="text-2xl font-heading mb-8">Order Summary</h2>
              
              <div className="space-y-4 text-sm font-medium mb-8 border-b border-border pb-8">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Subtotal</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                
                {discount.amount > 0 && (
                  <div className="flex justify-between text-accent-mint">
                    <span>Discount ({discount.code})</span>
                    <span>-${discount.amount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <button 
                    onClick={() => setIsCouponModalOpen(true)}
                    className="text-text-secondary underline underline-offset-4 hover:text-accent-gold transition-colors"
                  >
                    Apply Coupon Code
                  </button>
                </div>
                
                <div className="flex justify-between mt-4">
                  <span className="text-text-secondary">Shipping</span>
                  <span>Calculated at next step</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Taxes</span>
                  <span>Calculated at next step</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xl font-medium mb-10 font-heading tracking-wide">
                <span>Estimated Total</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
              
              <Link 
                href="/checkout" 
                className="flex items-center justify-between w-full bg-text-primary text-primary px-8 py-5 font-bold tracking-widest uppercase transition-all hover:bg-accent-gold hover:text-primary active:scale-[0.98] group"
              >
                Secure Checkout 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <p className="text-text-secondary text-xs mt-6 leading-relaxed flex items-center gap-2 justify-center">
                Free returns & exchanges within 30 days.
              </p>
            </div>
          </div>
        </div>
      </main>

      <CouponModal 
        isOpen={isCouponModalOpen} 
        onClose={() => setIsCouponModalOpen(false)} 
        onApply={(amount, code) => setDiscount({ amount, code })}
        cartTotal={total}
      />
    </>
  );
}
