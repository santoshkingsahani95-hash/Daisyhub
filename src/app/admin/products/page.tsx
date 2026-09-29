'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Edit2, Trash2, Search, X, Check, Image as ImageIcon, Upload, Palette } from 'lucide-react';
import { db } from '@/lib/db';
import { Product, ColorOption, Category } from '@/types';
import { ProductVariantInspector } from '@/components/admin/product-variant-inspector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFileUpload = async (file: File, callback: (url: string) => void) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          callback(data.url);
          return;
        }
      }
    } catch (e) {
      console.warn('[Products Upload Error] Failed to upload image via API:', e);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    category: 'tops',
    price: 1999,
    salePrice: 1599,
    description: '',
    isFreeDelivery: false,
  });

  // Multi-Color & Multi-Image State
  const [colorsList, setColorsList] = useState<ColorOption[]>([
    {
      name: 'Black',
      code: '#111111',
      images: [
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop',
      ],
    },
  ]);

  const fetchFreshProducts = React.useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ]);

      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        if (prodJson.success && Array.isArray(prodJson.products)) {
          setProducts(prodJson.products);
        }
      }

      if (catRes.ok) {
        const catJson = await catRes.json();
        if (catJson.success && Array.isArray(catJson.categories)) {
          setCategories(catJson.categories);
        }
      }
      return;
    } catch (e) {
      console.warn('[Products Page] Direct API fetch warning:', e);
    }
    setProducts(db.getProducts());
    setCategories(db.getCategories());
  }, []);

  useEffect(() => {
    fetchFreshProducts();

    const handleDbUpdate = () => {
      fetchFreshProducts();
    };
    window.addEventListener('ace-db-updated', handleDbUpdate);
    return () => window.removeEventListener('ace-db-updated', handleDbUpdate);
  }, [fetchFreshProducts]);

  const filtered = products.filter((p) => {
    if (!p) return false;
    const name = (p.name || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const query = (searchQuery || '').toLowerCase();
    return name.includes(query) || sku.includes(query) || cat.includes(query);
  });

  const handleOpenAdd = () => {
    const cats = db.getCategories();
    setCategories(cats);
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      sku: `DAISY-PROD-${Math.floor(100 + Math.random() * 900)}`,
      category: cats[0]?.slug || 'tops',
      price: 1999,
      salePrice: 1599,
      description: 'Elegant women’s fashion piece designed for effortless confidence.',
      isFreeDelivery: false,
    });
    setColorsList([
      {
        name: 'Default',
        code: '#111111',
        images: [],
      },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category: p.category,
      price: p.price,
      salePrice: p.salePrice || 0,
      description: p.description,
      isFreeDelivery: !!p.isFreeDelivery,
    });
    if (p.colors && p.colors.length > 0) {
      setColorsList(JSON.parse(JSON.stringify(p.colors)));
    } else {
      setColorsList([
        {
          name: 'Default',
          code: '#111111',
          images: [],
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      db.deleteProduct(id);
      try {
        const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          cache: 'no-store',
        });
        if (res.ok) {
          fetchFreshProducts();
        }
      } catch (e) {}
      fetchFreshProducts();
    }
  };

  // Color & Image Helpers
  const handleAddColorVariant = () => {
    setColorsList([
      ...colorsList,
      {
        name: `Color ${colorsList.length + 1}`,
        code: '#C0C0C0',
        images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
      },
    ]);
  };

  const handleRemoveColorVariant = (index: number) => {
    if (colorsList.length <= 1) {
      alert('Product must have at least 1 color variant.');
      return;
    }
    setColorsList(colorsList.filter((_, idx) => idx !== index));
  };

  const [activeProdColorIdx, setActiveProdColorIdx] = useState<number>(0);
  const [activeProdImgIdx, setActiveProdImgIdx] = useState<number>(0);

  const handleColorChange = (index: number, field: keyof ColorOption, value: any) => {
    const updated = [...colorsList];
    updated[index] = { ...updated[index], [field]: value };
    setColorsList(updated);
  };

  const handleImageUploadForColor = (colorIndex: number, file: File) => {
    handleFileUpload(file, (dataUrl) => {
      const updated = [...colorsList];
      updated[colorIndex].images = [...updated[colorIndex].images, dataUrl];
      setColorsList(updated);
    });
  };

  const handleAddImageUrlForColor = (colorIndex: number, url: string) => {
    if (!url.trim()) return;
    const updated = [...colorsList];
    updated[colorIndex].images = [...updated[colorIndex].images, url.trim()];
    setColorsList(updated);
  };

  const handleRemoveImageFromColor = (colorIndex: number, imageIndex: number) => {
    const updated = [...colorsList];
    if (updated[colorIndex].images.length <= 1) {
      alert('Each color variant must have at least 1 image.');
      return;
    }
    updated[colorIndex].images = updated[colorIndex].images.filter((_, idx) => idx !== imageIndex);
    setColorsList(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSaveError('Product Name is required.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    // Build unique slug
    let baseSlug = formData.slug || formData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'product';

    // If creating new product and slug collides with another product, append unique suffix
    let finalSlug = baseSlug;
    const existingWithSlug = products.find((p) => p.slug === finalSlug && p.id !== (editingProduct?.id || ''));
    if (existingWithSlug) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const prodId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;

    const newProd: Product = {
      id: prodId,
      slug: finalSlug,
      name: formData.name.trim(),
      description: formData.description,
      category: formData.category,
      price: Number(formData.price),
      salePrice: Number(formData.salePrice) > 0 ? Number(formData.salePrice) : undefined,
      discountPercentage: Number(formData.salePrice) > 0 ? Math.round(((formData.price - formData.salePrice) / formData.price) * 100) : undefined,
      rating: editingProduct ? editingProduct.rating : 4.8,
      reviewCount: editingProduct ? editingProduct.reviewCount : 1,
      sku: formData.sku.trim(),
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      colors: colorsList.map((c) => ({
        ...c,
        name: c.name.trim() || 'Default',
        code: c.code || '#111111',
        images: c.images.length > 0 ? c.images : [],
      })),
      sizes: [
        { size: 'Free Size', stock: colorsList.reduce((acc, c) => acc + (typeof c.stock === 'number' ? c.stock : 10), 0) },
      ],
      isFreeDelivery: formData.isFreeDelivery,
    };

    // 1. Save locally with skipServerSync=true (we will send the server POST directly next)
    db.saveProduct(newProd, true);

    // 2. Direct POST to /api/products and await response
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        if (result.products && Array.isArray(result.products)) {
          setProducts(result.products);
        }
        setIsModalOpen(false);
        fetchFreshProducts();
      } else {
        const msg = result?.error || 'Failed to save product to database.';
        setSaveError(msg);
        console.error('[Products Page] Save error:', msg);
      }
    } catch (err: any) {
      console.error('[Products Page] Network/Server Error saving product:', err);
      setSaveError(err?.message || 'Network error while connecting to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-foreground uppercase tracking-wider">
            PRODUCT MANAGEMENT
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage women&apos;s fashion catalog, multi-color variants, 2+ images per color & stock setup.</p>
        </div>

        <Button
          onClick={handleOpenAdd}
          variant="luxury"
          size="default"
          className="gap-2 tracking-wider shadow-sm"
        >
          <Plus size={16} />
          <span>ADD NEW PRODUCT</span>
        </Button>
      </div>

      {/* Table & Controls */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 max-w-md relative">
            <Search size={15} className="absolute left-3 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, category..."
              className="pl-9 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Colors & Photos</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const sizes = Array.isArray(p.sizes) ? p.sizes : [];
                  const colors = Array.isArray(p.colors) ? p.colors : [];
                  const totalStock = sizes.reduce((acc, s) => acc + (s?.stock || 0), 0);
                  const displayImg = colors[0]?.images?.[0] || '';
                  const totalPhotos = colors.reduce((acc, c) => acc + (Array.isArray(c?.images) ? c.images.length : 0), 0);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-12 bg-secondary rounded overflow-hidden shrink-0 border border-border">
                            {displayImg ? (
                              <Image src={displayImg} alt={p.name || 'Product'} fill unoptimized className="object-cover" />
                            ) : (
                              <ImageIcon size={16} className="m-auto text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block line-clamp-1">{p.name || 'Unnamed Product'}</span>
                            <span className="text-[10px] text-muted-foreground">{colors.map((c) => c.name || 'Default').join(', ')}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] font-semibold">{p.sku || 'N/A'}</TableCell>
                      <TableCell className="uppercase font-medium text-muted-foreground text-[11px]">
                        {categories.find((c) => c.slug === p.category)?.name || p.category || 'General'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            {colors.map((c, i) => (
                              <span
                                key={i}
                                className="w-3.5 h-3.5 rounded-full border border-border shadow-xs"
                                style={{ backgroundColor: c.code || '#111111' }}
                                title={`${c.name || 'Color'} (${Array.isArray(c.images) ? c.images.length : 0} photos)`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {colors.length} color(s) • {totalPhotos} photo(s)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        NPR {(p.salePrice || p.price).toLocaleString()}
                        {p.salePrice && <span className="text-muted-foreground line-through font-normal text-[10px] block">NPR {p.price.toLocaleString()}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={totalStock > 20 ? 'success' : totalStock > 5 ? 'warning' : 'destructive'}
                          className="font-mono text-[9px]"
                        >
                          {totalStock} UNITS
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => handleOpenEdit(p)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-foreground hover:text-brand-gold"
                            title="Edit Product & Photos"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            onClick={() => handleDelete(p.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />

          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl z-10 p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div>
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">ADMIN CATALOG EDITOR</span>
                <h3 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
                  {editingProduct ? 'EDIT PRODUCT, COLOR VARIANTS & IMAGES' : 'CREATE NEW PRODUCT WITH COLOR-WISE IMAGES'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-brand-cream rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-brand-dark block mb-1">PRODUCT NAME *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 border border-brand-border rounded focus:outline-none focus:border-brand-dark font-medium"
                    placeholder="e.g. Satin Cowl Neck Midi Dress"
                  />
                </div>
                <div>
                  <label className="font-semibold text-brand-dark block mb-1">SKU CODE *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2.5 border border-brand-border rounded font-mono focus:outline-none focus:border-brand-dark"
                  />
                </div>
                <div>
                  <label className="font-semibold text-brand-dark block mb-1">CATEGORY *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-brand-border rounded bg-white font-medium"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id || cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                    {formData.category && !categories.some((c) => c.slug === formData.category) && (
                      <option value={formData.category}>{formData.category}</option>
                    )}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">REGULAR PRICE (NPR) *</label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full p-2.5 border border-brand-border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-brand-dark block mb-1">SALE PRICE (NPR)</label>
                    <input
                      type="number"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                      className="w-full p-2.5 border border-brand-border rounded font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-brand-dark block mb-1">CLOTHES DESCRIPTION & DETAILS</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 border border-brand-border rounded"
                  placeholder="Enter details regarding fabric weave, fit notes, and styling instructions..."
                />
              </div>

              {/* DELIVERY FEE SETTINGS PER PRODUCT */}
              <div className="bg-brand-cream/50 p-4 rounded-lg border border-brand-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-dark uppercase tracking-wider">
                    🚚 DELIVERY FEE CUSTOMIZATION FOR THIS PRODUCT
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFreeDelivery}
                      onChange={(e) => setFormData({ ...formData, isFreeDelivery: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-emerald-700 uppercase">OFFER FREE DELIVERY</span>
                  </label>
              </div>

              {/* DYNAMIC CLICKABLE PHOTO & COLOR/SIZE VARIANT INSPECTOR */}
              <ProductVariantInspector colors={colorsList} onChange={setColorsList} />

              {saveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs rounded-md">
                  ⚠️ {saveError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-brand-border">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-brand-border text-brand-dark font-semibold rounded hover:bg-brand-cream disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-2.5 bg-brand-dark text-white font-bold uppercase tracking-widest rounded shadow hover:bg-brand-dark/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>SAVING TO MYSQL...</span>
                    </>
                  ) : (
                    <span>SAVE PRODUCT & COLOR IMAGES</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
