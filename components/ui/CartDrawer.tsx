'use client';

import { useCartStore } from '@/store/cartStore';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2, X, ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, total } = useCartStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] bg-primary/80 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-[101] h-full w-full max-w-md bg-card border-l border-border flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-heading tracking-widest uppercase">
            Order ({items.reduce((acc, i) => acc + i.quantity, 0)})
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {items.length === 0 ? (
            <div className="text-center text-text-secondary mt-12">
              <p>Your cart is empty.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.id}-${item.variantId || 'default'}`} className="flex gap-4 group">
                <div className="relative w-24 h-32 bg-border flex-shrink-0">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  )}
                </div>
                
                <div className="flex flex-col flex-1 py-1">
                  <div className="flex justify-between items-start mb-1">
                    <Link href={item.slug ? `/product/${item.slug}` : '#'} onClick={onClose} className="font-heading hover:text-accent-gold transition-colors text-sm">
                      {item.name}
                    </Link>
                  </div>
                  
                  <p className="text-text-secondary text-xs mb-4">{item.variantLabel || 'Standard'}</p>
                  
                  <div className="mt-auto flex items-center justify-between w-full">
                    <div className="flex items-center border border-border">
                      <button 
                        onClick={() => updateQuantity(item.id, item.variantId, item.quantity - 1)}
                        className="px-2 py-1 hover:bg-primary transition-colors text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.variantId, item.quantity + 1)}
                        className="px-2 py-1 hover:bg-primary transition-colors text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-light">₹{(item.price * item.quantity).toFixed(2)}</span>
                      <button 
                        onClick={() => removeItem(item.id, item.variantId)}
                        className="text-text-secondary hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-border bg-card">
            <div className="flex justify-between items-center text-lg font-heading tracking-wide mb-6">
              <span>Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            
            <Link 
              href="/checkout"
              onClick={onClose}
              className="flex items-center justify-between w-full bg-text-primary text-primary px-8 py-4 font-bold tracking-widest uppercase transition-all hover:bg-accent-gold hover:text-primary active:scale-[0.98] group"
            >
              Checkout 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex gap-2 text-text-secondary/60 items-center">
                <Lock className="w-3 h-3" />
                <span className="text-[10px] tracking-widest uppercase">Secure Encrypted Checkout</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
