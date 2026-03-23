'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { FilterModal, ExtendedFilters } from '@/components/modals/FilterModal';
import type { Category } from '@/lib/api/home';

interface ProductFiltersProps {
  onApply?: (filters: ExtendedFilters) => void;
  categories?: Category[];
}

export function ProductFilters({ onApply, categories }: ProductFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sort, setSort] = useState('featured');
  const [activeFilters, setActiveFilters] = useState<ExtendedFilters>({
    priceRange: 'all',
    sizes: [],
    sort: 'featured',
  });

  const handleApplyFilters = (filters: ExtendedFilters) => {
    const nextFilters = { ...filters, sort };
    setActiveFilters(nextFilters);
    onApply?.(nextFilters);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    setSort(newSort);
    const nextFilters = { ...activeFilters, sort: newSort };
    setActiveFilters(nextFilters);
    onApply?.(nextFilters);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center gap-2 border border-border bg-card/72 px-4 py-2 backdrop-blur-sm hover:bg-card transition-colors text-xs font-medium tracking-widest uppercase"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filter
        </button>
        
        <div className="border border-border bg-card/72 px-4 py-2 backdrop-blur-sm hover:bg-card transition-colors">
          <select 
            value={sort}
            onChange={handleSortChange}
            className="bg-transparent appearance-none outline-none text-xs font-medium tracking-widest cursor-pointer pr-4 uppercase"
          >
            <option value="featured">Featured</option>
            <option value="new">New Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <FilterModal 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)} 
        onApply={handleApplyFilters}
        categories={categories}
      />
    </>
  );
}
