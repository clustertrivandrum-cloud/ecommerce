'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Clock3, Search, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getProducts } from '@/lib/api/product';
import type { Product } from '@/lib/api/home';
import { cn } from '@/lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult = Product;

const RECENT_SEARCHES_KEY = 'cluster-recent-searches';

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function getSearchableTokens(product: SearchResult) {
  return [
    product.name,
    product.brand,
    product.material,
    product.collection,
    ...(product.variants?.flatMap((variant) => Object.values(variant.options || {})) || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getSearchScore(product: SearchResult, rawQuery: string) {
  const query = normalizeSearchValue(rawQuery);
  if (!query) return 0;

  const title = product.name.toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const material = (product.material || '').toLowerCase();
  const collection = (product.collection || '').toLowerCase();
  const tokens = getSearchableTokens(product);

  let score = 0;

  if (title.startsWith(query)) score += 120;
  else if (title.includes(query)) score += 80;

  if (brand.startsWith(query)) score += 48;
  else if (brand.includes(query)) score += 30;

  if (material.startsWith(query)) score += 32;
  else if (material.includes(query)) score += 20;

  if (collection.startsWith(query)) score += 24;
  else if (collection.includes(query)) score += 14;

  if (tokens.includes(query)) score += 12;
  if (product.stock > 0) score += 8;
  if (product.allow_preorder) score += 4;

  return score;
}

function getRecentSearches() {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (typeof window === 'undefined') return [];

  const normalized = term.trim();
  if (!normalized) return getRecentSearches();

  const nextSearches = [
    normalized,
    ...getRecentSearches().filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, 6);

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextSearches));
  return nextSearches;
}

function highlightMatch(text: string, query: string) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return text;

  const matchIndex = text.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex === -1) return text;

  const endIndex = matchIndex + normalizedQuery.length;

  return (
    <>
      {text.slice(0, matchIndex)}
      <span className="text-accent-gold">{text.slice(matchIndex, endIndex)}</span>
      {text.slice(endIndex)}
    </>
  );
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());

  const trimmedQuery = query.trim();

  const closeSearch = useCallback(() => {
    setActiveIndex(-1);
    onClose();
  }, [onClose]);

  const openSearchResults = useCallback((term: string) => {
    const normalized = term.trim();
    if (normalized.length < 2) return;

    setRecentSearches(saveRecentSearch(normalized));
    closeSearch();
    router.push(`/products?search=${encodeURIComponent(normalized)}`);
  }, [closeSearch, router]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';

    if (!isOpen) {
      const resetTimer = window.setTimeout(() => {
        setQuery('');
        setResults([]);
        setLoading(false);
        setActiveIndex(-1);
      }, 300);

      return () => {
        document.body.style.overflow = '';
        window.clearTimeout(resetTimer);
      };
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;

    const fetchResults = async () => {
      if (trimmedQuery.length < 2) {
        setResults([]);
        setActiveIndex(-1);
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await getProducts(undefined, trimmedQuery);
      if (cancelled) return;

      const ranked = data
        .map((product) => ({
          product,
          score: getSearchScore(product, trimmedQuery),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score || left.product.price - right.product.price)
        .slice(0, 8)
        .map((entry) => entry.product);

      setResults(ranked);
      setActiveIndex(ranked.length > 0 ? 0 : -1);
      setLoading(false);
    };

    const debounce = window.setTimeout(() => {
      void fetchResults();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
        return;
      }

      if (event.key === 'ArrowDown' && results.length > 0) {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % results.length);
      }

      if (event.key === 'ArrowUp' && results.length > 0) {
        event.preventDefault();
        setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
      }

      if (event.key === 'Enter') {
        if (activeIndex >= 0 && results[activeIndex]) {
          event.preventDefault();
          if (trimmedQuery) {
            setRecentSearches(saveRecentSearch(trimmedQuery));
          }
          closeSearch();
          router.push(`/product/${results[activeIndex].slug}`);
          return;
        }

        if (trimmedQuery.length >= 2) {
          event.preventDefault();
          openSearchResults(trimmedQuery);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, closeSearch, isOpen, openSearchResults, results, router, trimmedQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-primary/95 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 p-6">
          <div className="flex flex-1 items-center gap-4">
            <Search className="w-5 h-5 text-text-secondary" />
            <div className="flex-1">
              <input
                autoFocus
                type="text"
                placeholder="Search by title, brand, material, or collection..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-xl font-heading outline-none placeholder:text-text-secondary/50"
              />
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-text-secondary">
                {trimmedQuery.length >= 2 ? 'Use arrow keys to browse and Enter to open' : 'Type at least 2 letters to start'}
              </p>
            </div>
          </div>
          <button onClick={closeSearch} className="p-2 transition-colors hover:bg-card" aria-label="Close search">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden p-6">
        {trimmedQuery.length < 2 ? (
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[2rem] border border-border bg-card/55 p-6">
              <span className="text-[11px] uppercase tracking-[0.28em] text-text-secondary">Search tips</span>
              <h2 className="mt-3 text-2xl font-heading text-text-primary">Find products faster</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
                Search now matches product title, brand, material, collection, and available size options. Press <span className="text-text-primary">/</span> anywhere on the site to open this panel.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {['Ring', 'Necklace', 'Gold', 'Silver', 'Bridal'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.24em] text-text-primary transition-colors hover:border-accent-gold hover:text-accent-gold"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-card/40 p-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-text-secondary">
                <Clock3 className="h-4 w-4" />
                Recent searches
              </div>
              <div className="mt-5 space-y-3">
                {recentSearches.length > 0 ? (
                  recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="flex w-full items-center justify-between rounded-2xl border border-border bg-primary/30 px-4 py-3 text-left text-sm transition-colors hover:border-accent-gold hover:text-accent-gold"
                    >
                      <span>{term}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-text-secondary">Your recent searches will appear here after you open a few results.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                {loading ? 'Searching...' : `${results.length} result${results.length === 1 ? '' : 's'} for "${trimmedQuery}"`}
              </p>
              <button
                type="button"
                onClick={() => openSearchResults(trimmedQuery)}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-text-primary transition-colors hover:text-accent-gold"
              >
                View all matches
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {!loading && results.length === 0 ? (
              <div className="rounded-[2rem] border border-border bg-card/40 p-8 text-center">
                <p className="text-lg font-heading text-text-primary">No results found</p>
                <p className="mt-3 text-sm text-text-secondary">
                  Try a broader term like material, collection, or product type.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((product, index) => {
                  const isSoldOut = product.stock === 0 && !product.allow_preorder;
                  const isPreorder = product.stock === 0 && product.allow_preorder;

                  return (
                    <Link
                      key={product.id}
                      href={`/product/${product.slug}`}
                      onClick={() => {
                        if (trimmedQuery) {
                          setRecentSearches(saveRecentSearch(trimmedQuery));
                        }
                        closeSearch();
                      }}
                      className={cn(
                        'group flex items-center gap-4 rounded-[1.75rem] border border-border bg-card/45 p-4 transition-colors hover:border-accent-gold hover:bg-card/70',
                        activeIndex === index && 'border-accent-gold bg-card/80'
                      )}
                    >
                      <div className="relative h-20 w-20 overflow-hidden rounded-[1.25rem] bg-card">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="80px"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-heading text-lg text-text-primary">
                            {highlightMatch(product.name, trimmedQuery)}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]',
                              isSoldOut && 'bg-card text-text-secondary',
                              isPreorder && 'bg-accent-gold text-primary',
                              !isSoldOut && !isPreorder && 'bg-accent-mint/85 text-primary'
                            )}
                          >
                            {isSoldOut ? 'Sold out' : isPreorder ? 'Preorder' : 'In stock'}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-text-secondary">
                          {[product.brand, product.collection, product.material].filter(Boolean).join(' · ') || 'Product'}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-semibold text-text-primary">₹{product.price.toFixed(2)}</span>
                          {product.original_price ? (
                            <span className="text-text-secondary line-through">₹{product.original_price.toFixed(2)}</span>
                          ) : null}
                          {product.is_free_delivery ? (
                            <span className="text-[11px] uppercase tracking-[0.2em] text-accent-mint">Fast Shipping</span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
