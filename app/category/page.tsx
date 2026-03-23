'use client';

import { useEffect, useState } from 'react';
import { getCategories } from '@/lib/api/home';
import type { Category } from '@/lib/api/home';
import Link from 'next/link';
import Image from 'next/image';

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-12 py-16 md:py-24 min-h-screen">
      <div className="mb-16 border-b border-border pb-10">
        <span className="text-accent-gold uppercase tracking-widest text-xs font-medium mb-3 block">Cluster Fascination</span>
        <h1 className="text-4xl md:text-6xl font-heading tracking-tight mb-4">All Collections</h1>
        <p className="text-text-secondary max-w-xl">Explore our curated jewellery collections — from everyday anti-tarnish pieces to traditional festive adornments.</p>
      </div>

      {/* Category Grid with subcategories */}
      <div className="space-y-16">
        {categories.map((cat) => (
          <div key={cat.id}>
            {/* Parent category header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading tracking-wide">{cat.name}</h2>
              <Link href={`/category/${cat.slug}`} className="text-xs text-text-secondary border-b border-text-secondary/40 hover:text-accent-gold hover:border-accent-gold transition-colors pb-0.5 tracking-widest uppercase">
                View All
              </Link>
            </div>

            {/* Subcategory chips */}
            {cat.subcategories && cat.subcategories.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-8">
                {cat.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/category/${sub.slug}`}
                    className="px-4 py-2 text-xs border border-border text-text-secondary hover:border-accent-gold hover:text-accent-gold transition-all tracking-widest uppercase"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Category image banner */}
            <Link href={`/category/${cat.slug}`} className="block relative h-48 md:h-64 w-full overflow-hidden group mb-2">
              <Image
                src={cat.bannerImage || cat.image}
                alt={cat.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/36 to-transparent" />
              <div className="absolute left-8 bottom-8">
                {cat.bannerKicker ? (
                  <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-accent-gold">{cat.bannerKicker}</span>
                ) : null}
                <span className="text-3xl font-heading text-white">{cat.bannerTitle || cat.name}</span>
                {cat.bannerDescription ? (
                  <p className="mt-2 max-w-lg text-sm text-white/88">{cat.bannerDescription}</p>
                ) : null}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
