'use client';

import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabase';
import { getOrCreateCustomer } from '@/lib/api/customer';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/lib/api/home';

type WishlistVariantRow = {
  id: string;
  price: number | null;
  compare_at_price?: number | null;
  allow_preorder?: boolean | null;
  inventory_items?: Array<{ available_quantity: number | null }> | null;
  variant_media?: Array<{ media_url?: string | null; position?: number | null }> | null;
};

type WishlistProductRow = {
  id: string;
  title: string;
  slug: string;
  is_free_delivery?: boolean | null;
  product_variants?: WishlistVariantRow[] | null;
  product_media?: Array<{ media_url?: string | null }> | null;
};

type WishlistItemRow = {
  product_id: string;
  products: WishlistProductRow | WishlistProductRow[] | null;
};

function getWishlistProduct(item: WishlistItemRow): WishlistProductRow | null {
  if (Array.isArray(item.products)) {
    return item.products[0] ?? null;
  }

  return item.products ?? null;
}

export default function WishlistPage() {
  const { user } = useUserStore();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchWishlist() {
      const customerId = await getOrCreateCustomer(user!);
      if (!customerId) {
         setItems([]);
         setLoading(false);
         return;
      }

      // First find the user's wishlist
      const { data: wishlist } = await supabase
        .from('wishlists')
        .select('id')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true })
        .limit(1);
      
      // Since it's a test, if there is no wishlist, let's just show empty
      if (!wishlist || wishlist.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Then fetch items
      const { data: wishlistItems } = await supabase
        .from('wishlist_items')
        .select(`
          product_id,
          products (
            id, title, slug, is_free_delivery,
            product_variants (
              id,
              price,
              compare_at_price,
              allow_preorder,
              inventory_items ( location_id, available_quantity ),
              variant_media ( media_url, position )
            ),
            product_media ( media_url )
          )
        `)
        .eq('wishlist_id', wishlist[0].id);

      if (wishlistItems) {
        const shaped = (wishlistItems as WishlistItemRow[])
          .flatMap((item): Product[] => {
            const p = getWishlistProduct(item);

            if (!p) {
              return [];
            }

            const variants = (p.product_variants || []).map((v) => {
              const sortedVariantMedia = (v.variant_media || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
              const stock = (v.inventory_items || []).reduce(
                (sum: number, row) => sum + (row?.available_quantity || 0),
                0
              );

              return {
                ...v,
                stock,
                images: sortedVariantMedia.map((media) => media.media_url).filter((value): value is string => Boolean(value)),
              };
            });
            const defaultVariant = variants.find((v) => v.stock > 0) || variants[0] || {};
            const defaultMedia = defaultVariant.images?.[0] || p.product_media?.[0]?.media_url;

            return [{
              id: p.id,
              name: p.title,
              slug: p.slug,
              price: defaultVariant.price || 0,
              original_price: defaultVariant.compare_at_price || undefined,
              image: defaultMedia || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500&q=80',
              stock: defaultVariant.stock || 0,
              allow_preorder: defaultVariant.allow_preorder || false,
              is_free_delivery: p.is_free_delivery ?? undefined,
              variantId: defaultVariant.id
            }];
          });

        setItems(shaped);
      }
      setLoading(false);
    }
    fetchWishlist();
  }, [user]);

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-32 flex flex-col items-center text-center">
        <h1 className="text-3xl font-heading mb-6 tracking-widest uppercase">Your Wishlist</h1>
        <p className="text-text-secondary mb-8">Please log in to view your saved items.</p>
        <Link href="/auth" className="bg-text-primary text-primary px-8 py-4 text-sm font-medium hover:bg-accent-gold transition-colors tracking-widest uppercase">
          Sign In
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      <h1 className="text-3xl md:text-5xl font-heading tracking-tight mb-16 border-b border-border pb-8">
        Saved Items
      </h1>

      {loading ? (
        <div className="py-20 text-center"><p className="text-text-secondary animate-pulse">Loading wishlist...</p></div>
      ) : items.length === 0 ? (
        <div className="col-span-full py-20 text-center text-text-secondary border border-border bg-card">
          <p className="mb-4">You haven&apos;t saved any items yet.</p>
          <Link href="/category" className="bg-transparent border border-border px-6 py-3 text-sm font-medium hover:bg-text-primary hover:text-primary transition-colors inline-block mt-4 uppercase tracking-widest">
            Discover Arrivals
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-8 mt-12">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
