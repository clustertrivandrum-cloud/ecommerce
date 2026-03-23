'use client';

import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUserStore } from '@/store/userStore';
import { PreorderModal } from '@/components/modals/PreorderModal';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { Product } from '@/lib/api/home';

interface AddToCartButtonProps {
  product: Product;
  selectedSize: string | null;
  quantity?: number;
  selectedVariantId?: string | null;
  selectedVariantPrice?: number | null;
  selectedVariantStock?: number | null;
  selectedVariantAllowPreorder?: boolean | null;
  selectedVariantLabel?: string | null;
  selectedVariantImage?: string | null;
}

export function AddToCartButton({
  product,
  selectedSize,
  quantity = 1,
  selectedVariantId,
  selectedVariantPrice,
  selectedVariantStock,
  selectedVariantAllowPreorder,
  selectedVariantLabel,
  selectedVariantImage,
}: AddToCartButtonProps) {
  const { user } = useUserStore();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [isPreorderModalOpen, setIsPreorderModalOpen] = useState(false);
  const [isSubmittingPreorder, setIsSubmittingPreorder] = useState(false);
  const [preorderError, setPreorderError] = useState<string | null>(null);
  const [preorderNotice, setPreorderNotice] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  const effectiveStock = selectedVariantStock ?? product.stock;
  const effectivePrice = selectedVariantPrice ?? product.price;
  const allowPreorder = selectedVariantAllowPreorder ?? product.allow_preorder;
  const effectiveVariantId = selectedVariantId || product.variantId || null;
  const effectiveImage = selectedVariantImage || product.image;

  const isSoldOut = effectiveStock === 0 && !allowPreorder;
  const isPreorder = effectiveStock === 0 && allowPreorder;

  const handleAction = () => {
    setPreorderError(null);

    if (isPreorder) {
      setIsPreorderModalOpen(true);
      return;
    }

    setIsAdding(true);
    
    setTimeout(() => {
      addItem({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: effectivePrice,
        image: effectiveImage,
        quantity,
        stock: effectiveStock ?? undefined,
        variantId: selectedVariantId || product.variantId || undefined,
        variantLabel: selectedVariantLabel || selectedSize || undefined,
      });
      setIsAdding(false);
      setAdded(true);
      
      setTimeout(() => setAdded(false), 2000);
    }, 400);
  };

  const handlePreorderConfirm = async (email: string) => {
    if (!effectiveVariantId) {
      const message = 'This product is missing variant data required for preorder.';
      setPreorderError(message);
      throw new Error(message);
    }

    setIsSubmittingPreorder(true);
    setPreorderError(null);

    try {
      const response = await fetch('/api/preorders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          variantId: effectiveVariantId,
          quantity,
        }),
      });

      const payload = await response.json() as { error?: string; alreadyReserved?: boolean };
      if (!response.ok) {
        throw new Error(payload.error || 'Could not reserve preorder.');
      }

      setPreorderNotice(
        payload.alreadyReserved
          ? `A preorder reservation for ${product.name} already exists for ${email.trim().toLowerCase()}.`
          : `Preorder reserved for ${product.name}. Confirmation sent to ${email.trim().toLowerCase()}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not reserve preorder.';
      setPreorderError(message);
      throw error;
    } finally {
      setIsSubmittingPreorder(false);
    }
  };

  return (
    <>
      {preorderNotice && (
        <NoticeBanner
          tone="success"
          className="mb-4"
          onDismiss={() => setPreorderNotice(null)}
        >
          {preorderNotice}
        </NoticeBanner>
      )}

      <button 
        onClick={handleAction}
        disabled={isSoldOut || (isAdding && !isPreorder)}
        className={`w-full py-5 flex items-center justify-center gap-3 font-bold tracking-widest uppercase transition-all
          ${isSoldOut 
            ? 'bg-card text-text-secondary cursor-not-allowed border border-border' 
            : isPreorder 
              ? 'bg-accent-gold text-primary hover:opacity-90 active:scale-[0.98]'
              : added
                ? 'bg-accent-mint text-primary border border-accent-mint'
                : 'bg-text-primary text-primary hover:bg-accent-gold hover:text-primary active:scale-[0.98]'
          }
        `}
      >
        <ShoppingBag className="w-5 h-5" />
        {isSoldOut ? 'Sold Out' : isPreorder ? 'Preorder Now' : added ? 'Added' : isAdding ? 'Adding...' : 'Add to Bag'}
      </button>

      <PreorderModal 
        key={`${product.id}-${effectiveVariantId || 'default'}-${isPreorderModalOpen ? 'open' : 'closed'}`}
        isOpen={isPreorderModalOpen} 
        onClose={() => setIsPreorderModalOpen(false)}
        product={{
          id: product.id,
          name: product.name,
          image: effectiveImage,
          price: effectivePrice
        }}
        onConfirm={handlePreorderConfirm}
        error={preorderError}
        defaultEmail={user?.email || undefined}
        loading={isSubmittingPreorder}
      />
    </>
  );
}
