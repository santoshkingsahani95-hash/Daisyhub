'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, ChevronDown, ChevronUp, Grid } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/product/product-card';
import { QuickAddModal } from '@/components/product/quick-add-modal';
import { SizeGuideModal } from '@/components/product/size-guide-modal';
import { MiniCart } from '@/components/cart/mini-cart';
import { SearchOverlay } from '@/components/layout/search-overlay';
import { db } from '@/lib/db';
import { Product, Category, HomepageCMS } from '@/types';

export default function HomePage() {
  const [cms, setCms] = useState<HomepageCMS>(db.getCMS());
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);

  const loadData = () => {
    setCms(db.getCMS());
    setAllProducts(db.getProducts());
    setCategories(db.getCategories());
  };

  useEffect(() => {
    loadData();
    const handleDbUpdate = () => loadData();
    window.addEventListener('ace-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('ace-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, []);

  const trendingProducts = allProducts.filter((p) => p.isTrending).slice(0, 8);
  const newArrivals = allProducts.filter((p) => p.isNewArrival || p.collections?.includes('new-arrivals')).slice(0, 8);
  const bestSellers = allProducts.filter((p) => p.isBestSeller || p.reviewCount > 30).slice(0, 8);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Banner */}
      <AnnouncementBar text={cms.announcementBar.text} enabled={cms.announcementBar.enabled} />

      {/* Sticky Header */}
      <Header />

      <main className="flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative w-full py-20 md:py-32 bg-gray-100 flex items-center justify-center border-b border-brand-border">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="font-serif-title text-5xl sm:text-7xl md:text-8xl font-bold tracking-widest text-yellow-500 uppercase">
              Daisy Hub
            </h1>
          </div>
        </section>

        {/* 2. CATEGORY WISE SHOPPING GRID */}
        <section className="py-12 max-w-7xl mx-auto px-6">
          <div className="flex justify-end mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="px-4 py-2.5 bg-brand-cream hover:bg-brand-border text-brand-dark text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 border border-brand-border transition-colors shadow-xs"
              >
                <Grid size={15} className="text-brand-gold" />
                <span>
                  {showAllCategories
                    ? 'SHOW LESS CATEGORIES'
                    : `VIEW MORE CATEGORIES (${categories.length} TOTAL)`}
                </span>
                {showAllCategories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <Link
                href="/shop"
                className="hidden md:flex text-xs font-bold uppercase tracking-wider text-brand-dark hover:text-brand-gold items-center gap-1"
              >
                <span>ALL SHOP →</span>
              </Link>
            </div>
          </div>

          {/* Main Category Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {(showAllCategories ? categories : categories.slice(0, 4)).map((cat) => (
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

        {/* 3. TRENDING NOW */}
        <section className="py-16 bg-brand-cream/40 border-y border-brand-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-brand-gold font-semibold flex items-center gap-1">
                  <Sparkles size={14} /> HIGH DEMAND LOOKS
                </span>
                <h2 className="font-serif-title text-3xl md:text-4xl font-bold text-brand-dark mt-1">TRENDING NOW</h2>
              </div>
              <Link
                href="/category/trending"
                className="text-xs font-semibold uppercase tracking-widest text-brand-dark hover:text-brand-gold flex items-center gap-1 group"
              >
                <span>VIEW ALL TRENDING</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* 4. NEW ARRIVALS */}
        <section className="py-20 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
            <span className="text-xs uppercase tracking-widest text-brand-gold font-semibold">FRESH DROPS</span>
            <h2 className="font-serif-title text-3xl md:text-4xl font-bold text-brand-dark">NEW ARRIVALS</h2>
            <p className="text-xs text-brand-muted">Fresh pieces you&apos;ll want to wear on repeat.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/category/new-arrivals"
              className="inline-block px-8 py-4 border border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
            >
              VIEW ALL NEW ARRIVALS
            </Link>
          </div>
        </section>


        {/* 6. BEST SELLERS */}
        <section className="py-20 max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-brand-gold font-semibold">CUSTOMER FAVORITES</span>
              <h2 className="font-serif-title text-3xl md:text-4xl font-bold text-brand-dark mt-1">BEST SELLERS</h2>
            </div>
            <Link
              href="/category/best-sellers"
              className="text-xs font-semibold uppercase tracking-widest text-brand-dark hover:text-brand-gold flex items-center gap-1 group"
            >
              <span>SHOP BEST SELLERS</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Global Overlays & Modals */}
      <QuickAddModal />
      <SizeGuideModal />
      <MiniCart />
      <SearchOverlay />
    </div>
  );
}
