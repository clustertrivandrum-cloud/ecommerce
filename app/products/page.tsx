'use client';

import { useEffect, useState } from 'react';
import { getProducts } from '@/lib/api/product';
import { getCategories } from '@/lib/api/home';
import type { Product, Category } from '@/lib/api/home';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductFilters } from '@/components/product/ProductFilters';
import type { ExtendedFilters } from '@/components/modals/FilterModal';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getProducts(), // Retrieves all products
      getCategories(), // Retrieves cat & subcat
    ]).then(([prods, cats]) => {
      setProducts(prods);
      setFiltered(prods);
      setCategories(cats);
      setLoading(false);
    });
  }, []);

  const handleApplyFilters = (filters: ExtendedFilters) => {
    let result = [...products];
    
    // Category match
    if (filters.categoryId) {
       result = result.filter(p => p.categoryId === filters.categoryId || p.parentCategoryId === filters.categoryId);
    }
    
    // Subcategory match
    if (filters.subcategoryId) {
       result = result.filter(p => p.categoryId === filters.subcategoryId);
    }

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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-secondary mb-8">
        <Link href="/" className="hover:text-accent-gold transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-text-primary">All Products</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-8 mb-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-heading tracking-tight">All Products</h1>
          <p className="text-text-secondary text-sm mt-2">{filtered.length} products</p>
        </div>
        <ProductFilters onApply={handleApplyFilters} categories={categories} />
      </div>

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
          <button onClick={() => setFiltered(products)} className="text-sm hover:text-accent-gold transition-colors underline underline-offset-4">
            Clear Filters
          </button>
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
