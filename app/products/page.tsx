'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { getProducts } from '@/lib/api/product';
import { getCategories } from '@/lib/api/home';
import type { Product, Category } from '@/lib/api/home';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';
import type { ExtendedFilters } from '@/components/modals/FilterModal';
import Link from 'next/link';
import { ChevronRight, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const DEFAULT_FILTERS: ExtendedFilters = {
  priceRange: 'all',
  sizes: [],
  sort: 'featured',
};

function matchesSearch(product: Product, query: string) {
  if (!query) return true;

  const searchableText = [
    product.name,
    product.brand,
    product.material,
    product.collection,
    ...(product.variants?.flatMap((variant) => Object.values(variant.options || {})) || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(query);
}

function matchesSelectedSizes(product: Product, sizes: string[]) {
  if (sizes.length === 0) return true;

  return product.variants?.some((variant) =>
    Object.values(variant.options || {}).some((value) => sizes.includes(String(value).toUpperCase()))
  ) ?? false;
}

export default function AllProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(() => searchParams.get('search') || '');
  const [filters, setFilters] = useState<ExtendedFilters>(DEFAULT_FILTERS);
  const [filtersResetKey, setFiltersResetKey] = useState(0);

  const deferredSearchText = useDeferredValue(searchText);

  const updateSearchParam = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const normalized = value.trim();

    if (normalized) {
      params.set('search', normalized);
    } else {
      params.delete('search');
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  useEffect(() => {
    Promise.all([getProducts(), getCategories()]).then(([prods, cats]) => {
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = [...products];
    const normalizedSearch = deferredSearchText.trim().toLowerCase();

    if (normalizedSearch) {
      result = result.filter((product) => matchesSearch(product, normalizedSearch));
    }

    if (filters.categoryId) {
      result = result.filter((product) => product.categoryId === filters.categoryId || product.parentCategoryId === filters.categoryId);
    }

    if (filters.subcategoryId) {
      result = result.filter((product) => product.categoryId === filters.subcategoryId);
    }

    if (filters.sizes.length > 0) {
      result = result.filter((product) => matchesSelectedSizes(product, filters.sizes));
    }

    if (filters.priceRange === 'under-500') result = result.filter((product) => product.price < 500);
    else if (filters.priceRange === '500-1000') result = result.filter((product) => product.price >= 500 && product.price <= 1000);
    else if (filters.priceRange === 'over-1000') result = result.filter((product) => product.price > 1000);

    if (filters.sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'price-desc') result.sort((a, b) => b.price - a.price);

    return result;
  }, [deferredSearchText, filters, products]);

  const handleApplyFilters = (nextFilters: ExtendedFilters) => {
    setFilters(nextFilters);
  };

  const handleClearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchText('');
    setFiltersResetKey((current) => current + 1);
    updateSearchParam('');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 min-h-screen">
      <nav className="mb-8 flex items-center gap-2 text-xs text-text-secondary">
        <Link href="/" className="transition-colors hover:text-accent-gold">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-text-primary">All Products</span>
      </nav>

      <div className="mb-8 flex flex-col gap-6 border-b border-border pb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl md:text-5xl font-heading tracking-tight">All Products</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {filtered.length} of {products.length} products
              {searchText.trim() ? ` for "${searchText.trim()}"` : ''}
            </p>
          </div>
          <ProductFilters key={filtersResetKey} onApply={handleApplyFilters} categories={categories} />
        </div>

        <div className="rounded-[2rem] border border-border bg-card/55 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-text-secondary" />
            <input
              type="text"
              value={searchText}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchText(nextValue);
                updateSearchParam(nextValue);
              }}
              placeholder="Search by title, brand, material, collection, or size..."
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
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-text-secondary">
            Live search now includes product metadata and size variants
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {Array(8).fill(0).map((_, index) => (
            <div key={index} className="aspect-square bg-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-card py-24 text-center text-text-secondary">
          <p className="mb-4 text-lg font-heading">No products found</p>
          <button onClick={handleClearAll} className="text-sm underline underline-offset-4 transition-colors hover:text-accent-gold">
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
