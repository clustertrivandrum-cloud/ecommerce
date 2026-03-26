'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import type { Category } from '@/lib/api/home';

export interface ExtendedFilters {
  priceRange: string; 
  sizes: string[]; 
  categoryId?: string; 
  subcategoryId?: string;
  sort?: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: ExtendedFilters) => void;
  categories?: Category[];
}

export function FilterModal({ isOpen, onClose, onApply, categories }: FilterModalProps) {
  const [priceRange, setPriceRange] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({ priceRange, sizes: [], categoryId: selectedCategory, subcategoryId: selectedSubcategory });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-primary/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm h-full bg-card border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-heading tracking-widest uppercase">Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-sm">
          {categories && categories.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-heading tracking-widest uppercase text-text-secondary">Category</h3>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory(''); // Reset sub on cat change
                }}
                className="w-full bg-transparent border border-border p-3 outline-none focus:border-text-primary uppercase tracking-widest text-xs"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option value={cat.id} key={cat.id}>{cat.name}</option>
                ))}
              </select>

              {selectedCategory && categories.find(c => c.id === selectedCategory)?.subcategories?.length ? (
                <div className="pt-2">
                  <h3 className="font-heading tracking-widest uppercase text-text-secondary mb-3">Subcategory</h3>
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="w-full bg-transparent border border-border p-3 outline-none focus:border-text-primary uppercase tracking-widest text-xs"
                  >
                    <option value="">All Subcategories</option>
                    {categories.find(c => c.id === selectedCategory)?.subcategories?.map(sub => (
                      <option value={sub.id} key={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          )}

          {/* Price Filter */}
          <div className="space-y-4">
            <h3 className="font-heading tracking-widest uppercase text-text-secondary">Price</h3>
            <div className="space-y-3">
              {[
                { id: 'all', label: 'All Prices' },
                { id: 'under-500', label: 'Under ₹500' },
                { id: '500-1000', label: '₹500 – ₹1,000' },
                { id: 'over-1000', label: 'Over ₹1,000' },
              ].map(option => (
                <label key={option.id} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${priceRange === option.id ? 'border-accent-gold' : 'border-border group-hover:border-text-secondary'}`}>
                    {priceRange === option.id && <div className="w-2 h-2 bg-accent-gold" />}
                  </div>
                  <input
                    type="radio"
                    className="hidden"
                    checked={priceRange === option.id}
                    onChange={() => setPriceRange(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        <div className="p-6 border-t border-border flex gap-4">
          <button
            onClick={() => { 
              setPriceRange('all'); 
              setSelectedCategory('');
              setSelectedSubcategory('');
            }}
            className="w-1/3 py-4 text-sm font-medium tracking-widest uppercase border border-border hover:bg-primary transition-colors text-text-secondary"
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-4 text-sm font-bold tracking-widest uppercase bg-text-primary text-primary hover:bg-accent-gold transition-colors"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
}
