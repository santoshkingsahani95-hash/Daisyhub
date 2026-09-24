'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Boxes, Plus, Save, X, CheckCircle2, Image as ImageIcon, Camera, Edit3, Upload, Trash2, Palette } from 'lucide-react';
import { db } from '@/lib/db';
import { Product, ColorOption } from '@/types';

interface KeypadStockInputProps {
  currentStock: number;
  onUpdate: (newVal: number) => void;
}

const KeypadStockInput: React.FC<KeypadStockInputProps> = ({ currentStock, onUpdate }) => {
  const safeStock = isNaN(Number(currentStock)) || Number(currentStock) > 9999 ? 15 : Math.max(0, Math.floor(Number(currentStock)));
  const [val, setVal] = useState<string>(safeStock.toString());
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      setVal(safeStock.toString());
    }
  }, [safeStock, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInt(val, 10);
    const safe = isNaN(parsed) ? 0 : Math.min(999, Math.max(0, parsed));
    setVal(safe.toString());
    if (safe !== safeStock) {
      onUpdate(safe);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 bg-brand-cream/50 p-1 rounded-md border border-brand-border">
      <button
        type="button"
        onClick={() => {
          const next = Math.max(0, safeStock - 1);
          setVal(next.toString());
          onUpdate(next);
        }}
        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-brand-cream border border-brand-border text-brand-dark font-extrabold text-sm rounded shadow-2xs active:scale-95 transition-all cursor-pointer"
        title="Decrease stock by 1"
      >
        -
      </button>
      <input
        type="number"
        min={0}
        max={999}
        value={val}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.select();
        }}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleBlur();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-16 h-7 border border-brand-border rounded text-center font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent bg-white shadow-2xs"
        title="Click & type stock quantity directly with keypad"
      />
      <button
        type="button"
        onClick={() => {
          const next = Math.min(999, safeStock + 1);
          setVal(next.toString());
          onUpdate(next);
        }}
        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-brand-cream border border-brand-border text-brand-dark font-extrabold text-sm rounded shadow-2xs active:scale-95 transition-all cursor-pointer"
        title="Increase stock by 1"
      >
        +
      </button>
    </div>
  );
};

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [updateMsg, setUpdateMsg] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Photo & Color Gallery Manager Modal State for existing Inventory Item
  const [photoModalProd, setPhotoModalProd] = useState<Product | null>(null);
  const [editingColors, setEditingColors] = useState<ColorOption[]>([]);

  // Form State for Adding New Inventory Item
  const [newItemData, setNewItemData] = useState({
    name: '',
    category: 'tops',
    sku: '',
    price: 1999,
    salePrice: 1599,
    description: '',
    totalStock: 50,
  });

  // Dynamic Color Variants & Multi-Image State for New Inventory Item
  const [newItemColors, setNewItemColors] = useState<ColorOption[]>([
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

  const handleStockChange = (productId: string, size: string, newStock: number) => {
    db.updateInventory(productId, size, newStock);
    // Preserve exact sequence order of products array in state
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedSizes =
            p.sizes && p.sizes.length > 0
              ? p.sizes.map((s) => ({ ...s, stock: newStock }))
              : [{ size: 'Free Size', stock: newStock }];
          return { ...p, sizes: updatedSizes };
        }
        return p;
      })
    );
    setUpdateMsg('Inventory stock level updated dynamically.');
    setTimeout(() => setUpdateMsg(''), 3000);
  };

  const handleColorStockChange = (productId: string, colorName: string, newStock: number) => {
    db.updateColorStock(productId, colorName, newStock);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedColors = p.colors.map((c) =>
            c.name.toLowerCase() === colorName.toLowerCase() ? { ...c, stock: newStock } : c
          );
          const totalColorStock = updatedColors.reduce((acc, c) => acc + (c.stock !== undefined ? c.stock : 10), 0);
          return {
            ...p,
            colors: updatedColors,
            sizes: [{ size: 'Free Size', stock: totalColorStock }],
          };
        }
        return p;
      })
    );
    setUpdateMsg(`Stock for color "${colorName}" updated dynamically.`);
    setTimeout(() => setUpdateMsg(''), 3000);
  };

  const handleDeleteProduct = (productId: string, prodName: string) => {
    if (confirm(`Are you sure you want to delete "${prodName}" from inventory?`)) {
      db.deleteProduct(productId);
      setProducts([...db.getProducts()]);
      setUpdateMsg(`Product "${prodName}" deleted from inventory.`);
      setTimeout(() => setUpdateMsg(''), 3000);
    }
  };

  const handleOpenPhotoModal = (prod: Product) => {
    setPhotoModalProd(prod);
    setActiveEditColorIdx(0);
    setActiveEditImgIdx(0);
    setEditingColors(
      prod.colors && prod.colors.length > 0
        ? JSON.parse(JSON.stringify(prod.colors))
        : [
            {
              name: 'Black',
              code: '#111111',
              images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
            },
          ]
    );
  };

  const handleSavePhotoModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoModalProd) return;

    db.updateProductColors(photoModalProd.id, editingColors);
    setProducts([...db.getProducts()]);
    setPhotoModalProd(null);
    setUpdateMsg(`Photos & colors for "${photoModalProd.name}" updated successfully!`);
    setTimeout(() => setUpdateMsg(''), 3500);
  };

  const handleOpenAddModal = () => {
    setNewItemData({
      name: '',
      category: 'tops',
      sku: `ACE-INV-${Math.floor(1000 + Math.random() * 9000)}`,
      price: 2499,
      salePrice: 1999,
      description: 'Elevated women’s clothing piece designed with premium finish.',
      totalStock: 50,
    });
    setNewItemColors([
      {
        name: 'Black',
        code: '#111111',
        images: [
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop',
        ],
      },
    ]);
    setIsAddModalOpen(true);
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemData.name.trim()) return;

    const slug = newItemData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      slug: slug,
      name: newItemData.name,
      description: newItemData.description,
      category: newItemData.category,
      price: Number(newItemData.price),
      salePrice: Number(newItemData.salePrice) > 0 ? Number(newItemData.salePrice) : undefined,
      discountPercentage:
        Number(newItemData.salePrice) > 0
          ? Math.round(((newItemData.price - newItemData.salePrice) / newItemData.price) * 100)
          : undefined,
      rating: 5.0,
      reviewCount: 1,
      sku: newItemData.sku || `ACE-SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      colors: newItemColors.map((c) => ({
        ...c,
        images: c.images.length > 0 ? c.images : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
      })),
      sizes: [{ size: 'Free Size', stock: Number(newItemData.totalStock || 0) }],
    };

    db.saveProduct(newProd);
    setProducts([...db.getProducts()]);
    setIsAddModalOpen(false);
    setUpdateMsg(`New inventory item "${newProd.name}" added successfully!`);
    setTimeout(() => setUpdateMsg(''), 4000);
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

  // Color & Image Helpers for New Item Modal
  const handleAddNewColorVariant = () => {
    setNewItemColors([
      ...newItemColors,
      {
        name: `Color ${newItemColors.length + 1}`,
        code: '#A0A0A0',
        images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
      },
    ]);
  };

  const handleRemoveNewColorVariant = (index: number) => {
    if (newItemColors.length <= 1) {
      alert('Product must have at least 1 color variant.');
      return;
    }
    setNewItemColors(newItemColors.filter((_, idx) => idx !== index));
  };

  const handleNewColorChange = (index: number, field: keyof ColorOption, value: any) => {
    const updated = [...newItemColors];
    updated[index] = { ...updated[index], [field]: value };
    setNewItemColors(updated);
  };

  const handleNewImageUploadForColor = (colorIndex: number, file: File) => {
    handleFileUpload(file, (dataUrl) => {
      const updated = [...newItemColors];
      updated[colorIndex].images = [...updated[colorIndex].images, dataUrl];
      setNewItemColors(updated);
    });
  };

  const handleAddNewImageUrlForColor = (colorIndex: number, url: string) => {
    if (!url.trim()) return;
    const updated = [...newItemColors];
    updated[colorIndex].images = [...updated[colorIndex].images, url.trim()];
    setNewItemColors(updated);
  };

  const handleRemoveNewImageFromColor = (colorIndex: number, imageIndex: number) => {
    const updated = [...newItemColors];
    if (updated[colorIndex].images.length <= 1) {
      alert('Each color variant must have at least 1 image.');
      return;
    }
    updated[colorIndex].images = updated[colorIndex].images.filter((_, idx) => idx !== imageIndex);
    setNewItemColors(updated);
  };

  // Color & Image Helpers for Edit Photo Modal
  const handleEditAddColorVariant = () => {
    setEditingColors([
      ...editingColors,
      {
        name: `Color ${editingColors.length + 1}`,
        code: '#555555',
        images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
      },
    ]);
  };

  const handleEditRemoveColorVariant = (index: number) => {
    if (editingColors.length <= 1) return;
    setEditingColors(editingColors.filter((_, idx) => idx !== index));
  };

  // Active Selected Image for Color Editor Focus
  const [activeEditColorIdx, setActiveEditColorIdx] = useState<number>(0);
  const [activeEditImgIdx, setActiveEditImgIdx] = useState<number>(0);

  const [activeNewColorIdx, setActiveNewColorIdx] = useState<number>(0);
  const [activeNewImgIdx, setActiveNewImgIdx] = useState<number>(0);

  const handleEditColorChange = (index: number, field: keyof ColorOption, value: any) => {
    const updated = [...editingColors];
    updated[index] = { ...updated[index], [field]: value };
    setEditingColors(updated);
  };

  const handleEditImageUploadForColor = (colorIndex: number, file: File) => {
    handleFileUpload(file, (dataUrl) => {
      const updated = [...editingColors];
      updated[colorIndex].images = [...updated[colorIndex].images, dataUrl];
      setEditingColors(updated);
    });
  };

  const handleEditAddImageUrlForColor = (colorIndex: number, url: string) => {
    if (!url.trim()) return;
    const updated = [...editingColors];
    updated[colorIndex].images = [...updated[colorIndex].images, url.trim()];
    setEditingColors(updated);
  };

  const handleEditRemoveImageFromColor = (colorIndex: number, imageIndex: number) => {
    const updated = [...editingColors];
    if (updated[colorIndex].images.length <= 1) return;
    updated[colorIndex].images = updated[colorIndex].images.filter((_, idx) => idx !== imageIndex);
    setEditingColors(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Add Inventory Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
            INVENTORY MANAGER
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">Real-time stock levels, SKU tracking and multi-color photo gallery management.</p>
        </div>

        <div className="flex items-center gap-3">
          {updateMsg && (
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded flex items-center gap-1">
              <CheckCircle2 size={14} /> {updateMsg}
            </span>
          )}
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 flex items-center justify-center gap-2 rounded shadow"
          >
            <Plus size={16} />
            <span>ADD NEW INVENTORY ITEM</span>
          </button>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-lg border border-brand-border shadow-sm p-6 overflow-x-auto">
        <table className="w-full text-left text-xs text-brand-dark">
          <thead className="bg-brand-cream uppercase text-[10px] font-bold tracking-wider text-brand-muted">
            <tr>
              <th className="p-3">Product Name & Picture</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Color Variants & Per-Color Stock Management</th>
              <th className="p-3">Total Combined Stock</th>
              <th className="p-3">Overall Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {products.map((prod) => {
              const totalStock = prod.sizes.reduce((acc, s) => acc + s.stock, 0);
              const isOutOfStock = totalStock === 0;
              const isLowStock = totalStock > 0 && totalStock <= 5;
              const displayImg = prod.colors[0]?.images[0] || '';

              return (
                <tr key={prod.id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="p-3 font-semibold">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleOpenPhotoModal(prod)}
                        className="relative w-10 h-12 bg-brand-cream rounded overflow-hidden shrink-0 border border-brand-border group"
                        title="Click to Manage Photos & Colors"
                      >
                        {displayImg ? (
                          <Image src={displayImg} alt={prod.name} fill unoptimized className="object-cover group-hover:opacity-75 transition-opacity" />
                        ) : (
                          <ImageIcon size={16} className="m-auto text-brand-muted" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Camera size={12} />
                        </div>
                      </button>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold block line-clamp-1">{prod.name}</span>
                          <button
                            onClick={() => handleOpenPhotoModal(prod)}
                            className="text-[10px] text-brand-gold hover:underline font-semibold"
                          >
                            [Manage Photos]
                          </button>
                        </div>
                        <span className="text-[10px] text-brand-muted uppercase">{prod.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-brand-muted font-bold">{prod.sku}</td>

                  {/* COLOR VARIANTS PER-COLOR STOCK CONTROL */}
                  <td className="p-3">
                    <div className="flex flex-col gap-2 min-w-[320px]">
                      {prod.colors.map((color, idx) => {
                        const cStock = color.stock !== undefined ? color.stock : (prod.sizes[0]?.stock ?? 10);
                        const isColorOut = cStock === 0;
                        return (
                          <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-brand-cream/40 rounded border border-brand-border/60">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs shrink-0" style={{ backgroundColor: color.code }} />
                              <div>
                                <span className="font-bold text-xs text-brand-dark block">{color.name}</span>
                                {isColorOut ? (
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded uppercase">OUT OF STOCK</span>
                                ) : cStock <= 5 ? (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase">LOW ({cStock})</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">IN STOCK ({cStock})</span>
                                )}
                              </div>
                            </div>

                            <KeypadStockInput
                              currentStock={cStock}
                              onUpdate={(newVal) => handleColorStockChange(prod.id, color.name, newVal)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  <td className="p-3 font-bold text-sm font-mono">{totalStock} UNITS</td>
                  <td className="p-3">
                    {isOutOfStock ? (
                      <span className="bg-rose-100 text-brand-sale text-[10px] font-bold px-2 py-0.5 rounded">
                        OUT OF STOCK
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        LOW STOCK ({totalStock})
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        IN STOCK
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      className="p-1.5 text-brand-sale hover:bg-rose-50 rounded transition-colors"
                      title="Delete Product from Inventory"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MANAGE PHOTOS & COLOR VARIANTS MODAL (FOR EXISTING PRODUCT) */}
      {photoModalProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setPhotoModalProd(null)} />

          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl z-10 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div>
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">PHOTO & COLOR GALLERY MANAGER</span>
                <h3 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider">
                  MANAGE PHOTOS FOR {photoModalProd.name}
                </h3>
              </div>
              <button onClick={() => setPhotoModalProd(null)} className="p-1 hover:bg-brand-cream rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePhotoModal} className="space-y-6 text-xs">
              <div className="flex justify-between items-center">
                <p className="text-brand-muted">
                  Add 2 or more images per color variant for <span className="font-bold text-brand-dark">{photoModalProd.name}</span> ({photoModalProd.sku})
                </p>
                <button
                  type="button"
                  onClick={handleEditAddColorVariant}
                  className="px-3 py-1.5 bg-brand-dark text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-brand-dark/90 flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>+ Add Color</span>
                </button>
              </div>

              <div className="space-y-6">
                {editingColors.map((color, colorIdx) => (
                  <div key={colorIdx} className="p-4 bg-brand-cream/40 border border-brand-border rounded-lg space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-brand-border/60">
                      <span className="font-bold text-brand-dark uppercase tracking-wider text-xs">
                        COLOR OPTION #{colorIdx + 1}: <span className="text-brand-gold">{color.name}</span>
                      </span>
                      {editingColors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleEditRemoveColorVariant(colorIdx)}
                          className="text-xs text-brand-sale hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="font-semibold text-brand-dark block mb-1">COLOR NAME *</label>
                        <input
                          type="text"
                          required
                          value={color.name}
                          onChange={(e) => handleEditColorChange(colorIdx, 'name', e.target.value)}
                          className="w-full p-2 border border-brand-border rounded bg-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-brand-dark block mb-1">COLOR HEX / PICKER *</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={color.code.startsWith('#') && color.code.length === 7 ? color.code : '#111111'}
                            onChange={(e) => handleEditColorChange(colorIdx, 'code', e.target.value)}
                            className="w-9 h-9 border border-brand-border rounded cursor-pointer shrink-0 bg-white"
                          />
                          <input
                            type="text"
                            value={color.code}
                            onChange={(e) => handleEditColorChange(colorIdx, 'code', e.target.value)}
                            className="w-full p-2 border border-brand-border rounded font-mono bg-white uppercase font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-semibold text-brand-dark block mb-1">COLOR PRICE (NPR OPTIONAL)</label>
                        <input
                          type="number"
                          min={0}
                          value={color.price || ''}
                          onChange={(e) => handleEditColorChange(colorIdx, 'price', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="Default price"
                          className="w-full p-2 border border-brand-border rounded font-mono font-bold bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-brand-dark block mb-1">COLOR SALE PRICE (NPR)</label>
                        <input
                          type="number"
                          min={0}
                          value={color.salePrice || ''}
                          onChange={(e) => handleEditColorChange(colorIdx, 'salePrice', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="Sale price"
                          className="w-full p-2 border border-brand-border rounded font-mono font-bold bg-white"
                        />
                      </div>
                    </div>

                    {/* Image Gallery with Click-to-Select Image & Edit Color */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-brand-dark uppercase tracking-wider text-[11px] block">
                          PHOTOS ({color.images.length} photos) — CLICK ANY IMAGE TO EDIT ITS COLOR & PRICE
                        </label>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {color.images.map((imgUrl, imgIdx) => {
                          const isSelectedImg = activeEditColorIdx === colorIdx && activeEditImgIdx === imgIdx;
                          return (
                            <div
                              key={imgIdx}
                              onClick={() => {
                                setActiveEditColorIdx(colorIdx);
                                setActiveEditImgIdx(imgIdx);
                              }}
                              className={`relative aspect-[3/4] bg-brand-cream rounded border cursor-pointer overflow-hidden group transition-all ${
                                isSelectedImg
                                  ? 'ring-2 ring-brand-gold border-brand-gold shadow-md scale-105 z-10'
                                  : 'border-brand-border hover:border-brand-dark'
                              }`}
                            >
                              <Image src={imgUrl} alt={`Photo ${imgIdx + 1}`} fill unoptimized className="object-cover" />
                              <span className={`absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded shadow ${
                                isSelectedImg ? 'bg-brand-gold text-white' : 'bg-black/75 text-white'
                              }`}>
                                #{imgIdx + 1} {isSelectedImg ? 'ACTIVE' : ''}
                              </span>
                              {color.images.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRemoveImageFromColor(colorIdx, imgIdx);
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete Photo"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Image Controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                        <label className="cursor-pointer px-3 py-2 bg-brand-dark text-white text-xs font-bold rounded uppercase tracking-wider hover:bg-brand-dark/90 flex items-center justify-center gap-1.5 shrink-0">
                          <Upload size={14} />
                          <span>+ Upload Local Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleEditImageUploadForColor(colorIdx, file);
                            }}
                          />
                        </label>

                        <div className="flex-1 flex gap-2">
                          <input
                            type="url"
                            id={`edit-url-input-${colorIdx}`}
                            placeholder="Paste image URL..."
                            className="w-full p-2 border border-brand-border rounded text-xs bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(`edit-url-input-${colorIdx}`) as HTMLInputElement;
                              if (el && el.value.trim()) {
                                handleEditAddImageUrlForColor(colorIdx, el.value.trim());
                                el.value = '';
                              }
                            }}
                            className="px-3 py-2 bg-brand-cream hover:bg-brand-border text-brand-dark font-bold text-xs rounded border border-brand-border shrink-0"
                          >
                            Add URL
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setPhotoModalProd(null)}
                  className="px-4 py-2 border border-brand-border text-brand-dark font-semibold rounded"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-brand-dark text-white font-bold uppercase tracking-wider rounded"
                >
                  SAVE PHOTOS & COLORS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW INVENTORY ITEM MODAL (DYNAMIC COLOR-WISE 2+ IMAGES) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />

          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl z-10 p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div>
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">INVENTORY ENTRY</span>
                <h3 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
                  ADD NEW INVENTORY ITEM (MULTI-COLOR & 2+ IMAGES)
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-brand-cream rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-6 text-xs">
              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="font-bold text-brand-dark uppercase tracking-wider block mb-1">CLOTHES NAME / TITLE *</label>
                  <input
                    type="text"
                    required
                    value={newItemData.name}
                    onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                    placeholder="e.g. Satin Cowl Neck Midi Dress"
                    className="w-full p-3 border border-brand-border rounded font-semibold text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">CATEGORY *</label>
                  <select
                    value={newItemData.category}
                    onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                    className="w-full p-2.5 border border-brand-border rounded bg-white"
                  >
                    <option value="tops">Tops & Blouses</option>
                    <option value="dresses">Dresses</option>
                    <option value="bottoms">Bottoms & Jeans</option>
                    <option value="sets">Co-ord Sets</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">SKU CODE *</label>
                  <input
                    type="text"
                    required
                    value={newItemData.sku}
                    onChange={(e) => setNewItemData({ ...newItemData, sku: e.target.value })}
                    className="w-full p-2.5 border border-brand-border rounded font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">REGULAR PRICE (NPR) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newItemData.price}
                    onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                    className="w-full p-2.5 border border-brand-border rounded font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">SALE PRICE (NPR OPTIONAL)</label>
                  <input
                    type="number"
                    min={0}
                    value={newItemData.salePrice}
                    onChange={(e) => setNewItemData({ ...newItemData, salePrice: Number(e.target.value) })}
                    className="w-full p-2.5 border border-brand-border rounded font-mono font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-semibold text-brand-dark block mb-1">CLOTHING DESCRIPTION & FABRIC DETAILS</label>
                  <textarea
                    rows={2}
                    value={newItemData.description}
                    onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                    placeholder="Specify fabric weave, fit notes, and garment care instructions..."
                    className="w-full p-2.5 border border-brand-border rounded"
                  />
                </div>
              </div>

              {/* COLOR VARIANTS & 2+ IMAGES PER COLOR */}
              <div className="space-y-4 pt-4 border-t border-brand-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif-title font-bold text-sm text-brand-dark uppercase tracking-wider flex items-center gap-2">
                      <Palette size={16} className="text-brand-gold" />
                      <span>COLOR VARIANTS & COLOR-WISE IMAGES (2+ IMAGES PER COLOR)</span>
                    </h4>
                    <p className="text-[11px] text-brand-muted">
                      Add multiple color options. For each color option, upload or add 2 or more photos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewColorVariant}
                    className="px-3 py-1.5 bg-brand-dark text-white text-[11px] font-bold uppercase tracking-wider rounded hover:bg-brand-dark/90 flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={14} />
                    <span>+ Add Color Variant</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {newItemColors.map((color, colorIdx) => (
                    <div key={colorIdx} className="p-4 bg-brand-cream/40 border border-brand-border rounded-lg space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-brand-border/60">
                        <span className="font-bold text-brand-dark uppercase tracking-wider text-xs">
                          COLOR OPTION #{colorIdx + 1}: <span className="text-brand-gold">{color.name || 'Unnamed'}</span>
                        </span>
                        {newItemColors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveNewColorVariant(colorIdx)}
                            className="text-xs text-brand-sale hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Trash2 size={14} />
                            <span>Remove Color</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="font-semibold text-brand-dark block mb-1">COLOR NAME *</label>
                          <input
                            type="text"
                            required
                            value={color.name}
                            onChange={(e) => handleNewColorChange(colorIdx, 'name', e.target.value)}
                            placeholder="e.g. Rose Pink, Black, Beige"
                            className="w-full p-2.5 border border-brand-border rounded bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-brand-dark block mb-1">COLOR HEX / PICKER *</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={color.code.startsWith('#') && color.code.length === 7 ? color.code : '#111111'}
                              onChange={(e) => handleNewColorChange(colorIdx, 'code', e.target.value)}
                              className="w-10 h-10 border border-brand-border rounded cursor-pointer shrink-0 bg-white"
                            />
                            <input
                              type="text"
                              value={color.code}
                              onChange={(e) => handleNewColorChange(colorIdx, 'code', e.target.value)}
                              placeholder="#111111"
                              className="w-full p-2.5 border border-brand-border rounded font-mono bg-white uppercase font-bold"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-semibold text-brand-dark block mb-1">COLOR PRICE (NPR OPTIONAL)</label>
                          <input
                            type="number"
                            min={0}
                            value={color.price || ''}
                            onChange={(e) => handleNewColorChange(colorIdx, 'price', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Default price"
                            className="w-full p-2.5 border border-brand-border rounded font-mono font-bold bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-brand-dark block mb-1">COLOR SALE PRICE (NPR)</label>
                          <input
                            type="number"
                            min={0}
                            value={color.salePrice || ''}
                            onChange={(e) => handleNewColorChange(colorIdx, 'salePrice', e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Sale price"
                            className="w-full p-2.5 border border-brand-border rounded font-mono font-bold bg-white"
                          />
                        </div>
                      </div>

                      {/* Photo Gallery for this color with click to select image */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-brand-dark uppercase tracking-wider text-[11px] block">
                            PHOTOS FOR &quot;{color.name}&quot; ({color.images.length} images added) — CLICK ANY IMAGE TO EDIT COLOR
                          </label>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                          {color.images.map((imgUrl, imgIdx) => {
                            const isSelectedImg = activeNewColorIdx === colorIdx && activeNewImgIdx === imgIdx;
                            return (
                              <div
                                key={imgIdx}
                                onClick={() => {
                                  setActiveNewColorIdx(colorIdx);
                                  setActiveNewImgIdx(imgIdx);
                                }}
                                className={`relative aspect-[3/4] bg-brand-cream rounded border cursor-pointer overflow-hidden group shadow-2xs transition-all ${
                                  isSelectedImg
                                    ? 'ring-2 ring-brand-gold border-brand-gold shadow-md scale-105 z-10'
                                    : 'border-brand-border hover:border-brand-dark'
                                }`}
                              >
                                <Image src={imgUrl} alt={`Photo ${imgIdx + 1}`} fill unoptimized className="object-cover" />
                                <span className={`absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded shadow ${
                                  isSelectedImg ? 'bg-brand-gold text-white' : 'bg-black/75 text-white'
                                }`}>
                                  #{imgIdx + 1} {isSelectedImg ? 'ACTIVE' : ''}
                                </span>
                                {color.images.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveNewImageFromColor(colorIdx, imgIdx);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    title="Delete this photo"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                          <label className="cursor-pointer px-4 py-2 bg-brand-dark text-white text-xs font-bold rounded uppercase tracking-wider hover:bg-brand-dark/90 flex items-center justify-center gap-2 shrink-0 shadow-xs">
                            <Upload size={14} />
                            <span>+ Upload Photo from Device</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleNewImageUploadForColor(colorIdx, file);
                              }}
                            />
                          </label>

                          <div className="flex-1 flex gap-2">
                            <input
                              type="url"
                              id={`url-input-inv-${colorIdx}`}
                              placeholder="Paste image URL link here..."
                              className="w-full p-2 border border-brand-border rounded text-xs bg-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.target as HTMLInputElement;
                                  if (target.value.trim()) {
                                    handleAddNewImageUrlForColor(colorIdx, target.value.trim());
                                    target.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`url-input-inv-${colorIdx}`) as HTMLInputElement;
                                if (el && el.value.trim()) {
                                  handleAddNewImageUrlForColor(colorIdx, el.value.trim());
                                  el.value = '';
                                }
                              }}
                              className="px-3 py-2 bg-brand-cream hover:bg-brand-border text-brand-dark font-bold text-xs rounded border border-brand-border shrink-0"
                            >
                              Add URL
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stock Quantity Allocation */}
              <div className="p-4 bg-brand-cream/40 border border-brand-border rounded space-y-2">
                <label className="font-serif-title font-bold text-brand-dark uppercase tracking-wider block text-xs">
                  TOTAL INVENTORY STOCK QUANTITY *
                </label>
                <div className="max-w-xs">
                  <input
                    type="number"
                    min={0}
                    required
                    value={newItemData.totalStock}
                    onChange={(e) => setNewItemData({ ...newItemData, totalStock: Number(e.target.value) })}
                    className="w-full p-2.5 border border-brand-border rounded font-mono font-bold text-sm bg-white"
                  />
                  <span className="text-[10px] text-brand-muted mt-1 block">
                    All clothing pieces default to single Free Size.
                  </span>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="pt-2 flex justify-end gap-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-3 border border-brand-border text-brand-dark font-semibold rounded hover:bg-brand-cream"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-brand-dark text-white font-bold uppercase tracking-widest rounded hover:bg-brand-dark/90 shadow-md"
                >
                  SAVE & ADD TO INVENTORY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
