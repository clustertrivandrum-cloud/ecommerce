'use client';

import { useEffect, useState } from 'react';
import { Heart, Minus, Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { AddToCartButton } from './AddToCartButton';
import { Product } from '@/lib/api/home';
import { NoticeBanner } from '@/components/ui/NoticeBanner';
import { useUserStore } from '@/store/userStore';
import { isProductWishlisted, toggleWishlistProduct } from '@/lib/api/wishlist';

interface ProductActionsProps {
  product: Product;
  isStickyMobile?: boolean;
  selectedVariant?: {
    id?: string;
    price?: number;
    stock?: number;
    allowPreorder?: boolean;
    label?: string;
    image?: string;
  } | null;
}

export function ProductActions({ product, isStickyMobile, selectedVariant }: ProductActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const effectivePrice = selectedVariant?.price ?? product.price;
  const effectiveStock = selectedVariant?.stock ?? product.stock;
  const effectiveVariantId = selectedVariant?.id ?? product.variantId;
  const allowPreorder = selectedVariant?.allowPreorder ?? product.allow_preorder;
  const maxSelectableQuantity = effectiveStock > 0 ? effectiveStock : allowPreorder ? 10 : 1;
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistNotice, setWishlistNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setQuantity(1);
  }, [effectiveVariantId]);

  useEffect(() => {
    let cancelled = false;

    async function loadWishlistState() {
      if (!user) {
        if (!cancelled) setIsWishlisted(false);
        return;
      }

      try {
        const saved = await isProductWishlisted(user, product.id);
        if (!cancelled) {
          setIsWishlisted(saved);
        }
      } catch {
        if (!cancelled) {
          setIsWishlisted(false);
        }
      }
    }

    loadWishlistState();

    return () => {
      cancelled = true;
    };
  }, [user, product.id]);

  const decrementQuantity = () => setQuantity((current) => Math.max(1, current - 1));
  const incrementQuantity = () => setQuantity((current) => Math.min(maxSelectableQuantity, current + 1));

  async function handleWishlist() {
    setWishlistNotice(null);

    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(pathname || `/product/${product.slug}`)}`);
      return;
    }

    setWishlistLoading(true);

    try {
      const result = await toggleWishlistProduct(user, product.id);
      setIsWishlisted(result.isWishlisted);
      setWishlistNotice({
        tone: 'success',
        message: result.isWishlisted ? 'Saved to wishlist.' : 'Removed from wishlist.',
      });
    } catch (error) {
      setWishlistNotice({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Could not update wishlist.',
      });
    } finally {
      setWishlistLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {wishlistNotice ? (
          <NoticeBanner tone={wishlistNotice.tone} onDismiss={() => setWishlistNotice(null)}>
            {wishlistNotice.message}
          </NoticeBanner>
        ) : null}

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card/82 px-4 py-3 backdrop-blur-sm">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-text-secondary">Quantity</div>
            <div className="mt-1 text-sm text-text-secondary">
              {effectiveStock > 0 ? `${effectiveStock} available` : allowPreorder ? 'Available on preorder' : 'Currently unavailable'}
            </div>
          </div>
          <div className="inline-flex items-center rounded-full border border-border bg-primary/5">
            <button
              type="button"
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className="p-3 text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-sm font-medium">{quantity}</span>
            <button
              type="button"
              onClick={incrementQuantity}
              disabled={quantity >= maxSelectableQuantity}
              className="p-3 text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AddToCartButton
          product={product}
          selectedSize={null}
          quantity={quantity}
          selectedVariantId={effectiveVariantId}
          selectedVariantPrice={effectivePrice}
          selectedVariantStock={effectiveStock}
          selectedVariantAllowPreorder={selectedVariant?.allowPreorder}
          selectedVariantLabel={selectedVariant?.label}
          selectedVariantImage={selectedVariant?.image}
        />
        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          className={`w-full py-4 border text-xs font-medium tracking-widest uppercase transition-colors ${isWishlisted ? 'border-accent-gold text-accent-gold bg-card/82' : 'border-border bg-card/72 text-text-secondary hover:bg-card'} disabled:opacity-60`}
        >
          <span className="inline-flex items-center gap-2">
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
            {wishlistLoading ? 'Saving...' : isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
          </span>
        </button>
      </div>

      {isStickyMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-primary/95 backdrop-blur-md border-t border-border z-[90] flex items-center gap-4 md:hidden animate-in slide-in-from-bottom-full duration-300">
          <div className="flex-1">
            <span className="block text-xs text-text-secondary uppercase tracking-widest">{product.name}</span>
            <span className="block font-semibold">₹{effectivePrice.toFixed(0)} x {quantity}</span>
          </div>
          <div className="flex-1">
             <AddToCartButton
               product={product}
               selectedSize={null}
               quantity={quantity}
               selectedVariantId={effectiveVariantId}
               selectedVariantPrice={effectivePrice}
	             selectedVariantStock={effectiveStock}
	             selectedVariantAllowPreorder={selectedVariant?.allowPreorder}
	             selectedVariantLabel={selectedVariant?.label}
               selectedVariantImage={selectedVariant?.image}
	             />
          </div>
        </div>
      )}
    </>
  );
}
