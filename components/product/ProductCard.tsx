'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    name: string;
    price: number;
    original_price?: number;
    image: string;
    stock: number;
    allow_preorder: boolean;
    rating?: number;
    review_count?: number;
    variantId?: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const isSoldOut = product.stock === 0 && !product.allow_preorder;
  const isPreorder = product.stock === 0 && product.allow_preorder;
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const addItem = useCartStore((state) => state.addItem);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSoldOut || isPreorder) return;
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
      stock: product.stock,
      variantId: product.variantId,
    });
  };

  return (
    <div className="group flex flex-col gap-2 relative">
      <Link href={`/product/${product.slug}`} className="relative aspect-square w-full overflow-hidden bg-card block">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${isSoldOut ? 'opacity-60 grayscale' : ''}`}
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && !isSoldOut && (
            <span className="bg-accent-mint/95 text-primary text-[10px] px-2 py-0.5 font-bold tracking-wide shadow-sm">
              {discount}% OFF
            </span>
          )}
          {isPreorder && (
            <span className="bg-accent-gold text-primary text-[10px] px-2 py-0.5 font-bold tracking-wide">
              PREORDER
            </span>
          )}
          {isSoldOut && (
            <span className="bg-card/90 backdrop-blur-sm text-text-primary text-[10px] px-2 py-0.5 font-medium tracking-wide border border-border">
              SOLD OUT
            </span>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="bg-red-900/92 text-white text-[10px] px-2 py-0.5 font-medium tracking-wide shadow-sm">
              Only {product.stock} left
            </span>
          )}
        </div>

        {/* Quick hover overlay & CTA */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {!isSoldOut && !isPreorder && (
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
            <button 
              onClick={handleQuickAdd}
              className="w-full bg-text-primary text-primary py-3 text-xs font-bold tracking-widest uppercase hover:bg-accent-gold transition-colors"
            >
              Quick Add
            </button>
          </div>
        )}
      </Link>
      
      <Link href={`/product/${product.slug}`} className="flex flex-col gap-1 px-0.5 mt-2">
        <h3 className="text-xs md:text-sm font-medium text-text-primary group-hover:text-accent-gold transition-colors line-clamp-2 leading-relaxed">
          {product.name}
        </h3>
        {isPreorder && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-gold">
            This product is available on preorder
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">
            ₹{product.price.toFixed(0)}
          </span>
          {product.original_price && (
            <span className="text-xs text-text-secondary/80 line-through">
              ₹{product.original_price.toFixed(0)}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
