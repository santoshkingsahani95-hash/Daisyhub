import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from '@/components/product/product-card';

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
      ? 'grid grid-cols-2 md:grid-cols-4 gap-6'
      : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';

  return (
    <section className={`py-16 ${className}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            {eyebrow && (
              <span className="text-xs uppercase tracking-widest text-brand-gold font-semibold flex items-center gap-1.5">
                {icon}
                <span>{eyebrow}</span>
              </span>
            )}
            <h2 className="font-serif-title text-3xl md:text-4xl font-bold text-brand-dark mt-1">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-brand-muted mt-1">{subtitle}</p>
            )}
          </div>

          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="text-xs font-semibold uppercase tracking-widest text-brand-dark hover:text-brand-gold flex items-center gap-1 group transition-colors"
            >
              <span>{viewAllLabel}</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
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
