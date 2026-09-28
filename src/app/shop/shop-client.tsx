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
import { db, matchCategory } from '@/lib/db';
import { Product, Category } from '@/types';

interface ShopClientProps {
  initialProducts: Product[];
  initialCategories: Category[];
}

function ShopContent({ initialProducts, initialCategories }: ShopClientProps) {
  const searchParams = useSearchParams();

  const initialCat = searchParams.get('category') || 'all';
  const initialSubcat = searchParams.get('subcategory') || 'all';
  const initialCol = searchParams.get('collection') || 'all';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(100000);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);

  const loadFreshShopData = React.useCallback(async () => {
    try {
      // Parallel fetch from dedicated product and category API routes
      const [prodsRes, catsRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ]);

      if (prodsRes.ok) {
        const prodData = await prodsRes.json();
        if (prodData.success && Array.isArray(prodData.products)) {
          setAllProducts(prodData.products);
        }
      }

      if (catsRes.ok) {
        const catData = await catsRes.json();
        if (catData.success && Array.isArray(catData.categories)) {
          setCategories(catData.categories);
        }
      }
    } catch (e) {
      setCategories(db.getCategories());
      setAllProducts(db.getProducts());
    }
  }, []);

  useEffect(() => {
    const handleDbUpdate = () => {
      loadFreshShopData();
    };
    window.addEventListener('ace-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('ace-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, [loadFreshShopData]);

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
    setMaxPrice(100000);
    setSortBy('featured');
  };

  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    // Category filter using matchCategory helper
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'new-arrivals') {
        list = list.filter((p) => p.isNewArrival || p.collections?.includes('new-arrivals'));
      } else if (selectedCategory === 'sale') {
        list = list.filter((p) => p.isSale || p.salePrice !== undefined);
      } else if (selectedCategory === 'trending') {
        list = list.filter((p) => p.isTrending || p.collections?.includes('trending'));
      } else if (selectedCategory === 'best-sellers') {
        list = list.filter((p) => p.isBestSeller || p.reviewCount > 30 || p.collections?.includes('best-sellers'));
      } else {
        list = list.filter((p) => matchCategory(p.category, selectedCategory));
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
    if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [allProducts, selectedCategory, initialCol, initialSubcat, selectedSizes, selectedColors, maxPrice, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-6 border-b border-brand-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-brand-muted mb-2">
              <Link href="/" className="hover:text-brand-dark">Home</Link>
              <span>/</span>
              <span className="text-brand-dark font-medium uppercase">Shop All</span>
            </div>
            <h1 className="font-serif-title text-3xl md:text-4xl font-bold uppercase tracking-wider text-brand-dark">
              Women&apos;s Collection
            </h1>
            <p className="text-xs text-brand-muted mt-1 font-light">
              Showing {filteredProducts.length} of {allProducts.length} luxury items
            </p>
          </div>

          {/* Sort & Mobile Filter Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-brand-border text-xs font-semibold uppercase tracking-wider text-brand-dark"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-muted hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border border-brand-border px-3 py-2 text-xs font-medium text-brand-dark focus:outline-none"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="w-64 hidden lg:block flex-shrink-0 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <span className="font-serif-title text-sm font-bold uppercase tracking-wider text-brand-dark">
                Filters
              </span>
              <button
                onClick={resetFilters}
                className="text-[11px] text-brand-gold hover:underline flex items-center gap-1 uppercase font-semibold"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">Categories</span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2">
                {categoriesList.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`block w-full text-left text-xs py-1 transition-colors ${
                      selectedCategory === cat.id ? 'font-bold text-brand-gold' : 'text-brand-muted hover:text-brand-dark'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-3 border-t border-brand-border pt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">Size</span>
              <div className="grid grid-cols-3 gap-2">
                {availableSizes.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`h-9 text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'border-brand-dark bg-brand-dark text-white'
                          : 'border-brand-border text-brand-dark hover:border-brand-dark'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3 border-t border-brand-border pt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">Color</span>
              <div className="grid grid-cols-2 gap-2">
                {availableColors.map((color) => {
                  const isSelected = selectedColors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      onClick={() => toggleColor(color.name)}
                      className={`flex items-center gap-2 px-2 py-1.5 border text-xs text-left transition-colors ${
                        isSelected ? 'border-brand-dark font-semibold' : 'border-brand-border text-brand-muted hover:text-brand-dark'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: color.code }} />
                      <span className="truncate">{color.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3 border-t border-brand-border pt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">Max Price</span>
              <input
                type="range"
                min="800"
                max="50000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-gold cursor-pointer"
              />
              <div className="flex justify-between text-xs text-brand-muted">
                <span>NPR 800</span>
                <span className="font-bold text-brand-dark">NPR {maxPrice.toLocaleString()}</span>
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-brand-border">
                <p className="font-serif-title text-lg text-brand-dark">No garments match your filters.</p>
                <button
                  onClick={resetFilters}
                  className="mt-4 px-6 py-2.5 bg-brand-dark text-white text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors"
                >
                  Clear All Filters
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

      {/* Mobile Filters Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileFilterOpen(false)} />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                <span className="font-serif-title text-lg font-bold uppercase tracking-wider text-brand-dark">Filters</span>
                <button onClick={() => setIsMobileFilterOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Categories */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">Categories</span>
                <div className="space-y-2">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`block w-full text-left text-xs py-1 ${
                        selectedCategory === cat.id ? 'font-bold text-brand-gold' : 'text-brand-muted'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Sizes */}
              <div className="space-y-3 border-t border-brand-border pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">Size</span>
                <div className="grid grid-cols-3 gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`h-9 text-xs font-medium border ${
                        selectedSizes.includes(size) ? 'border-brand-dark bg-brand-dark text-white' : 'border-brand-border text-brand-dark'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Price */}
              <div className="space-y-3 border-t border-brand-border pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">Max Price</span>
                <input
                  type="range"
                  min="800"
                  max="50000"
                  step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-brand-gold"
                />
                <div className="flex justify-between text-xs text-brand-muted">
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

export function ShopClient(props: ShopClientProps) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs font-serif-title">Loading collection...</div>}>
      <ShopContent {...props} />
    </Suspense>
  );
}
