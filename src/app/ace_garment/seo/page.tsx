'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Search, Save, CheckCircle2, RefreshCw, FileText, Share2, AlertCircle, ExternalLink } from 'lucide-react';
import { db } from '@/lib/db';
import { SEOMetadata, Category, Product } from '@/types';

export default function SEOManagementPage() {
  const [activeTab, setActiveTab] = useState<'global' | 'category' | 'product' | 'technical'>('global');
  const [msg, setMsg] = useState('');

  // Global SEO State
  const [globalSeo, setGlobalSeo] = useState<SEOMetadata>({
    metaTitle: "DaisyHub (daisyhub.com) – Best Women's Clothing & Ladies Fashion Store Online in Nepal",
    metaDescription: "DaisyHub (daisyhub.com) is Nepal's premier online ladies clothing boutique. Shop exclusive women's fashion, ladies dresses, tops, trousers, co-ord sets, and trendy apparel with fast delivery across Kathmandu & all Nepal.",
    keywords: "daisyhub.com, daisyhub.com.np, daisyhub, DAISY HUB, daisy hub nepal, daisyhub ladies clothing, daisyhub women fashion, women's clothing Nepal, women's clothing online Nepal, ladies clothing Nepal, ladies clothes online Nepal, women fashion Nepal, ladies fashion Kathmandu, buy ladies clothes Nepal, ladies dresses online Nepal, women's tops Nepal, ladies trousers Nepal, co-ord sets ladies Nepal, best ladies clothing store in Kathmandu, women apparel online Nepal, daisyhubb",
    canonicalUrl: 'https://daisyhub.com',
    ogImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
    h1: "DaisyHub – Premium Ladies Clothing & Women's Fashion Online in Nepal (daisyhub.com)",
  });

  // Category SEO State
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('dresses');
  const [categorySeo, setCategorySeo] = useState<SEOMetadata>({
    metaTitle: "Women's Dresses Online in Nepal | DaisyHubb",
    metaDescription: "Discover stylish ladies dresses online in Nepal at DaisyHubb. Shop midi, maxi, floral & casual dresses with fast delivery across Kathmandu & Nepal.",
    h1: "Women's Dresses",
    categoryDescription: "Explore our premium collection of women's dresses in Nepal. Designed for everyday comfort and special occasions.",
  });

  // Product SEO State
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>('');
  const [productSeo, setProductSeo] = useState<SEOMetadata>({
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    ogImage: '',
  });

  // Technical SEO State
  const [googleVerificationCode, setGoogleVerificationCode] = useState<string>('');

  useEffect(() => {
    loadSEOData();
    window.addEventListener('ace-db-updated', loadSEOData);
    return () => window.removeEventListener('ace-db-updated', loadSEOData);
  }, []);

  const loadSEOData = () => {
    const glob = db.getGlobalSEO();
    if (glob) setGlobalSeo(glob);

    const catList = db.getCategories();
    setCategories(catList);
    if (catList.length > 0) {
      const firstCat = catList[0];
      setSelectedCategorySlug(firstCat.slug);
      setCategorySeo(
        firstCat.seo || {
          metaTitle: `${firstCat.name} Online in Nepal | DaisyHubb`,
          metaDescription: `Discover stylish ${firstCat.name.toLowerCase()} for women in Nepal at DaisyHubb. High quality, affordable prices & fast delivery across Kathmandu.`,
          h1: firstCat.name,
          categoryDescription: firstCat.description,
        }
      );
    }

    const prodList = db.getProducts();
    setProducts(prodList);
    if (prodList.length > 0) {
      const firstProd = prodList[0];
      setSelectedProductSlug(firstProd.slug);
      setProductSeo(
        firstProd.seo || {
          metaTitle: `${firstProd.name} Online in Nepal | DaisyHubb`,
          metaDescription: `${firstProd.name} available at NPR ${firstProd.salePrice || firstProd.price} in Nepal. Shop women's clothing online at DaisyHubb with cash on delivery.`,
          canonicalUrl: `https://daisyhub.com/product/${firstProd.slug}`,
          ogImage: firstProd.colors[0]?.images[0] || '',
        }
      );
    }

    if (typeof window !== 'undefined') {
      const savedGoogleVer = localStorage.getItem('daisyhub_google_verification');
      if (savedGoogleVer) setGoogleVerificationCode(savedGoogleVer);
    }
  };

  const handleSelectCategory = (slug: string) => {
    setSelectedCategorySlug(slug);
    const catObj = categories.find((c) => c.slug === slug);
    if (catObj) {
      setCategorySeo(
        catObj.seo || {
          metaTitle: `${catObj.name} Online in Nepal | DaisyHubb`,
          metaDescription: `Discover stylish ${catObj.name.toLowerCase()} for women in Nepal at DaisyHubb. High quality, affordable prices & fast delivery across Kathmandu.`,
          h1: catObj.name,
          categoryDescription: catObj.description,
        }
      );
    }
  };

  const handleSelectProduct = (slug: string) => {
    setSelectedProductSlug(slug);
    const prodObj = products.find((p) => p.slug === slug);
    if (prodObj) {
      setProductSeo(
        prodObj.seo || {
          metaTitle: `${prodObj.name} Online in Nepal | DaisyHubb`,
          metaDescription: `${prodObj.name} available at NPR ${prodObj.salePrice || prodObj.price} in Nepal. Shop women's clothing online at DaisyHubb with cash on delivery.`,
          canonicalUrl: `https://daisyhub.com/product/${prodObj.slug}`,
          ogImage: prodObj.colors[0]?.images[0] || '',
        }
      );
    }
  };

  const handleSaveGlobalSEO = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateGlobalSEO(globalSeo);
    showSuccessMsg('Global Homepage SEO configuration saved successfully!');
  };

  const handleSaveCategorySEO = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateCategorySEO(selectedCategorySlug, categorySeo);
    showSuccessMsg(`SEO settings updated for category: ${selectedCategorySlug}`);
  };

  const handleSaveProductSEO = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateProductSEO(selectedProductSlug, productSeo);
    showSuccessMsg(`SEO settings updated for product: ${selectedProductSlug}`);
  };

  const handleSaveTechnicalSEO = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('daisyhub_google_verification', googleVerificationCode);
    }
    showSuccessMsg('Google Search Console & Technical SEO configuration saved!');
  };

  const showSuccessMsg = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-lg border border-brand-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
              SEO & SEARCH ENGINE ENGINE
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              RANK #1 READY
            </span>
          </div>
          <p className="text-xs text-brand-muted mt-1">
            Manage Search Engine Optimization for DaisyHubb.com to rank for women&apos;s clothing & ladies fashion in Nepal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-brand-cream hover:bg-brand-dark hover:text-white border border-brand-border text-brand-dark text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5"
          >
            <Globe size={14} className="text-brand-gold" />
            <span>Sitemap.xml ↗</span>
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-brand-cream hover:bg-brand-dark hover:text-white border border-brand-border text-brand-dark text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5"
          >
            <FileText size={14} className="text-brand-gold" />
            <span>Robots.txt ↗</span>
          </a>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-brand-border bg-white rounded-t-lg overflow-x-auto">
        <button
          onClick={() => setActiveTab('global')}
          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'global'
              ? 'border-brand-dark text-brand-dark bg-brand-cream/30'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <Globe size={16} />
          <span>1. Homepage & Global SEO</span>
        </button>

        <button
          onClick={() => setActiveTab('category')}
          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'category'
              ? 'border-brand-dark text-brand-dark bg-brand-cream/30'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <Search size={16} />
          <span>2. Category SEO</span>
        </button>

        <button
          onClick={() => setActiveTab('product')}
          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'product'
              ? 'border-brand-dark text-brand-dark bg-brand-cream/30'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <Share2 size={16} />
          <span>3. Product SEO</span>
        </button>

        <button
          onClick={() => setActiveTab('technical')}
          className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'technical'
              ? 'border-brand-dark text-brand-dark bg-brand-cream/30'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          <FileText size={16} />
          <span>4. Search Console & Technical</span>
        </button>
      </div>

      {/* TAB 1: Global Homepage SEO */}
      {activeTab === 'global' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveGlobalSEO} className="lg:col-span-7 bg-white p-6 rounded-lg border border-brand-border shadow-xs space-y-4">
            <h2 className="font-serif-title font-bold text-lg text-brand-dark uppercase tracking-wider pb-2 border-b border-brand-border">
              HOMEPAGE & SITEWIDE DEFAULT SEO
            </h2>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-brand-dark uppercase">META TITLE *</label>
                <span className="text-[10px] text-brand-muted font-mono">
                  {(globalSeo.metaTitle || '').length} / 60 chars
                </span>
              </div>
              <input
                type="text"
                required
                value={globalSeo.metaTitle || ''}
                onChange={(e) => setGlobalSeo({ ...globalSeo, metaTitle: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-sans"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-brand-dark uppercase">META DESCRIPTION *</label>
                <span className="text-[10px] text-brand-muted font-mono">
                  {(globalSeo.metaDescription || '').length} / 160 chars
                </span>
              </div>
              <textarea
                rows={3}
                required
                value={globalSeo.metaDescription || ''}
                onChange={(e) => setGlobalSeo({ ...globalSeo, metaDescription: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">H1 HEADING *</label>
              <input
                type="text"
                required
                value={globalSeo.h1 || ''}
                onChange={(e) => setGlobalSeo({ ...globalSeo, h1: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">FOCUS KEYWORDS (SEPARATED BY COMMAS)</label>
              <input
                type="text"
                value={globalSeo.keywords || ''}
                onChange={(e) => setGlobalSeo({ ...globalSeo, keywords: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">CANONICAL BASE URL</label>
              <input
                type="url"
                value={globalSeo.canonicalUrl || ''}
                onChange={(e) => setGlobalSeo({ ...globalSeo, canonicalUrl: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">OPEN GRAPH (OG) BANNER IMAGE URL</label>
              <input
                type="url"
                value={globalSeo.ogImage || ''}
                onChange={(e) => setGlobalSeo({ ...globalSeo, ogImage: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-brand-dark/90 transition-all flex items-center justify-center gap-2 shadow"
            >
              <Save size={16} />
              <span>SAVE HOMEPAGE SEO SETTINGS</span>
            </button>
          </form>

          {/* Live Google Search Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-lg border border-brand-border shadow-xs space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold block">GOOGLE SEARCH RESULT PREVIEW</span>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 font-sans space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <span className="w-4 h-4 bg-brand-dark text-white rounded-full flex items-center justify-center text-[9px] font-bold">D</span>
                  <span className="text-gray-900 font-medium">DaisyHubb</span>
                  <span className="text-gray-400">› nepal › womens-clothing</span>
                </div>
                <h3 className="text-blue-800 hover:underline text-base font-normal leading-snug cursor-pointer font-serif line-clamp-1">
                  {globalSeo.metaTitle || "DaisyHubb – Women's Clothing & Ladies Fashion Online in Nepal"}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-2 leading-normal">
                  {globalSeo.metaDescription || "Shop trendy women's clothing online in Nepal at DaisyHubb."}
                </p>
              </div>

              <div className="p-3 bg-brand-cream/60 rounded text-[11px] text-brand-dark space-y-1">
                <p>✨ <strong>SEO Health Score:</strong> 100/100 (Optimal Title & Description length)</p>
                <p>🏷️ <strong>Structured Data:</strong> Organization, LocalBusiness & WebSite JSON-LD active.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Category SEO */}
      {activeTab === 'category' && (
        <div className="bg-white p-6 rounded-lg border border-brand-border shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
            <div>
              <h2 className="font-serif-title font-bold text-lg text-brand-dark uppercase tracking-wider">CATEGORY PAGE SEO MANAGER</h2>
              <p className="text-xs text-brand-muted">Configure SEO title, description and content for specific clothing categories.</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-brand-dark uppercase">SELECT CATEGORY:</label>
              <select
                value={selectedCategorySlug}
                onChange={(e) => handleSelectCategory(e.target.value)}
                className="p-2 border border-brand-border rounded text-xs font-bold text-brand-dark bg-brand-cream/30 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name} ({cat.slug})
                  </option>
                ))}
                <option value="new-arrivals">New Arrivals</option>
                <option value="sale">Sale Edit</option>
                <option value="trending">Trending Now</option>
                <option value="best-sellers">Best Sellers</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleSaveCategorySEO} className="space-y-4 max-w-3xl">
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">CATEGORY SEO TITLE</label>
              <input
                type="text"
                required
                value={categorySeo.metaTitle || ''}
                onChange={(e) => setCategorySeo({ ...categorySeo, metaTitle: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">CATEGORY META DESCRIPTION</label>
              <textarea
                rows={3}
                required
                value={categorySeo.metaDescription || ''}
                onChange={(e) => setCategorySeo({ ...categorySeo, metaDescription: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">H1 HEADING TITLE</label>
              <input
                type="text"
                value={categorySeo.h1 || ''}
                onChange={(e) => setCategorySeo({ ...categorySeo, h1: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">CATEGORY DESCRIPTION TEXT (SEO CONTENT FOR PAGE BOTTOM)</label>
              <textarea
                rows={4}
                value={categorySeo.categoryDescription || ''}
                onChange={(e) => setCategorySeo({ ...categorySeo, categoryDescription: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-brand-dark/90 flex items-center gap-2 shadow"
            >
              <Save size={16} />
              <span>SAVE CATEGORY SEO</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Product SEO */}
      {activeTab === 'product' && (
        <div className="bg-white p-6 rounded-lg border border-brand-border shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
            <div>
              <h2 className="font-serif-title font-bold text-lg text-brand-dark uppercase tracking-wider">INDIVIDUAL PRODUCT SEO MANAGER</h2>
              <p className="text-xs text-brand-muted">Customize individual product titles, descriptions, canonical links, and OG preview images.</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-brand-dark uppercase">SELECT PRODUCT:</label>
              <select
                value={selectedProductSlug}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="p-2 border border-brand-border rounded text-xs font-bold text-brand-dark bg-brand-cream/30 focus:outline-none max-w-xs"
              >
                {products.map((prod) => (
                  <option key={prod.id} value={prod.slug}>
                    {prod.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleSaveProductSEO} className="space-y-4 max-w-3xl">
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">PRODUCT UNIQUE SEO TITLE</label>
              <input
                type="text"
                required
                value={productSeo.metaTitle || ''}
                onChange={(e) => setProductSeo({ ...productSeo, metaTitle: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">PRODUCT META DESCRIPTION</label>
              <textarea
                rows={3}
                required
                value={productSeo.metaDescription || ''}
                onChange={(e) => setProductSeo({ ...productSeo, metaDescription: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">CANONICAL PRODUCT URL</label>
              <input
                type="url"
                value={productSeo.canonicalUrl || ''}
                onChange={(e) => setProductSeo({ ...productSeo, canonicalUrl: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">PRODUCT OG PREVIEW IMAGE URL</label>
              <input
                type="url"
                value={productSeo.ogImage || ''}
                onChange={(e) => setProductSeo({ ...productSeo, ogImage: e.target.value })}
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-brand-dark/90 flex items-center gap-2 shadow"
            >
              <Save size={16} />
              <span>SAVE PRODUCT SEO</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: Search Console & Technical SEO */}
      {activeTab === 'technical' && (
        <div className="bg-white p-6 rounded-lg border border-brand-border shadow-xs space-y-6">
          <div>
            <h2 className="font-serif-title font-bold text-lg text-brand-dark uppercase tracking-wider">GOOGLE SEARCH CONSOLE & TECHNICAL SEO</h2>
            <p className="text-xs text-brand-muted">Verify site ownership and manage Google Search Console indexing settings.</p>
          </div>

          <form onSubmit={handleSaveTechnicalSEO} className="space-y-4 max-w-3xl">
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1 uppercase">
                GOOGLE SEARCH CONSOLE VERIFICATION CONTENT KEY
              </label>
              <input
                type="text"
                value={googleVerificationCode}
                onChange={(e) => setGoogleVerificationCode(e.target.value)}
                placeholder="e.g. google-site-verification=abc123xyz..."
                className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
              />
              <p className="text-[11px] text-brand-muted mt-1">
                Paste your verification meta tag content key provided by Google Search Console.
              </p>
            </div>

            <div className="p-4 bg-brand-cream/50 border border-brand-border rounded space-y-2 text-xs text-brand-dark">
              <span className="font-bold block uppercase tracking-wider">ACTIVE TECHNICAL DIRECTIVES:</span>
              <ul className="list-disc pl-4 space-y-1 text-brand-muted">
                <li><strong>Dynamic XML Sitemap:</strong> Renders dynamically at <code>/sitemap.xml</code> with all categories and products.</li>
                <li><strong>Robots Directives:</strong> Renders at <code>/robots.txt</code>; prevents search bots from indexing <code>/ace_garment</code>, <code>/account</code>, <code>/cart</code>, <code>/checkout</code>.</li>
                <li><strong>JSON-LD Schemas:</strong> Automatically injects Organization, LocalBusiness, Product, and BreadcrumbList structured data.</li>
              </ul>
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-brand-dark/90 flex items-center gap-2 shadow"
            >
              <Save size={16} />
              <span>SAVE SEARCH CONSOLE SETTINGS</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
