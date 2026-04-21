'use client';

import { Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { getProducts } from '@/lib/api/product';
import { getCategories } from '@/lib/api/home';
import type { Product, Category } from '@/lib/api/home';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';
import type { ExtendedFilters } from '@/components/modals/FilterModal';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const DEFAULT_FILTERS: ExtendedFilters = {
  priceRange: 'all',
  sizes: [],
  sort: 'featured',
};

const PRODUCTS_PER_PAGE = 12;

// ── Search normalization ──────────────────────────────────────
// "anti tarnish", "antitarnish", "anti-tarnish" all match the same products
function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesSearch(product: Product, query: string) {
  if (!query) return true;
  const normalizedQuery = normalizeForSearch(query);
  const searchableText = normalizeForSearch(
    [
      product.name,
      product.brand,
      product.material,
      product.collection,
      ...(product.variants?.flatMap((v) => Object.values(v.options || {})) || []),
    ]
      .filter(Boolean)
      .join(' ')
  );
  return searchableText.includes(normalizedQuery);
}

function matchesSelectedSizes(product: Product, sizes: string[]) {
  if (sizes.length === 0) return true;
  return (
    product.variants?.some((v) =>
      Object.values(v.options || {}).some((val) => sizes.includes(String(val).toUpperCase()))
    ) ?? false
  );
}

// ── Pagination component ──────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build visible page numbers with ellipsis
  function getPageNumbers() {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  const pages = getPageNumbers();

  return (
    <div className="mt-16 flex flex-col items-center gap-4">
      {/* Page info text */}
      <p className="text-xs uppercase tracking-[0.24em] text-text-secondary">
        Page {currentPage} of {totalPages}
      </p>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Prev */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/60 text-text-secondary transition-all hover:border-accent-gold hover:text-accent-gold disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, i) =>
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
                aria-label={`Go to page ${p}`}
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

        {/* Next */}
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

      {/* Jump to page — only show if more than 5 pages */}
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

// ── Main page ──────────────────────────────────────────────────
function ProductsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(() => searchParams.get('search') || '');
  const [filters, setFilters] = useState<ExtendedFilters>(DEFAULT_FILTERS);
  const [filtersResetKey, setFiltersResetKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, Number(searchParams.get('page') || 1)));

  const deferredSearchText = useDeferredValue(searchText);

  // Sync URL params
  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  useEffect(() => {
    Promise.all([getProducts(), getCategories()]).then(([prods, cats]) => {
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
    updateParams({ page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearchText, filters]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (deferredSearchText.trim()) {
      result = result.filter((p) => matchesSearch(p, deferredSearchText));
    }

    if (filters.categoryId) {
      result = result.filter(
        (p) => p.categoryId === filters.categoryId || p.parentCategoryId === filters.categoryId
      );
    }

    if (filters.subcategoryId) {
      result = result.filter((p) => p.categoryId === filters.subcategoryId);
    }

    if (filters.sizes.length > 0) {
      result = result.filter((p) => matchesSelectedSizes(p, filters.sizes));
    }

    if (filters.priceRange === 'under-500') result = result.filter((p) => p.price < 500);
    else if (filters.priceRange === '500-1000') result = result.filter((p) => p.price >= 500 && p.price <= 1000);
    else if (filters.priceRange === 'over-1000') result = result.filter((p) => p.price > 1000);

    if (filters.sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'price-desc') result.sort((a, b) => b.price - a.price);

    return result;
  }, [deferredSearchText, filters, products]);

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PRODUCTS_PER_PAGE;
  const pageEnd = pageStart + PRODUCTS_PER_PAGE;
  const paginated = filtered.slice(pageStart, pageEnd);

  function handlePageChange(page: number) {
    const next = Math.min(totalPages, Math.max(1, page));
    setCurrentPage(next);
    updateParams({ page: next === 1 ? null : String(next) });
    // Smooth scroll to top of product grid
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleApplyFilters = (nextFilters: ExtendedFilters) => setFilters(nextFilters);

  const handleClearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchText('');
    setFiltersResetKey((k) => k + 1);
    setCurrentPage(1);
    updateParams({ search: null, page: null });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 min-h-screen">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-text-secondary">
        <Link href="/" className="transition-colors hover:text-accent-gold">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-text-primary">All Products</span>
      </nav>

      {/* Header + filters */}
      <div className="mb-8 flex flex-col gap-6 border-b border-border pb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl md:text-5xl font-heading tracking-tight">All Products</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {loading ? (
                <span className="inline-block h-4 w-48 animate-pulse rounded bg-card" />
              ) : (
                <>
                  Showing {filtered.length === 0 ? 0 : pageStart + 1}–{Math.min(pageEnd, filtered.length)} of{' '}
                  {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                  {searchText.trim() ? ` for "${searchText.trim()}"` : ''}
                </>
              )}
            </p>
          </div>
          <ProductFilters key={filtersResetKey} onApply={handleApplyFilters} categories={categories} />
        </div>

        {/* Search bar */}
        <div className="rounded-[2rem] border border-border bg-card/55 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 shrink-0 text-text-secondary" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                updateParams({ search: e.target.value.trim() || null, page: null });
              }}
              placeholder="Search by title, brand, material, collection, or size…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-secondary/60 md:text-base"
            />
            {searchText ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-full border border-border p-2 text-text-secondary transition-colors hover:border-accent-gold hover:text-accent-gold"
                aria-label="Clear search and filters"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {Array(PRODUCTS_PER_PAGE).fill(0).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-card py-24 text-center text-text-secondary">
          <p className="mb-4 text-lg font-heading">No products found</p>
          <button
            onClick={handleClearAll}
            className="text-sm underline underline-offset-4 transition-colors hover:text-accent-gold"
          >
            Clear Search &amp; Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
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

// ── Skeleton fallback ─────────────────────────────────────────
function ProductsPageFallback() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 min-h-screen">
      <div className="mb-8 h-5 w-32 animate-pulse bg-card" />
      <div className="mb-8 flex flex-col gap-6 border-b border-border pb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="space-y-3">
            <div className="h-10 w-56 animate-pulse bg-card md:h-14 md:w-72" />
            <div className="h-4 w-48 animate-pulse bg-card" />
          </div>
          <div className="h-10 w-40 animate-pulse bg-card" />
        </div>
        <div className="h-16 animate-pulse rounded-[2rem] border border-border bg-card/55" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {Array(12).fill(0).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded bg-card" />
        ))}
      </div>
    </main>
  );
}

export default function AllProductsPage() {
  return (
    <Suspense fallback={<ProductsPageFallback />}>
      <ProductsPageContent />
    </Suspense>
  );
}
