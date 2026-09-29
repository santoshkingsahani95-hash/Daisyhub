import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';

interface ProductShelfProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  viewAllLink?: string;
  viewAllLabel?: string;
  products: Product[];
  className?: string;
  columns?: '2-3-4' | '2-4';
}

export function ProductShelf({
  title,
  eyebrow,
  subtitle,
  icon,
  viewAllLink,
  viewAllLabel = 'VIEW ALL',
  products,
  className = '',
  columns = '2-3-4',
}: ProductShelfProps) {
  if (products.length === 0) return null;

  const gridClass =
    columns === '2-4'
      ? 'grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6'
      : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6';

  return (
    <section className={`py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            {eyebrow && (
              <span className="text-[10px] uppercase tracking-widest text-brand-gold font-bold flex items-center gap-1.5 mb-1">
                {icon}
                <span>{eyebrow}</span>
              </span>
            )}
            <h2 className="font-serif-title text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>

          {viewAllLink && (
            <Button asChild variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-wider text-foreground hover:text-brand-gold self-start sm:self-end">
              <Link href={viewAllLink} className="flex items-center gap-1 group">
                <span>{viewAllLabel}</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          )}
        </div>

        <div className={gridClass}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
