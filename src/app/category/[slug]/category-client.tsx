'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/product/product-card';
import { QuickAddModal } from '@/components/product/quick-add-modal';
import { SizeGuideModal } from '@/components/product/size-guide-modal';
import { MiniCart } from '@/components/cart/mini-cart';
import { SearchOverlay } from '@/components/layout/search-overlay';
import { Product, Category } from '@/types';
import { db } from '@/lib/db';

interface CategoryClientProps {
  slug: string;
  initialCategory?: Category | null;
  initialProducts: Product[];
}

export function CategoryClientView({
  slug,
  initialCategory,
  initialProducts,
}: CategoryClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categoryInfo, setCategoryInfo] = useState<{ title: string; desc: string; image: string }>({
    title: initialCategory?.name || (slug === 'new-arrivals' ? 'New Arrivals' : slug === 'sale' ? 'Sale Edit' : slug === 'trending' ? 'Trending Now' : 'Collection'),
    desc: initialCategory?.description || 'Explore our latest luxury designs.',
    image: initialCategory?.image || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop',
  });

  const refreshCategoryData = useCallback(async () => {
    try {
      // Use dedicated Category and Product API routes instead of monolithic DB endpoint
      const res = await fetch(`/api/categories/${encodeURIComponent(slug)}?includeProducts=true`, {
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.category) {
            setCategoryInfo({
              title: json.category.name,
              desc: json.category.description,
              image: json.category.image || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1600&auto=format&fit=crop',
            });
          }
          if (Array.isArray(json.products) && json.products.length > 0) {
            setProducts(json.products);
            return;
          }
        }
      }

      // Fallback to dedicated products endpoint filtered by category
      const prodRes = await fetch(`/api/products?category=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });
      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        if (prodJson.success && Array.isArray(prodJson.products)) {
          setProducts(prodJson.products);
          return;
        }
      }
    } catch (e) {
      // Local fallback
      const localProducts = db.getProductsByCategory(slug);
      if (localProducts.length > 0) setProducts(localProducts);
    }
  }, [slug]);

  useEffect(() => {
    const handleDbUpdate = () => refreshCategoryData();
    window.addEventListener('ace-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('ace-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, [refreshCategoryData]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1">
        {/* Category Hero Banner */}
        <section className="relative h-64 md:h-80 bg-brand-dark flex items-center justify-center overflow-hidden">
          <Image
            src={categoryInfo.image}
            alt={categoryInfo.title}
            fill
            unoptimized
            className="object-cover brightness-50"
            priority
          />
          <div className="relative z-10 text-center text-white space-y-2 px-6">
            <span className="text-[11px] uppercase tracking-ultra text-brand-gold font-bold">
              DAISY HUB
            </span>
            <h1 className="font-serif-title text-3xl md:text-5xl font-bold uppercase tracking-wider">
              {categoryInfo.title}
            </h1>
            <p className="text-xs md:text-sm text-white/90 max-w-lg mx-auto font-sans font-light">
              {categoryInfo.desc}
            </p>
          </div>
        </section>

        {/* Product Grid */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between pb-6 mb-8 border-b border-brand-border">
            <div className="flex items-center gap-2 text-xs text-brand-muted">
              <Link href="/" className="hover:text-brand-dark">
                Home
              </Link>
              <span>/</span>
              <span className="text-brand-dark font-medium uppercase">
                {categoryInfo.title}
              </span>
            </div>
            <span className="text-xs text-brand-muted font-medium">
              {products.length} Items
            </span>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-serif-title text-lg text-brand-dark">
                No products found in this category.
              </p>
              <Link
                href="/shop"
                className="inline-block mt-4 text-xs font-bold text-brand-gold uppercase tracking-wider"
              >
                EXPLORE ALL PRODUCTS →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <QuickAddModal />
      <SizeGuideModal />
      <MiniCart />
      <SearchOverlay />
    </div>
  );
}
