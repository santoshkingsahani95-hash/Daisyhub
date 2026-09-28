'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, ChevronUp, Grid } from 'lucide-react';
import { Category } from '@/types';

interface CategoryGridProps {
  categories: Category[];
  initialVisible?: number;
  className?: string;
}

export function CategoryGrid({
  categories,
  initialVisible = 4,
  className = '',
}: CategoryGridProps) {
  const [showAll, setShowAll] = useState(false);

  if (categories.length === 0) return null;

  const visibleCategories = showAll ? categories : categories.slice(0, initialVisible);

  return (
    <section className={`py-12 max-w-7xl mx-auto px-6 ${className}`}>
      <div className="flex justify-end mb-6">
        <div className="flex items-center gap-3">
          {categories.length > initialVisible && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-4 py-2.5 bg-brand-cream hover:bg-brand-border text-brand-dark text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 border border-brand-border transition-colors shadow-xs"
            >
              <Grid size={15} className="text-brand-gold" />
              <span>
                {showAll
                  ? 'SHOW LESS CATEGORIES'
                  : `VIEW MORE CATEGORIES (${categories.length} TOTAL)`}
              </span>
              {showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}

          <Link
            href="/shop"
            className="hidden md:flex text-xs font-bold uppercase tracking-wider text-brand-dark hover:text-brand-gold items-center gap-1 transition-colors"
          >
            <span>ALL SHOP →</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="group flex flex-col space-y-3"
          >
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-brand-cream shadow-card">
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>

            <div className="pt-1 text-center md:text-left space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-brand-gold font-bold block">
                EXPLORE COLLECTION
              </span>
              <h3 className="font-serif-title text-xl md:text-2xl font-bold text-brand-dark group-hover:text-brand-gold transition-colors">
                {cat.name}
              </h3>
              <div className="inline-flex items-center gap-1 text-xs font-semibold tracking-wider text-brand-dark group-hover:translate-x-1 transition-transform pt-1">
                <span>SHOP NOW</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
