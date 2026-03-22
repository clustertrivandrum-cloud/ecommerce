'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult = {
  id: string;
  title: string;
  slug: string;
  product_variants: { price: number; compare_at_price?: number; allow_preorder?: boolean; inventory_items?: { available_quantity: number }[] }[];
  product_media: { media_url: string }[];
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When closed, let's clear it via a small timeout to not interrupt the fade-out
    if (!isOpen) {
      setTimeout(() => {
        setQuery('');
        setResults([]);
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, title, slug,
          product_variants(
            price,
            compare_at_price,
            allow_preorder,
            inventory_items(available_quantity)
          ),
          product_media(media_url)
        `)
        .ilike('title', `%${query}%`)
        .eq('status', 'active')
        .limit(5);

      if (!error && data) {
        setResults(data);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-primary/95 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-4 flex-1">
          <Search className="w-5 h-5 text-text-secondary" />
          <input
            autoFocus
            type="text"
            placeholder="Search for products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xl font-heading outline-none placeholder:text-text-secondary/50"
          />
        </div>
        <button onClick={onClose} className="p-2 hover:bg-card transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto">
        {loading && <p className="text-text-secondary text-sm">Searching...</p>}
        {!loading && query.length >= 2 && results.length === 0 && (
          <p className="text-text-secondary text-sm">No results found for &quot;{query}&quot;</p>
        )}
        
        <div className="space-y-6">
          {results.map((product) => (
            // pick first in-stock variant for display; fallback to first
            (() => {
              const variants = (product.product_variants || []).map((v) => {
                const stock = (v.inventory_items || []).reduce((sum, row) => sum + (row?.available_quantity || 0), 0);
                return { ...v, stock };
              });
              const chosen = variants.find((v) => v.stock > 0) || variants[0] || { price: 0 };
              return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              onClick={onClose}
              className="flex items-center gap-6 group"
            >
              <div className="relative w-16 h-20 bg-card overflow-hidden">
                <Image
                  src={product.product_media?.[0]?.media_url || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=100&q=80'}
                  alt={product.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform"
                  sizes="64px"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-lg group-hover:text-accent-gold transition-colors">{product.title}</span>
                <span className="text-text-secondary text-sm">₹{chosen.price?.toFixed(2) || '0.00'}</span>
              </div>
            </Link>
              );
            })()
          ))}
        </div>
      </div>
    </div>
  );
}
