'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { getProductsByCategory, type CategoryBanner } from '@/lib/api/product';
import { getSubcategories } from '@/lib/api/home';
import type { Product, Category } from '@/lib/api/home';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PRODUCTS_PER_PAGE = 12;

interface CategoryShellProps {
  slug: string;
}

// ── Reusable Pagination ───────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  function getPages(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="mt-16 flex flex-col items-center gap-4">
      <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/60 text-text-secondary transition-all hover:border-accent-gold hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1">
          {getPages().map((p, i) =>
            p === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="flex h-10 w-10 items-center justify-center text-sm text-text-secondary"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? 'page' : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-all ${
                  p === currentPage
                    ? 'border-accent-gold bg-accent-gold text-primary'
                    : 'border-border bg-card/60 text-text-secondary hover:border-accent-gold hover:text-accent-gold'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/60 text-text-secondary transition-all hover:border-accent-gold hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {totalPages > 5 && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="uppercase tracking-[0.18em]">Go to page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            key={currentPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = Math.min(totalPages, Math.max(1, Number((e.target as HTMLInputElement).value)));
                onPageChange(val);
              }
            }}
            className="w-14 rounded-full border border-border bg-card/60 px-3 py-1.5 text-center text-xs outline-none focus:border-accent-gold"
          />
        </div>
      )}
    </div>
  );
}

// ── Main Shell ────────────────────────────────────────────────
export default function CategoryShell({ slug }: CategoryShellProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryBanner, setCategoryBanner] = useState<CategoryBanner | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setCurrentPage(1);
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
    }).catch((err) => {
      console.error('CategoryShell fetch error:', err);
      setLoading(false);
    });
  }, [slug]);

  const handleApplyFilters = (filters: { priceRange: string; sizes: string[]; sort?: string }) => {
    let result = [...products];

    if (filters.priceRange === 'under-500') result = result.filter(p => p.price < 500);
    else if (filters.priceRange === '500-1000') result = result.filter(p => p.price >= 500 && p.price <= 1000);
    else if (filters.priceRange === 'over-1000') result = result.filter(p => p.price > 1000);

    if (filters.sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'price-desc') result.sort((a, b) => b.price - a.price);

    setFiltered(result);
    setCurrentPage(1); // reset to page 1 on filter change
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PRODUCTS_PER_PAGE;
  const paginated = useMemo(
    () => filtered.slice(pageStart, pageStart + PRODUCTS_PER_PAGE),
    [filtered, pageStart]
  );

  function handlePageChange(page: number) {
    const next = Math.min(totalPages, Math.max(1, page));
    setCurrentPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 min-h-screen">
      {/* Category banner */}
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
                <h1 className="text-4xl font-heading tracking-tight text-white md:text-6xl">
                  {categoryBanner.bannerTitle}
                </h1>
                <p className="max-w-xl text-sm leading-6 text-white/88 md:text-base">
                  {categoryBanner.bannerDescription}
                </p>
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
          {!categoryBanner && (
            <h1 className="text-3xl md:text-5xl font-heading tracking-tight">{categoryName}</h1>
          )}
          {categoryBanner && (
            <h2 className="text-3xl md:text-5xl font-heading tracking-tight">{categoryName}</h2>
          )}
          <p className="text-text-secondary text-sm mt-2">
            {loading ? (
              <span className="inline-block h-4 w-32 animate-pulse rounded bg-card" />
            ) : (
              <>
                {filtered.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + PRODUCTS_PER_PAGE, filtered.length)} of{' '}
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}
              </>
            )}
          </p>
        </div>
        <ProductFilters onApply={handleApplyFilters} />
      </div>

      {/* Subcategory pills */}
      {subcategories.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-10">
          <span className="px-4 py-2 text-xs font-semibold border border-accent-gold text-accent-gold tracking-widest uppercase">
            All
          </span>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array(PRODUCTS_PER_PAGE).fill(0).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-text-secondary border border-border bg-card">
          <p className="mb-4 text-lg font-heading">No products in this category</p>
          <Link
            href="/category"
            className="text-sm hover:text-accent-gold transition-colors underline underline-offset-4"
          >
            Browse all collections
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
            {paginated.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </main>
  );
}
