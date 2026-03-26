'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getProductsByCategory, type CategoryBanner } from '@/lib/api/product';
import { getSubcategories } from '@/lib/api/home';
import type { Product, Category } from '@/lib/api/home';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function CategorySlugPage({ params }: PageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryBanner, setCategoryBanner] = useState<CategoryBanner | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');

  useEffect(() => {
    params.then(p => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      getProductsByCategory(slug),
      getSubcategories(slug),
    ]).then(([{ products: prods, categoryName: name, categoryBanner: banner }, subs]) => {
      setProducts(prods);
      setFiltered(prods);
      setCategoryName(name);
      setCategoryBanner(banner);
      setSubcategories(subs);
      setLoading(false);
    });
  }, [slug]);

  const handleApplyFilters = (filters: { priceRange: string; sizes: string[]; sort?: string }) => {
    let result = [...products];
    
    // Price filter
    if (filters.priceRange === 'under-500') result = result.filter(p => p.price < 500);
    else if (filters.priceRange === '500-1000') result = result.filter(p => p.price >= 500 && p.price <= 1000);
    else if (filters.priceRange === 'over-1000') result = result.filter(p => p.price > 1000);

    // Sort
    const sort = filters.sort;
    if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);

    setFiltered(result);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 min-h-screen">
      {categoryBanner ? (
        <section className="relative mb-10 overflow-hidden rounded-[2rem] bg-card">
          <div className="relative min-h-[340px] md:min-h-[460px]">
            <Image
              src={categoryBanner.bannerImage}
              alt={categoryBanner.bannerTitle}
              fill
              className="hidden object-cover md:block"
              sizes="100vw"
            />
            <Image
              src={categoryBanner.bannerMobileImage}
              alt={categoryBanner.bannerTitle}
              fill
              className="object-cover md:hidden"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/44 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 z-10 p-6 md:p-10">
              <div className="max-w-2xl space-y-4">
                <span className="inline-flex border border-accent-gold/30 px-3 py-1 text-xs uppercase tracking-[0.28em] text-accent-gold">
                  {categoryBanner.bannerKicker}
                </span>
                <h1 className="text-4xl font-heading tracking-tight text-white md:text-6xl">{categoryBanner.bannerTitle}</h1>
                <p className="max-w-xl text-sm leading-6 text-white/88 md:text-base">{categoryBanner.bannerDescription}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-secondary mb-8">
        <Link href="/" className="hover:text-accent-gold transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/category" className="hover:text-accent-gold transition-colors">Collections</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-text-primary">{categoryName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8 mb-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-heading tracking-tight">{categoryName}</h1>
          <p className="text-text-secondary text-sm mt-2">{filtered.length} products</p>
        </div>
        <ProductFilters onApply={handleApplyFilters} />
      </div>

      {/* Subcategory pills */}
      {subcategories.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-10">
          <span className="px-4 py-2 text-xs font-semibold border border-accent-gold text-accent-gold tracking-widest uppercase">All</span>
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/category/${sub.slug}`}
              className="px-4 py-2 text-xs font-medium border border-border text-text-primary hover:border-accent-gold hover:text-accent-gold transition-all tracking-widest uppercase"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-text-secondary border border-border bg-card">
          <p className="mb-4 text-lg font-heading">No products found</p>
          <Link href="/category" className="text-sm hover:text-accent-gold transition-colors underline underline-offset-4">
            Browse all collections
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
