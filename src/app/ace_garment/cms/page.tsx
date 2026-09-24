'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Sliders,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Upload,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Flame,
  Tag,
  Instagram,
  Grid,
  Palette,
  Search,
  Check,
  FolderPlus,
  ArrowRight,
} from 'lucide-react';
import { db } from '@/lib/db';
import { HomepageCMS, Product, Category, Collection, ColorOption } from '@/types';
import { ProductVariantInspector } from '@/components/admin/product-variant-inspector';

type SectionTab = 'trending' | 'new-arrivals' | 'best-sellers' | 'shop-by' | 'hero-banners';

export default function AdminCMSPage() {
  const [activeTab, setActiveTab] = useState<SectionTab>('trending');
  const [cms, setCms] = useState<HomepageCMS>(db.getCMS());
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  const [isInstaModalOpen, setIsInstaModalOpen] = useState(false);
  const [editingInstaId, setEditingInstaId] = useState<string | null>(null);
  const [instaForm, setInstaForm] = useState({ imageUrl: '', postUrl: '' });

  // Product Form State
  const [prodForm, setProdForm] = useState({
    name: '',
    slug: '',
    sku: '',
    category: 'tops',
    price: 1999,
    salePrice: 1599,
    description: '',
    isTrending: false,
    isNewArrival: false,
    isBestSeller: false,
    isSale: false,
    stockXS: 10,
    stockS: 15,
    stockM: 20,
    stockL: 12,
    stockXL: 5,
    stockXXL: 2,
  });

  const [colorsList, setColorsList] = useState<ColorOption[]>([
    {
      name: 'Black',
      code: '#111111',
      images: [
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
      ],
    },
  ]);

  // Category Form State
  const [catForm, setCatForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    subcategories: '',
  });

  // Collection Form State
  const [colForm, setColForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
  });

  const loadData = () => {
    setCms(db.getCMS());
    setProducts(db.getProducts());
    setCategories(db.getCategories());
    setCollections(db.getCollections());
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

  const showNotification = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(''), 3500);
  };

  const handleFileUpload = (file: File, callback: (dataUrl: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        callback(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- PRODUCT MANAGEMENT ---
  const handleOpenAddProductForSection = (defaultFlag?: 'isTrending' | 'isNewArrival' | 'isBestSeller' | 'isSale') => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      slug: '',
      sku: `ACE-SEC-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'tops',
      price: 2499,
      salePrice: defaultFlag === 'isSale' ? 1899 : 0,
      description: 'Chic, premium quality garment crafted for elegance and modern style.',
      isTrending: defaultFlag === 'isTrending' || activeTab === 'trending',
      isNewArrival: defaultFlag === 'isNewArrival' || activeTab === 'new-arrivals',
      isBestSeller: defaultFlag === 'isBestSeller' || activeTab === 'best-sellers',
      isSale: defaultFlag === 'isSale',
      stockXS: 10,
      stockS: 15,
      stockM: 20,
      stockL: 12,
      stockXL: 5,
      stockXXL: 2,
    });
    setColorsList([
      {
        name: 'Black',
        code: '#111111',
        images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
      },
    ]);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    const getStock = (sz: string) => p.sizes.find((s) => s.size === sz)?.stock ?? 0;
    setProdForm({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: p.category,
      price: p.price,
      salePrice: p.salePrice || 0,
      description: p.description,
      isTrending: !!p.isTrending,
      isNewArrival: !!p.isNewArrival,
      isBestSeller: !!p.isBestSeller,
      isSale: !!p.isSale || p.salePrice !== undefined,
      stockXS: getStock('XS'),
      stockS: getStock('S'),
      stockM: getStock('M'),
      stockL: getStock('L'),
      stockXL: getStock('XL'),
      stockXXL: getStock('XXL'),
    });
    setColorsList(
      p.colors && p.colors.length > 0
        ? JSON.parse(JSON.stringify(p.colors))
        : [{ name: 'Default', code: '#111111', images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'] }]
    );
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const slugGen = prodForm.slug || prodForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const isSaleActive = Number(prodForm.salePrice) > 0 || prodForm.isSale;

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      slug: slugGen,
      name: prodForm.name,
      description: prodForm.description,
      category: prodForm.category,
      price: Number(prodForm.price),
      salePrice: isSaleActive ? Number(prodForm.salePrice) : undefined,
      discountPercentage:
        isSaleActive && Number(prodForm.price) > Number(prodForm.salePrice)
          ? Math.round(((prodForm.price - prodForm.salePrice) / prodForm.price) * 100)
          : undefined,
      isTrending: prodForm.isTrending,
      isNewArrival: prodForm.isNewArrival,
      isBestSeller: prodForm.isBestSeller,
      isSale: isSaleActive,
      rating: editingProduct ? editingProduct.rating : 4.9,
      reviewCount: editingProduct ? editingProduct.reviewCount : 5,
      sku: prodForm.sku,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      colors: colorsList.map((c) => ({
        ...c,
        images: c.images.length > 0 ? c.images : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
      })),
      sizes: [
        { size: 'XS', stock: Number(prodForm.stockXS) },
        { size: 'S', stock: Number(prodForm.stockS) },
        { size: 'M', stock: Number(prodForm.stockM) },
        { size: 'L', stock: Number(prodForm.stockL) },
        { size: 'XL', stock: Number(prodForm.stockXL) },
        { size: 'XXL', stock: Number(prodForm.stockXXL) },
      ],
    };

    db.saveProduct(newProd);
    setIsProductModalOpen(false);
    showNotification(`Product "${newProd.name}" saved & live on storefront!`);
  };

  const handleDeleteProduct = (p: Product) => {
    if (confirm(`Are you sure you want to delete "${p.name}"? It will be removed from inventory and storefront.`)) {
      db.deleteProduct(p.id);
      showNotification(`Product "${p.name}" deleted successfully.`);
    }
  };

  const handleToggleSectionFlag = (productId: string, flag: 'isTrending' | 'isNewArrival' | 'isBestSeller' | 'isSale', value: boolean) => {
    db.toggleProductFlag(productId, flag, value);
    showNotification(`Section product membership updated live!`);
  };

  // Add Existing Product to Active Section
  const handleAddProductToActiveSection = (productId: string) => {
    if (activeTab === 'trending') db.toggleProductFlag(productId, 'isTrending', true);
    if (activeTab === 'new-arrivals') db.toggleProductFlag(productId, 'isNewArrival', true);
    if (activeTab === 'best-sellers') db.toggleProductFlag(productId, 'isBestSeller', true);
    setIsPickerModalOpen(false);
    showNotification(`Product added to ${activeTab.toUpperCase().replace('-', ' ')} section!`);
  };

  // --- CATEGORIES MANAGEMENT ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatForm({
      name: '',
      slug: '',
      description: 'Curated fashion category for modern wardrobe staples.',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
      subcategories: 'Casual Tops, Statement Tops, Evening Tops',
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: cat.image,
      subcategories: cat.subcategories.join(', '),
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    const catSlug = catForm.slug.trim() || catForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const subcats = catForm.subcategories.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

    const categoryObj: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      slug: catSlug,
      name: catForm.name,
      description: catForm.description,
      image: catForm.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
      subcategories: subcats.length > 0 ? subcats : ['General'],
    };

    db.addCategory(categoryObj);
    setIsCategoryModalOpen(false);
    showNotification(`Category "${categoryObj.name}" updated & live on website!`);
  };

  const handleDeleteCategory = (cat: Category) => {
    if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      db.deleteCategory(cat.id);
      showNotification(`Category "${cat.name}" deleted.`);
    }
  };

  // --- COLLECTIONS MANAGEMENT ---
  const handleOpenAddCollection = () => {
    setEditingCollection(null);
    setColForm({
      name: '',
      slug: '',
      description: 'Exclusive styled edit designed for seasonal statement looks.',
      image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop',
    });
    setIsCollectionModalOpen(true);
  };

  const handleOpenEditCollection = (col: Collection) => {
    setEditingCollection(col);
    setColForm({
      name: col.name,
      slug: col.slug,
      description: col.description,
      image: col.image,
    });
    setIsCollectionModalOpen(true);
  };

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colForm.name.trim()) return;

    const colSlug = colForm.slug.trim() || colForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const colObj: Collection = {
      id: editingCollection ? editingCollection.id : `col-${Date.now()}`,
      slug: colSlug,
      name: colForm.name,
      description: colForm.description,
      image: colForm.image || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop',
    };

    db.saveCollection(colObj);
    setIsCollectionModalOpen(false);
    showNotification(`Collection "${colObj.name}" updated & live on Shop By Style!`);
  };

  const handleDeleteCollection = (col: Collection) => {
    if (confirm(`Are you sure you want to delete collection "${col.name}"?`)) {
      db.deleteCollection(col.id);
      showNotification(`Collection "${col.name}" deleted.`);
    }
  };

  // --- STYLE BY YOU (INSTAGRAM) MANAGEMENT ---
  const handleOpenAddInsta = () => {
    setEditingInstaId(null);
    setInstaForm({
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
      postUrl: 'https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg==',
    });
    setIsInstaModalOpen(true);
  };

  const handleOpenEditInsta = (item: { id: string; imageUrl: string; postUrl: string }) => {
    setEditingInstaId(item.id);
    setInstaForm({ imageUrl: item.imageUrl, postUrl: item.postUrl });
    setIsInstaModalOpen(true);
  };

  const handleSaveInsta = (e: React.FormEvent) => {
    e.preventDefault();
    const currentList = [...cms.instagramImages];
    if (editingInstaId) {
      const idx = currentList.findIndex((i) => i.id === editingInstaId);
      if (idx >= 0) currentList[idx] = { id: editingInstaId, ...instaForm };
    } else {
      currentList.unshift({ id: `insta-${Date.now()}`, ...instaForm });
    }
    const updatedCms = { ...cms, instagramImages: currentList };
    db.updateCMS(updatedCms);
    setCms(updatedCms);
    setIsInstaModalOpen(false);
    showNotification('Style By You look updated live!');
  };

  const handleDeleteInsta = (id: string) => {
    if (confirm('Delete this Style By You look image?')) {
      const updatedList = cms.instagramImages.filter((i) => i.id !== id);
      const updatedCms = { ...cms, instagramImages: updatedList };
      db.updateCMS(updatedCms);
      setCms(updatedCms);
      showNotification('Look photo removed.');
    }
  };

  const handleSaveCMSBanners = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateCMS(cms);
    showNotification('Homepage Banners updated live!');
  };

  // Section Filtered Products
  const trendingProds = products.filter((p) => p.isTrending);
  const newArrivalProds = products.filter((p) => p.isNewArrival || p.collections?.includes('new-arrivals'));
  const bestSellerProds = products.filter((p) => p.isBestSeller || p.reviewCount > 30);
  const saleProds = products.filter((p) => p.isSale || p.salePrice !== undefined);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
            ADMIN HOMEPAGE & SECTIONS MANAGER
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Add, Edit, and Delete products, categories & banners across Best Sellers, Trending Now, New Arrivals, Shop By Category, and Hero Banners.
          </p>
        </div>
        {saveSuccess && (
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-4 py-2 rounded flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 size={16} /> {saveSuccess}
          </span>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-brand-border pb-3 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('trending')}
          className={`px-4 py-2.5 rounded transition-all flex items-center gap-2 ${
            activeTab === 'trending' ? 'bg-brand-dark text-white shadow' : 'bg-white text-brand-dark hover:bg-brand-cream border border-brand-border'
          }`}
        >
          <Sparkles size={16} className="text-brand-gold" />
          <span>TRENDING NOW ({trendingProds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('new-arrivals')}
          className={`px-4 py-2.5 rounded transition-all flex items-center gap-2 ${
            activeTab === 'new-arrivals' ? 'bg-brand-dark text-white shadow' : 'bg-white text-brand-dark hover:bg-brand-cream border border-brand-border'
          }`}
        >
          <Flame size={16} className="text-amber-500" />
          <span>NEW ARRIVALS ({newArrivalProds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('best-sellers')}
          className={`px-4 py-2.5 rounded transition-all flex items-center gap-2 ${
            activeTab === 'best-sellers' ? 'bg-brand-dark text-white shadow' : 'bg-white text-brand-dark hover:bg-brand-cream border border-brand-border'
          }`}
        >
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>BEST SELLERS ({bestSellerProds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('shop-by')}
          className={`px-4 py-2.5 rounded transition-all flex items-center gap-2 ${
            activeTab === 'shop-by' ? 'bg-brand-dark text-white shadow' : 'bg-white text-brand-dark hover:bg-brand-cream border border-brand-border'
          }`}
        >
          <Grid size={16} className="text-brand-gold" />
          <span>SHOP BY CATEGORY ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('hero-banners')}
          className={`px-4 py-2.5 rounded transition-all flex items-center gap-2 ${
            activeTab === 'hero-banners' ? 'bg-brand-dark text-white shadow' : 'bg-white text-brand-dark hover:bg-brand-cream border border-brand-border'
          }`}
        >
          <Sliders size={16} />
          <span>HERO & BANNERS</span>
        </button>
      </div>

      {/* --- SECTION CONTENT RENDER --- */}

      {/* 1. TRENDING NOW SECTION */}
      {activeTab === 'trending' && (
        <SectionProductsGrid
          title="TRENDING NOW SECTION MANAGEMENT"
          subtitle="Products in this section will be displayed under 'TRENDING NOW' on the User Panel homepage."
          sectionBadgeName="TRENDING NOW"
          products={trendingProds}
          onAddProductClick={() => handleOpenAddProductForSection('isTrending')}
          onPickExistingClick={() => setIsPickerModalOpen(true)}
          onEditProduct={handleOpenEditProduct}
          onRemoveFromSection={(p) => handleToggleSectionFlag(p.id, 'isTrending', false)}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {/* 2. NEW ARRIVALS SECTION */}
      {activeTab === 'new-arrivals' && (
        <SectionProductsGrid
          title="NEW ARRIVALS SECTION MANAGEMENT"
          subtitle="Products in this section will be displayed under 'NEW ARRIVALS' on the User Panel homepage & category page."
          sectionBadgeName="NEW ARRIVALS"
          products={newArrivalProds}
          onAddProductClick={() => handleOpenAddProductForSection('isNewArrival')}
          onPickExistingClick={() => setIsPickerModalOpen(true)}
          onEditProduct={handleOpenEditProduct}
          onRemoveFromSection={(p) => handleToggleSectionFlag(p.id, 'isNewArrival', false)}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {/* 3. BEST SELLERS SECTION */}
      {activeTab === 'best-sellers' && (
        <SectionProductsGrid
          title="BEST SELLERS SECTION MANAGEMENT"
          subtitle="Products in this section will be displayed under 'BEST SELLERS' on the User Panel homepage."
          sectionBadgeName="BEST SELLERS"
          products={bestSellerProds}
          onAddProductClick={() => handleOpenAddProductForSection('isBestSeller')}
          onPickExistingClick={() => setIsPickerModalOpen(true)}
          onEditProduct={handleOpenEditProduct}
          onRemoveFromSection={(p) => handleToggleSectionFlag(p.id, 'isBestSeller', false)}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {/* 4. SHOP BY CATEGORY */}
      {activeTab === 'shop-by' && (
        <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-4">
            <div>
              <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">STORE CATEGORIES</span>
              <h2 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
                SHOP BY CATEGORY ({categories.length})
              </h2>
              <p className="text-xs text-brand-muted">Edit category titles, cover images, subcategories, and edit/delete categories live.</p>
            </div>

            <button
              onClick={handleOpenAddCategory}
              className="px-4 py-2.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded flex items-center justify-center gap-2 hover:bg-brand-dark/90 shadow"
            >
              <Plus size={16} />
              <span>ADD NEW CATEGORY</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="border border-brand-border rounded-lg overflow-hidden bg-brand-cream/30 flex flex-col justify-between shadow-xs">
                <div className="relative h-44 w-full bg-brand-dark">
                  <Image src={cat.image} alt={cat.name} fill unoptimized className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                    <span className="text-xs font-bold">{cat.name}</span>
                    <span className="text-[10px] opacity-80 font-mono">/{cat.slug}</span>
                  </div>
                </div>

                <div className="p-3 space-y-2 text-xs">
                  <p className="text-brand-muted text-[11px] line-clamp-2">{cat.description}</p>
                  <div className="text-[10px] text-brand-dark font-semibold">
                    Subcats: {cat.subcategories.join(', ')}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-brand-border">
                    <button
                      onClick={() => handleOpenEditCategory(cat)}
                      className="flex-1 py-1.5 bg-white border border-brand-border hover:bg-brand-cream text-brand-dark text-[11px] font-bold uppercase rounded flex items-center justify-center gap-1"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="py-1.5 px-3 bg-rose-50 border border-rose-200 text-brand-sale hover:bg-rose-100 text-[11px] font-bold rounded flex items-center justify-center"
                      title="Delete Category"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. HERO & BANNERS CMS */}
      {activeTab === 'hero-banners' && (
        <form onSubmit={handleSaveCMSBanners} className="space-y-6">
          {/* Announcement Bar */}
          <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
            <h2 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-3">
              1. ANNOUNCEMENT BAR CONTROL
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="annEnable"
                checked={cms.announcementBar.enabled}
                onChange={(e) => setCms({ ...cms, announcementBar: { ...cms.announcementBar, enabled: e.target.checked } })}
                className="w-4 h-4 accent-brand-dark"
              />
              <label htmlFor="annEnable" className="text-xs font-bold text-brand-dark">Enable Top Announcement Bar</label>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1">ANNOUNCEMENT TEXT</label>
              <input
                type="text"
                value={cms.announcementBar.text}
                onChange={(e) => setCms({ ...cms, announcementBar: { ...cms.announcementBar, text: e.target.value } })}
                className="w-full p-3 border border-brand-border rounded text-xs font-medium focus:outline-none focus:border-brand-dark"
              />
            </div>
          </div>

          {/* Main Hero Banner */}
          <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4 text-xs">
            <h2 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-3">
              2. MAIN FASHION HERO BANNER
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="font-semibold text-brand-dark block mb-1">HERO HEADLINE</label>
                <textarea
                  rows={2}
                  value={cms.hero.heading}
                  onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, heading: e.target.value } })}
                  className="w-full p-3 border border-brand-border rounded font-serif-title text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-semibold text-brand-dark block mb-1">HERO SUBTITLE</label>
                <textarea
                  rows={2}
                  value={cms.hero.subtitle}
                  onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, subtitle: e.target.value } })}
                  className="w-full p-3 border border-brand-border rounded"
                />
              </div>
              <div>
                <label className="font-semibold text-brand-dark block mb-1">PRIMARY BUTTON TEXT</label>
                <input
                  type="text"
                  value={cms.hero.buttonText}
                  onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, buttonText: e.target.value } })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>
              <div>
                <label className="font-semibold text-brand-dark block mb-1">PRIMARY BUTTON URL</label>
                <input
                  type="text"
                  value={cms.hero.buttonUrl}
                  onChange={(e) => setCms({ ...cms, hero: { ...cms.hero, buttonUrl: e.target.value } })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>

              {/* Desktop Hero Image */}
              <div className="space-y-2">
                <label className="font-semibold text-brand-dark block">DESKTOP HERO IMAGE</label>
                <div className="relative h-28 w-full bg-brand-cream rounded border border-brand-border overflow-hidden">
                  <Image src={cms.hero.desktopImage} alt="Desktop Hero" fill unoptimized className="object-cover" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, (url) => setCms({ ...cms, hero: { ...cms.hero, desktopImage: url } }));
                  }}
                  className="text-xs"
                />
              </div>

              {/* Mobile Hero Image */}
              <div className="space-y-2">
                <label className="font-semibold text-brand-dark block">MOBILE HERO IMAGE</label>
                <div className="relative h-28 w-full bg-brand-cream rounded border border-brand-border overflow-hidden">
                  <Image src={cms.hero.mobileImage} alt="Mobile Hero" fill unoptimized className="object-cover" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, (url) => setCms({ ...cms, hero: { ...cms.hero, mobileImage: url } }));
                  }}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Editorial Banner */}
          <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4 text-xs">
            <h2 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-3">
              3. EDITORIAL CAMPAIGN BANNER
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-brand-dark block mb-1">BANNER TITLE</label>
                <input
                  type="text"
                  value={cms.editorialBanner.heading}
                  onChange={(e) => setCms({ ...cms, editorialBanner: { ...cms.editorialBanner, heading: e.target.value } })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>
              <div>
                <label className="font-semibold text-brand-dark block mb-1">BANNER SUBTITLE</label>
                <input
                  type="text"
                  value={cms.editorialBanner.subtitle}
                  onChange={(e) => setCms({ ...cms, editorialBanner: { ...cms.editorialBanner, subtitle: e.target.value } })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-semibold text-brand-dark block mb-1">BANNER IMAGE</label>
                <div className="relative h-32 w-full bg-brand-cream rounded border border-brand-border overflow-hidden mb-2">
                  <Image src={cms.editorialBanner.image} alt="Editorial Banner" fill unoptimized className="object-cover" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, (url) => setCms({ ...cms, editorialBanner: { ...cms.editorialBanner, image: url } }));
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-brand-dark text-white font-bold uppercase tracking-widest rounded flex items-center justify-center gap-2 hover:bg-brand-dark/90 shadow-lg"
          >
            <Save size={18} />
            <span>SAVE HERO & BANNER CMS SETTINGS</span>
          </button>
        </form>
      )}

      {/* --- UNIVERSAL MODALS --- */}

      {/* 1. PRODUCT ADD / EDIT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsProductModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl z-10 p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div>
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">PRODUCT EDITOR</span>
                <h3 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
                  {editingProduct ? `EDIT "${editingProduct.name}"` : 'CREATE NEW PRODUCT FOR THIS SECTION'}
                </h3>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 hover:bg-brand-cream rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-brand-dark block mb-1">PRODUCT NAME *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full p-2.5 border border-brand-border rounded font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">SKU CODE *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full p-2.5 border border-brand-border rounded font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">CATEGORY *</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full p-2.5 border border-brand-border rounded bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">PRICE (NPR) *</label>
                    <input
                      type="number"
                      required
                      value={prodForm.price}
                      onChange={(e) => setProdForm({ ...prodForm, price: Number(e.target.value) })}
                      className="w-full p-2.5 border border-brand-border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">SALE PRICE (NPR)</label>
                    <input
                      type="number"
                      value={prodForm.salePrice}
                      onChange={(e) => setProdForm({ ...prodForm, salePrice: Number(e.target.value) })}
                      className="w-full p-2.5 border border-brand-border rounded font-mono font-bold text-brand-sale"
                    />
                  </div>
                </div>
              </div>

              {/* Section Badges / Membership Checkboxes */}
              <div className="bg-brand-cream/40 p-4 rounded border border-brand-border space-y-2">
                <span className="font-bold text-brand-dark block uppercase tracking-wider text-[11px]">
                  SECTION MEMBERSHIP BADGES (FEATURE ON HOMEPAGE):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={prodForm.isTrending}
                      onChange={(e) => setProdForm({ ...prodForm, isTrending: e.target.checked })}
                      className="w-4 h-4 accent-brand-dark"
                    />
                    <span>Trending Now</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={prodForm.isNewArrival}
                      onChange={(e) => setProdForm({ ...prodForm, isNewArrival: e.target.checked })}
                      className="w-4 h-4 accent-brand-dark"
                    />
                    <span>New Arrivals</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={prodForm.isBestSeller}
                      onChange={(e) => setProdForm({ ...prodForm, isBestSeller: e.target.checked })}
                      className="w-4 h-4 accent-brand-dark"
                    />
                    <span>Best Sellers</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-brand-sale">
                    <input
                      type="checkbox"
                      checked={prodForm.isSale}
                      onChange={(e) => setProdForm({ ...prodForm, isSale: e.target.checked })}
                      className="w-4 h-4 accent-rose-600"
                    />
                    <span>Sale Edit</span>
                  </label>
                </div>
              </div>

              {/* Inventory Stock by Size */}
              <div className="space-y-2">
                <span className="font-bold text-brand-dark block uppercase tracking-wider text-[11px]">INVENTORY STOCK PER SIZE (Free Size):</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => (
                    <div key={sz}>
                      <label className="text-[10px] font-bold text-brand-muted block text-center mb-0.5">{sz}</label>
                      <input
                        type="number"
                        value={(prodForm as any)[`stock${sz}`]}
                        onChange={(e) => setProdForm({ ...prodForm, [`stock${sz}`]: Number(e.target.value) })}
                        className="w-full p-2 border border-brand-border rounded text-center font-mono font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* DYNAMIC CLICKABLE PHOTO & COLOR/SIZE VARIANT INSPECTOR */}
              <ProductVariantInspector colors={colorsList} onChange={setColorsList} />

              {/* Description */}
              <div>
                <label className="font-semibold text-brand-dark block mb-1">DESCRIPTION & DETAILS</label>
                <textarea
                  rows={2}
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-2.5 bg-brand-cream text-brand-dark font-bold uppercase rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-dark text-white font-bold uppercase rounded shadow hover:bg-brand-dark/90"
                >
                  Save Product Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PICK EXISTING PRODUCT MODAL */}
      {isPickerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsPickerModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl z-10 p-6 space-y-4 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b border-brand-border pb-3">
              <h3 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider">
                SELECT PRODUCT TO ADD TO {activeTab.toUpperCase().replace('-', ' ')}
              </h3>
              <button onClick={() => setIsPickerModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-brand-cream/60 px-3 py-2 rounded border border-brand-border">
              <Search size={16} className="text-brand-muted" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="bg-transparent w-full focus:outline-none"
              />
            </div>

            <div className="divide-y divide-brand-border max-h-96 overflow-y-auto">
              {products
                .filter((p) => p.name.toLowerCase().includes(pickerSearch.toLowerCase()) || p.sku.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map((p) => {
                  const img = p.colors?.[0]?.images?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop';
                  return (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-brand-cream/30 px-2 rounded">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-14 bg-brand-cream rounded overflow-hidden">
                          <Image src={img} alt={p.name} fill unoptimized className="object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-brand-dark">{p.name}</div>
                          <div className="text-[10px] text-brand-muted font-mono">{p.sku} • NPR {p.price}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddProductToActiveSection(p.id)}
                        className="px-3 py-1.5 bg-brand-dark text-white font-bold uppercase rounded text-[10px] hover:bg-brand-gold hover:text-brand-dark"
                      >
                        + Add to Section
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 3. CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl z-10 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-brand-border pb-3">
              <h3 className="font-serif-title text-lg font-bold text-brand-dark uppercase">
                {editingCategory ? `EDIT CATEGORY "${editingCategory.name}"` : 'CREATE NEW CATEGORY'}
              </h3>
              <button onClick={() => setIsCategoryModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="font-bold block mb-1">CATEGORY NAME *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">IMAGE URL / COVER PHOTO *</label>
                <input
                  type="text"
                  required
                  value={catForm.image}
                  onChange={(e) => setCatForm({ ...catForm, image: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded font-mono"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">SUBCATEGORIES (COMMA SEPARATED)</label>
                <input
                  type="text"
                  value={catForm.subcategories}
                  onChange={(e) => setCatForm({ ...catForm, subcategories: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded"
                  placeholder="e.g. Basic Tops, Evening Blouses"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 bg-brand-cream rounded font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-brand-dark text-white rounded font-bold uppercase">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. COLLECTION MODAL */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsCollectionModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl z-10 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-brand-border pb-3">
              <h3 className="font-serif-title text-lg font-bold text-brand-dark uppercase">
                {editingCollection ? `EDIT COLLECTION "${editingCollection.name}"` : 'CREATE NEW COLLECTION'}
              </h3>
              <button onClick={() => setIsCollectionModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveCollection} className="space-y-4">
              <div>
                <label className="font-bold block mb-1">COLLECTION NAME *</label>
                <input
                  type="text"
                  required
                  value={colForm.name}
                  onChange={(e) => setColForm({ ...colForm, name: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">COVER IMAGE URL *</label>
                <input
                  type="text"
                  required
                  value={colForm.image}
                  onChange={(e) => setColForm({ ...colForm, image: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded font-mono"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={colForm.description}
                  onChange={(e) => setColForm({ ...colForm, description: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCollectionModalOpen(false)} className="px-4 py-2 bg-brand-cream rounded font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-brand-dark text-white rounded font-bold uppercase">Save Collection</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. STYLE BY YOU INSTAGRAM MODAL */}
      {isInstaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsInstaModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl z-10 p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-brand-border pb-3">
              <h3 className="font-serif-title text-lg font-bold text-brand-dark uppercase">
                {editingInstaId ? 'EDIT STYLE LOOK PHOTO' : 'ADD NEW STYLE LOOK PHOTO'}
              </h3>
              <button onClick={() => setIsInstaModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveInsta} className="space-y-4">
              <div>
                <label className="font-bold block mb-1">IMAGE URL *</label>
                <input
                  type="text"
                  required
                  value={instaForm.imageUrl}
                  onChange={(e) => setInstaForm({ ...instaForm, imageUrl: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded font-mono"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">INSTAGRAM POST / SHOP LINK *</label>
                <input
                  type="text"
                  required
                  value={instaForm.postUrl}
                  onChange={(e) => setInstaForm({ ...instaForm, postUrl: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsInstaModalOpen(false)} className="px-4 py-2 bg-brand-cream rounded font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-brand-dark text-white rounded font-bold uppercase">Save Look Photo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Component for Section Products List (Trending, New Arrivals, Best Sellers, Sale)
function SectionProductsGrid({
  title,
  subtitle,
  sectionBadgeName,
  products,
  onAddProductClick,
  onPickExistingClick,
  onEditProduct,
  onRemoveFromSection,
  onDeleteProduct,
}: {
  title: string;
  subtitle: string;
  sectionBadgeName: string;
  products: Product[];
  onAddProductClick: () => void;
  onPickExistingClick: () => void;
  onEditProduct: (p: Product) => void;
  onRemoveFromSection: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
        <div>
          <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">{sectionBadgeName} HOMEPAGE LIST</span>
          <h2 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">{title}</h2>
          <p className="text-xs text-brand-muted">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPickExistingClick}
            className="px-4 py-2.5 bg-brand-cream hover:bg-brand-border text-brand-dark text-xs font-bold uppercase tracking-wider rounded border border-brand-border flex items-center gap-1.5 transition-colors"
          >
            <Search size={15} />
            <span>Select From Catalog</span>
          </button>

          <button
            onClick={onAddProductClick}
            className="px-4 py-2.5 bg-brand-dark hover:bg-brand-dark/90 text-white text-xs font-bold uppercase tracking-widest rounded flex items-center gap-1.5 shadow"
          >
            <Plus size={15} />
            <span>Create New Product</span>
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-12 text-center text-brand-muted space-y-2 bg-brand-cream/30 rounded border border-dashed border-brand-border">
          <p className="font-semibold text-sm">No products currently in {sectionBadgeName}.</p>
          <p className="text-xs">Click &quot;Select From Catalog&quot; or &quot;Create New Product&quot; to add products to this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const totalStock = p.sizes.reduce((acc, s) => acc + s.stock, 0);
            const img = p.colors?.[0]?.images?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop';
            return (
              <div key={p.id} className="border border-brand-border rounded-lg p-3 bg-white flex gap-3 shadow-xs hover:border-brand-dark transition-all">
                <div className="relative w-20 h-24 bg-brand-cream rounded overflow-hidden flex-shrink-0">
                  <Image src={img} alt={p.name} fill unoptimized className="object-cover" />
                </div>

                <div className="flex-1 flex flex-col justify-between text-xs space-y-1">
                  <div>
                    <span className="text-[10px] font-mono text-brand-gold uppercase tracking-wider font-bold block">{p.category}</span>
                    <h3 className="font-bold text-brand-dark line-clamp-1">{p.name}</h3>
                    <div className="text-[11px] font-semibold text-brand-dark mt-0.5">
                      NPR {(p.salePrice || p.price).toLocaleString()}
                      {p.salePrice && <span className="text-brand-muted line-through ml-1.5 font-normal text-[10px]">NPR {p.price.toLocaleString()}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-brand-border">
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${totalStock > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-brand-sale'}`}>
                      {totalStock} in stock
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditProduct(p)}
                        className="p-1 text-brand-dark hover:bg-brand-cream rounded"
                        title="Edit Product Details & Stock"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => onRemoveFromSection(p)}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                        title={`Remove from ${sectionBadgeName}`}
                      >
                        <X size={14} />
                      </button>

                      <button
                        onClick={() => onDeleteProduct(p)}
                        className="p-1 text-brand-sale hover:bg-rose-50 rounded"
                        title="Delete Product Entirely"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
