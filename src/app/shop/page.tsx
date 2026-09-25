'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Filter, X, ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/product/product-card';
import { QuickAddModal } from '@/components/product/quick-add-modal';
import { SizeGuideModal } from '@/components/product/size-guide-modal';
import { MiniCart } from '@/components/cart/mini-cart';
import { SearchOverlay } from '@/components/layout/search-overlay';
import { db } from '@/lib/db';
import { Product, Category } from '@/types';

function ShopContent() {
  const searchParams = useSearchParams();

  const initialCat = searchParams.get('category') || 'all';
  const initialSubcat = searchParams.get('subcategory') || 'all';
  const initialCol = searchParams.get('collection') || 'all';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    setCategories(db.getCategories());
    setAllProducts(db.getProducts());

    const handleDbUpdate = () => {
      setCategories(db.getCategories());
      setAllProducts(db.getProducts());
    };
    window.addEventListener('ace-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('ace-db-updated', handleDbUpdate);
    };
  }, []);

  const categoriesList = useMemo(() => {
    const systemCats = [
      { name: 'All Clothing', id: 'all' },
      { name: 'New Arrivals', id: 'new-arrivals' },
    ];
    const dbCats = categories.length > 0 ? categories : db.getCategories();
    const dynamicCats = dbCats.map((c) => ({ name: c.name, id: c.slug }));
    const endCats = [{ name: 'Sale Edit', id: 'sale' }];
    const existingIds = new Set(systemCats.map((c) => c.id));
    const uniqueDynamic = dynamicCats.filter((c) => !existingIds.has(c.id));
    return [...systemCats, ...uniqueDynamic, ...endCats];
  }, [categories]);

  const availableColors = [
    { name: 'Black', code: '#111111' },
    { name: 'White', code: '#FFFFFF' },
    { name: 'Beige', code: '#E3D8C8' },
    { name: 'Brown', code: '#7A5C43' },
    { name: 'Pink', code: '#E8A598' },
    { name: 'Red', code: '#9E2A2B' },
    { name: 'Blue', code: '#8EA7C6' },
    { name: 'Green', code: '#5B684B' },
    { name: 'Grey', code: '#9E9E9E' },
  ];

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors((prev) => (prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]));
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedSizes([]);
    setSelectedColors([]);
    setMaxPrice(5000);
    setSortBy('featured');
  };

  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'new-arrivals') {
        list = list.filter((p) => p.isNewArrival || p.collections?.includes('new-arrivals'));
      } else if (selectedCategory === 'sale') {
        list = list.filter((p) => p.isSale || p.salePrice !== undefined);
      } else if (selectedCategory === 'trending') {
        list = list.filter((p) => p.isTrending);
      } else if (selectedCategory === 'best-sellers') {
        list = list.filter((p) => p.isBestSeller);
      } else {
        list = list.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
      }
    }

    // Collection filter
    if (initialCol !== 'all') {
      list = list.filter((p) => p.collections?.includes(initialCol));
    }

    // Subcategory filter
    if (initialSubcat !== 'all') {
      list = list.filter((p) => p.subcategory?.toLowerCase() === initialSubcat.toLowerCase());
    }

    // Sizes filter
    if (selectedSizes.length > 0) {
      list = list.filter((p) => p.sizes.some((s) => selectedSizes.includes(s.size) && s.stock > 0));
    }

    // Colors filter
    if (selectedColors.length > 0) {
      list = list.filter((p) => p.colors.some((c) => selectedColors.includes(c.name)));
    }

    // Price filter
    list = list.filter((p) => {
      const price = p.salePrice || p.price;
      return price <= maxPrice;
    });

    // Sorting
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'price-low') {
      list.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    } else if (sortBy === 'trending') {
      list.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
    } else if (sortBy === 'best-selling') {
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return list;
  }, [allProducts, selectedCategory, initialCol, initialSubcat, selectedSizes, selectedColors, maxPrice, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 py-10 max-w-7xl mx-auto px-6 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-brand-muted mb-4 font-sans">
          <Link href="/" className="hover:text-brand-dark">Home</Link>
          <span>/</span>
          <span className="text-brand-dark font-medium uppercase">SHOP ALL WOMEN</span>
        </div>

        {/* Page Title Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-brand-border pb-6 mb-8 gap-4">
          <div>
            <h1 className="font-serif-title text-3xl md:text-5xl font-bold text-brand-dark">WOMEN&apos;S COLLECTION</h1>
            <p className="text-xs text-brand-muted mt-2">
              Showing {filteredProducts.length} curated designs
            </p>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-brand-border rounded text-xs font-semibold text-brand-dark"
            >
              <SlidersHorizontal size={14} />
              <span>FILTERS</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-brand-muted uppercase font-semibold text-[10px] hidden sm:inline">SORT BY:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-brand-cream text-brand-dark border border-brand-border rounded px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest Arrivals</option>
                <option value="trending">Trending Now</option>
                <option value="best-selling">Best Selling</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Grid Layout: Desktop Sidebar Filter + Products */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block space-y-8 divide-y divide-brand-border">
            {/* Category Filter */}
            <div className="pt-2">
              <h3 className="text-xs uppercase tracking-widest font-bold text-brand-dark mb-4">CATEGORIES</h3>
              <ul className="space-y-2.5 text-xs text-brand-muted">
                {categoriesList.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setSelectedCategory(item.id)}
                      className={`text-left w-full hover:text-brand-dark transition-colors ${
                        selectedCategory === item.id ? 'font-bold text-brand-dark border-l-2 border-brand-dark pl-2' : ''
                      }`}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sizes Filter */}
            <div className="pt-6">
              <h3 className="text-xs uppercase tracking-widest font-bold text-brand-dark mb-4">SIZES</h3>
              <div className="grid grid-cols-3 gap-2">
                {availableSizes.map((s) => {
                  const isSelected = selectedSizes.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSize(s)}
                      className={`py-2 text-xs font-semibold rounded border transition-all ${
                        isSelected
                          ? 'border-brand-dark bg-brand-dark text-white'
                          : 'border-brand-border text-brand-dark hover:border-brand-dark'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colors Filter */}
            <div className="pt-6">
              <h3 className="text-xs uppercase tracking-widest font-bold text-brand-dark mb-4">COLORS</h3>
              <div className="flex flex-wrap gap-2.5">
                {availableColors.map((color) => {
                  const isSelected = selectedColors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      onClick={() => toggleColor(color.name)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-brand-dark scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.code }}
                      title={color.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="pt-6">
              <h3 className="text-xs uppercase tracking-widest font-bold text-brand-dark mb-4">MAX PRICE</h3>
              <input
                type="range"
                min={800}
                max={5000}
                step={100}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-dark"
              />
              <div className="flex justify-between text-xs text-brand-muted mt-2">
                <span>NPR 800</span>
                <span className="font-bold text-brand-dark">NPR {maxPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-6">
              <button
                onClick={resetFilters}
                className="w-full py-2.5 border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-dark hover:border-brand-dark transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />
                <span>RESET ALL FILTERS</span>
              </button>
            </div>
          </div>

          {/* Product Listing Grid */}
          <div className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-24 space-y-4 border border-dashed border-brand-border rounded">
                <p className="font-serif-title text-xl text-brand-dark font-semibold">No products match your current filters.</p>
                <p className="text-xs text-brand-muted">Try clearing some filters or changing your price range.</p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 bg-brand-dark text-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-dark/90"
                >
                  CLEAR ALL FILTERS
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Slide-out Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="relative w-full max-w-xs bg-white h-full p-6 overflow-y-auto z-10 space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-brand-border">
                <h3 className="font-serif-title text-lg font-bold text-brand-dark">FILTERS</h3>
                <button onClick={() => setIsMobileFilterOpen(false)} className="p-1">
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Category */}
              <div className="py-4 border-b border-brand-border">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2">CATEGORY</h4>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-brand-cream border border-brand-border p-2 text-xs font-medium rounded"
                >
                  {categoriesList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile Sizes */}
              <div className="py-4 border-b border-brand-border">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2">SIZES</h4>
                <div className="grid grid-cols-3 gap-2">
                  {availableSizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSize(s)}
                      className={`py-1.5 text-xs font-semibold border rounded ${
                        selectedSizes.includes(s) ? 'bg-brand-dark text-white' : 'border-brand-border text-brand-dark'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Price */}
              <div className="py-4">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2">MAX PRICE</h4>
                <input
                  type="range"
                  min={800}
                  max={5000}
                  step={100}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-brand-muted mt-1">
                  <span>NPR 800</span>
                  <span className="font-bold text-brand-dark">NPR {maxPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-brand-border space-y-2">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-3 bg-brand-dark text-white text-xs font-semibold uppercase tracking-widest"
              >
                APPLY FILTERS ({filteredProducts.length})
              </button>
              <button
                onClick={resetFilters}
                className="w-full py-2.5 border border-brand-border text-xs font-semibold text-brand-muted"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <QuickAddModal />
      <SizeGuideModal />
      <MiniCart />
      <SearchOverlay />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs font-serif-title">Loading collection...</div>}>
      <ShopContent />
    </Suspense>
  );
}
