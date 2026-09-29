'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, ChevronUp, Grid } from 'lucide-react';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';

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
    <section className={`py-14 max-w-7xl mx-auto px-6 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-brand-gold font-bold block mb-1">
            SHOP BY SILHOUETTE
          </span>
          <h2 className="font-serif-title text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            CURATED CATEGORIES
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {categories.length > initialVisible && (
            <Button
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-bold tracking-wider"
            >
              <Grid size={14} className="text-brand-gold" />
              <span>
                {showAll
                  ? 'SHOW LESS'
                  : `VIEW ALL (${categories.length})`}
              </span>
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          )}

          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-bold uppercase tracking-wider text-foreground hover:text-brand-gold">
            <Link href="/shop" className="flex items-center gap-1">
              <span>ALL SHOP</span>
              <ArrowRight size={13} />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {visibleCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="group flex flex-col space-y-3"
          >
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary border border-border/80 shadow-xs">
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            <div className="pt-1 text-center md:text-left space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-brand-gold font-bold block">
                EXPLORE COLLECTION
              </span>
              <h3 className="font-serif-title text-lg md:text-xl font-bold text-foreground group-hover:text-brand-gold transition-colors">
                {cat.name}
              </h3>
              <div className="inline-flex items-center gap-1 text-xs font-semibold tracking-wider text-foreground group-hover:text-brand-gold group-hover:translate-x-1 transition-all pt-0.5">
                <span>SHOP NOW</span>
                <ArrowRight size={13} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
