import React from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-xs text-brand-muted uppercase tracking-wider font-medium ${className}`}
    >
      <Link href="/" className="hover:text-brand-dark transition-colors">
        HOME
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <span className="text-brand-border">/</span>
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-brand-dark transition-colors truncate max-w-xs">
                {item.label}
              </Link>
            ) : (
              <span className="text-brand-dark font-semibold truncate max-w-xs" aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
