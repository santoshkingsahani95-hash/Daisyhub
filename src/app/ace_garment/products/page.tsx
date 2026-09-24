'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Edit2, Trash2, Search, X, Check, Image as ImageIcon, Upload, Palette } from 'lucide-react';
import { db } from '@/lib/db';
import { Product, ColorOption } from '@/types';
import { ProductVariantInspector } from '@/components/admin/product-variant-inspector';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    category: 'tops',
    price: 1999,
    salePrice: 1599,
    description: '',
    insideValleyFee: 100,
    outsideValleyFee: 200,
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

  useEffect(() => {
    setProducts(db.getProducts());
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      sku: `DAISY-PROD-${Math.floor(100 + Math.random() * 900)}`,
      category: 'tops',
      price: 1999,
      salePrice: 1599,
      description: 'Elegant women’s fashion piece designed for effortless confidence.',
      insideValleyFee: 100,
      outsideValleyFee: 200,
      isFreeDelivery: false,
    });
    setColorsList([
      {
        name: 'Black',
        code: '#111111',
        images: [
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop',
        ],
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
      insideValleyFee: p.insideValleyFee !== undefined ? p.insideValleyFee : 100,
      outsideValleyFee: p.outsideValleyFee !== undefined ? p.outsideValleyFee : 200,
      isFreeDelivery: !!p.isFreeDelivery,
    });
    if (p.colors && p.colors.length > 0) {
      setColorsList(JSON.parse(JSON.stringify(p.colors)));
    } else {
      setColorsList([
        {
          name: 'Black',
          code: '#111111',
          images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      db.deleteProduct(id);
      setProducts(db.getProducts());
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const slugGen = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      slug: slugGen,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      price: Number(formData.price),
      salePrice: Number(formData.salePrice) > 0 ? Number(formData.salePrice) : undefined,
      discountPercentage: Number(formData.salePrice) > 0 ? Math.round(((formData.price - formData.salePrice) / formData.price) * 100) : undefined,
      rating: editingProduct ? editingProduct.rating : 4.8,
      reviewCount: editingProduct ? editingProduct.reviewCount : 1,
      sku: formData.sku,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      colors: colorsList.map((c) => ({
        ...c,
        images: c.images.length > 0 ? c.images : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
      })),
      sizes: [
        { size: 'Free Size', stock: colorsList.reduce((acc, c) => acc + (c.stock || 50), 0) },
      ],
      insideValleyFee: Number(formData.insideValleyFee) || 100,
      outsideValleyFee: Number(formData.outsideValleyFee) || 200,
      isFreeDelivery: formData.isFreeDelivery,
    };

    db.saveProduct(newProd);
    setProducts(db.getProducts());
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
            PRODUCT MANAGEMENT
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">Manage women&apos;s fashion catalog, multi-color variants, 2+ images per color & stock setup.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 flex items-center justify-center gap-2 rounded shadow"
        >
          <Plus size={16} />
          <span>ADD NEW PRODUCT</span>
        </button>
      </div>

      {/* Table & Controls */}
      <div className="bg-white rounded-lg border border-brand-border shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 bg-brand-cream/60 px-4 py-2.5 rounded max-w-md border border-brand-border">
          <Search size={16} className="text-brand-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, SKU, category..."
            className="bg-transparent text-xs w-full focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-dark">
            <thead className="bg-brand-cream uppercase text-[10px] font-bold tracking-wider text-brand-muted">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3">Colors & Photos</th>
                <th className="p-3">Price</th>
                <th className="p-3">Total Stock</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map((p) => {
                const totalStock = p.sizes.reduce((acc, s) => acc + s.stock, 0);
                const displayImg = p.colors[0]?.images[0] || '';
                const totalPhotos = p.colors.reduce((acc, c) => acc + c.images.length, 0);
                return (
                  <tr key={p.id} className="hover:bg-brand-cream/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-12 bg-brand-cream rounded overflow-hidden shrink-0 border border-brand-border">
                          {displayImg ? (
                            <Image src={displayImg} alt={p.name} fill unoptimized className="object-cover" />
                          ) : (
                            <ImageIcon size={16} className="m-auto text-brand-muted" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold block line-clamp-1">{p.name}</span>
                          <span className="text-[10px] text-brand-muted">{p.colors.map((c) => c.name).join(', ')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] font-semibold">{p.sku}</td>
                    <td className="p-3 uppercase font-medium text-brand-muted">{p.category}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          {p.colors.map((c, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                              style={{ backgroundColor: c.code }}
                              title={`${c.name} (${c.images.length} photos)`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-brand-dark">
                          {p.colors.length} color(s) • {totalPhotos} photo(s)
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-bold">
                      NPR {(p.salePrice || p.price).toLocaleString()}
                      {p.salePrice && <span className="text-brand-muted line-through font-normal text-[10px] block">NPR {p.price.toLocaleString()}</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        totalStock > 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-brand-sale'
                      }`}>
                        {totalStock} UNITS
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-brand-dark hover:bg-brand-cream rounded"
                          title="Edit Product & Photos"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-brand-sale hover:bg-rose-50 rounded"
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                    className="w-full p-2.5 border border-brand-border rounded bg-white"
                  >
                    <option value="tops">Tops & Blouses</option>
                    <option value="dresses">Dresses</option>
                    <option value="bottoms">Bottoms & Jeans</option>
                    <option value="sets">Co-ord Sets</option>
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

                {!formData.isFreeDelivery && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-brand-dark block mb-1">
                        INSIDE VALLEY DELIVERY FEE (NPR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.insideValleyFee}
                        onChange={(e) => setFormData({ ...formData, insideValleyFee: Number(e.target.value) })}
                        className="w-full p-2.5 border border-brand-border rounded font-mono font-bold text-xs bg-white"
                        placeholder="e.g. 100"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-brand-dark block mb-1">
                        OUTSIDE VALLEY DELIVERY FEE (NPR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.outsideValleyFee}
                        onChange={(e) => setFormData({ ...formData, outsideValleyFee: Number(e.target.value) })}
                        className="w-full p-2.5 border border-brand-border rounded font-mono font-bold text-xs bg-white"
                        placeholder="e.g. 200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* DYNAMIC CLICKABLE PHOTO & COLOR/SIZE VARIANT INSPECTOR */}
              <ProductVariantInspector colors={colorsList} onChange={setColorsList} />

              <div className="pt-2 flex justify-end gap-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-brand-border text-brand-dark font-semibold rounded hover:bg-brand-cream"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-brand-dark text-white font-bold uppercase tracking-widest rounded shadow"
                >
                  SAVE PRODUCT & COLOR IMAGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
