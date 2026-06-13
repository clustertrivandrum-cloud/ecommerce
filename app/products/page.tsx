import { Suspense } from 'react';
import { getProducts } from '@/lib/api/product';
import { getCategories } from '@/lib/api/home';
import { ProductsClient } from './ProductsClient';

export const revalidate = 60; // Cache the page for 60 seconds

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

export default async function AllProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <Suspense fallback={<ProductsPageFallback />}>
      <ProductsClient initialProducts={products} initialCategories={categories} />
    </Suspense>
  );
}
