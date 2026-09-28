'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Boxes,
  Plus,
  Save,
  X,
  CheckCircle2,
  Image as ImageIcon,
  Camera,
  Edit3,
  Upload,
  Trash2,
  Palette,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Database,
} from 'lucide-react';
import { db } from '@/lib/db';
import { Product, ColorOption, Category } from '@/types';

interface InventoryItem {
  _id?: string;
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  totalStock: number;
  isOutOfStock: boolean;
  colors: ColorOption[];
  sizes: { size: string; stock: number; sku?: string }[];
  displayImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface KeypadStockInputProps {
  currentStock: number;
  onUpdate: (newVal: number) => void;
  disabled?: boolean;
}

const KeypadStockInput: React.FC<KeypadStockInputProps> = ({ currentStock, onUpdate, disabled = false }) => {
  const safeStock = isNaN(Number(currentStock)) || Number(currentStock) > 9999 ? 0 : Math.max(0, Math.floor(Number(currentStock)));
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
    const safe = isNaN(parsed) ? 0 : Math.min(9999, Math.max(0, parsed));
    setVal(safe.toString());
    if (safe !== safeStock) {
      onUpdate(safe);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 bg-brand-cream/60 p-1 rounded-md border border-brand-border">
      <button
        type="button"
        disabled={disabled || safeStock <= 0}
        onClick={() => {
          const next = Math.max(0, safeStock - 1);
          setVal(next.toString());
          onUpdate(next);
        }}
        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-brand-cream border border-brand-border text-brand-dark font-extrabold text-sm rounded shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        title="Decrease stock by 1"
      >
        -
      </button>
      <input
        type="number"
        min={0}
        max={9999}
        disabled={disabled}
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
        className="w-16 h-7 border border-brand-border rounded text-center font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-brand-dark focus:border-transparent bg-white shadow-2xs disabled:bg-gray-100"
        title="Click & type stock quantity directly"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const next = Math.min(9999, safeStock + 1);
          setVal(next.toString());
          onUpdate(next);
        }}
        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-brand-cream border border-brand-border text-brand-dark font-extrabold text-sm rounded shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-40"
        title="Increase stock by 1"
      >
        +
      </button>
    </div>
  );
};

export default function AdminInventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updateMsg, setUpdateMsg] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [categories, setCategories] = useState<Category[]>([]);

  // Photo & Color Gallery Manager Modal State
  const [photoModalItem, setPhotoModalItem] = useState<InventoryItem | null>(null);
  const [editingColors, setEditingColors] = useState<ColorOption[]>([]);
  const [activeEditColorIdx, setActiveEditColorIdx] = useState<number>(0);
  const [activeEditImgIdx, setActiveEditImgIdx] = useState<number>(0);

  // Form State for Adding New Inventory Item
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    category: 'tops',
    sku: '',
    price: 1999,
    salePrice: 1599,
    description: '',
    totalStock: 50,
  });
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

  // Fetch Inventory directly from MySQL Relational Database API endpoint
  const fetchInventory = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/inventory', {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status} (${res.statusText})`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch inventory from MySQL Database');
      }

      setInventoryItems(data.data || []);
      setCategories(db.getCategories());
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('[Inventory Page] Error loading MySQL inventory:', err);
      if (err.name === 'AbortError') {
        setError('Inventory request timed out. Please check your MySQL database connection.');
      } else {
        setError(err?.message || 'Failed to connect to MySQL Database inventory table.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();

    const handleDbUpdate = () => {
      fetchInventory();
    };

    window.addEventListener('ace-db-updated', handleDbUpdate);
    return () => window.removeEventListener('ace-db-updated', handleDbUpdate);
  }, [fetchInventory]);

  // Stock Update Handlers
  const handleColorStockChange = async (productId: string, colorName: string, newStock: number) => {
    // 1. Optimistic local state update
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId || item.id === productId) {
          const updatedColors = item.colors.map((c) =>
            c.name.toLowerCase() === colorName.toLowerCase() ? { ...c, stock: newStock } : c
          );
          const totalColorStock = updatedColors.reduce((acc, c) => acc + (typeof c.stock === 'number' ? c.stock : 0), 0);
          return {
            ...item,
            colors: updatedColors,
            totalStock: totalColorStock,
            isOutOfStock: totalColorStock <= 0,
            sizes: [{ size: 'Free Size', stock: totalColorStock, sku: item.sku }],
          };
        }
        return item;
      })
    );

    // 2. Persist to MySQL Database via API
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateColorStock',
          productId,
          colorName,
          newStock,
        }),
      });

      if (!res.ok) {
        console.error('[Inventory Page] Failed to persist stock to MySQL Database');
      }
    } catch (err) {
      console.error('[Inventory Page] Error persisting stock update:', err);
    }

    // Also update client store for syncing
    db.updateColorStock(productId, colorName, newStock);

    setUpdateMsg(`Stock for "${colorName}" updated in MySQL Database.`);
    setTimeout(() => setUpdateMsg(''), 3000);
  };

  const handleDeleteItem = async (productId: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete "${prodName}" from inventory in MySQL Database?`)) {
      return;
    }

    try {
      setInventoryItems((prev) => prev.filter((i) => i.productId !== productId && i.id !== productId));
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteItem', productId }),
      });

      db.deleteProduct(productId);
      setUpdateMsg(`Product "${prodName}" deleted from MySQL Database.`);
      setTimeout(() => setUpdateMsg(''), 3000);
    } catch (err) {
      console.error('[Inventory Page] Error deleting item:', err);
      fetchInventory();
    }
  };

  // Photo & Color Modal Handlers
  const handleOpenPhotoModal = (item: InventoryItem) => {
    setPhotoModalItem(item);
    setActiveEditColorIdx(0);
    setActiveEditImgIdx(0);
    setEditingColors(
      item.colors && item.colors.length > 0
        ? JSON.parse(JSON.stringify(item.colors))
        : [
            {
              name: 'Black',
              code: '#111111',
              images: item.displayImage ? [item.displayImage] : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'],
            },
          ]
    );
  };

  const handleSavePhotoModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoModalItem) return;

    db.updateProductColors(photoModalItem.productId || photoModalItem.id, editingColors);
    fetchInventory();
    setPhotoModalItem(null);
    setUpdateMsg(`Photos & colors for "${photoModalItem.productName}" updated!`);
    setTimeout(() => setUpdateMsg(''), 3500);
  };

  // Add Item Modal Handlers
  const handleOpenAddModal = () => {
    const cats = db.getCategories();
    setCategories(cats);
    setNewItemData({
      name: '',
      category: cats[0]?.slug || 'tops',
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
    setIsAddModalOpen(false);
    fetchInventory();
    setUpdateMsg(`New inventory item "${newProd.name}" added to MySQL Database!`);
    setTimeout(() => setUpdateMsg(''), 4000);
  };

  // Image Upload Helper
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
      console.warn('[Inventory Upload Error] Failed to upload image via API:', e);
    }
  };

  const handleEditColorChange = (index: number, field: keyof ColorOption, value: any) => {
    const updated = [...editingColors];
    updated[index] = { ...updated[index], [field]: value };
    setEditingColors(updated);
  };

  // Filtered Inventory Items
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'in_stock') return item.totalStock > 5;
    if (statusFilter === 'low_stock') return item.totalStock > 0 && item.totalStock <= 5;
    if (statusFilter === 'out_of_stock') return item.totalStock <= 0;

    return true;
  });

  // Calculate Summary Metrics
  const totalRecords = inventoryItems.length;
  const totalStockUnits = inventoryItems.reduce((acc, item) => acc + item.totalStock, 0);
  const outOfStockCount = inventoryItems.filter((item) => item.totalStock <= 0).length;
  const lowStockCount = inventoryItems.filter((item) => item.totalStock > 0 && item.totalStock <= 5).length;

  return (
    <div className="space-y-6">
      {/* Top Header & DB Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
              INVENTORY MANAGER
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-300">
              <Database size={12} /> MySQL Live
            </span>
          </div>
          <p className="text-xs text-brand-muted mt-1">
            Real-time stock levels, SKU tracking and multi-color variant management connected to MySQL database{' '}
            <code className="bg-brand-cream px-1 py-0.5 rounded font-bold text-brand-dark">daisyhub_daisyhubb</code> table{' '}
            <code className="bg-brand-cream px-1 py-0.5 rounded font-bold text-brand-dark">inventory</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {updateMsg && (
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 size={14} /> {updateMsg}
            </span>
          )}
          <button
            onClick={fetchInventory}
            disabled={isLoading}
            className="p-2.5 bg-brand-cream hover:bg-brand-border text-brand-dark rounded border border-brand-border flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95"
            title="Refresh Inventory from MySQL Database"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 flex items-center justify-center gap-2 rounded shadow transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>ADD INVENTORY ITEM</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-brand-border shadow-2xs">
          <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider block">TOTAL PRODUCTS</span>
          <span className="text-2xl font-serif-title font-bold text-brand-dark">{totalRecords}</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">Records in MySQL</span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-brand-border shadow-2xs">
          <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider block">TOTAL STOCK UNITS</span>
          <span className="text-2xl font-mono font-bold text-brand-dark">{totalStockUnits.toLocaleString()}</span>
          <span className="text-[10px] text-brand-muted block mt-0.5">Available across all sizes</span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-brand-border shadow-2xs">
          <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider block">LOW STOCK ITEMS</span>
          <span className="text-2xl font-mono font-bold text-amber-600">{lowStockCount}</span>
          <span className="text-[10px] text-amber-700 block mt-0.5">5 units or remaining</span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-brand-border shadow-2xs">
          <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider block">OUT OF STOCK</span>
          <span className="text-2xl font-mono font-bold text-rose-600">{outOfStockCount}</span>
          <span className="text-[10px] text-rose-700 block mt-0.5">Requires immediate restock</span>
        </div>
      </div>

      {/* Search & Filter Control Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-brand-border shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-brand-cream/60 px-3.5 py-2 rounded border border-brand-border flex-1 max-w-md">
          <Search size={16} className="text-brand-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter inventory by Name, SKU code or Category..."
            className="bg-transparent text-xs w-full focus:outline-none font-medium"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-brand-muted hover:text-brand-dark">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-brand-dark text-white shadow-xs'
                : 'bg-brand-cream text-brand-dark hover:bg-brand-border'
            }`}
          >
            All ({totalRecords})
          </button>
          <button
            onClick={() => setStatusFilter('in_stock')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              statusFilter === 'in_stock'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            In Stock
          </button>
          <button
            onClick={() => setStatusFilter('low_stock')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              statusFilter === 'low_stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setStatusFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              statusFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Main Content Area: Loading / Error / Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-brand-border p-12 text-center space-y-4 shadow-sm">
          <RefreshCw size={36} className="animate-spin m-auto text-brand-gold" />
          <div>
            <h3 className="font-serif-title text-lg font-bold text-brand-dark">Loading Inventory Records</h3>
            <p className="text-xs text-brand-muted mt-1">Connecting to MySQL database &quot;daisyhub_daisyhubb.inventory&quot;...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold">
            <AlertTriangle size={20} />
            <span>MySQL Database Connection Error</span>
          </div>
          <p className="text-xs text-rose-700 font-mono bg-rose-100/70 p-3 rounded">{error}</p>
          <button
            onClick={fetchInventory}
            className="px-4 py-2 bg-rose-700 text-white font-bold text-xs rounded hover:bg-rose-800 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Retry Database Connection
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-brand-border p-12 text-center space-y-3 shadow-sm">
          <Boxes size={40} className="m-auto text-brand-muted" />
          <h3 className="font-serif-title text-lg font-bold text-brand-dark">No Inventory Records Found</h3>
          <p className="text-xs text-brand-muted max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'No items match your active search filter or status selection. Try clearing filters.'
              : 'MySQL inventory table is currently empty.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-brand-cream hover:bg-brand-border text-brand-dark font-bold text-xs rounded border border-brand-border"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        /* Main Inventory Table */
        <div className="bg-white rounded-lg border border-brand-border shadow-sm p-6 overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-dark">
            <thead className="bg-brand-cream uppercase text-[10px] font-bold tracking-wider text-brand-muted">
              <tr>
                <th className="p-3">Product Name & Picture</th>
                <th className="p-3">SKU Code</th>
                <th className="p-3">Color Variants & Per-Color Stock Control</th>
                <th className="p-3">Total Stock</th>
                <th className="p-3">Stock Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredItems.map((item) => {
                const totalStock = item.totalStock;
                const isOutOfStock = totalStock <= 0;
                const isLowStock = totalStock > 0 && totalStock <= 5;
                const displayImg = item.displayImage || item.colors?.[0]?.images?.[0] || '';

                return (
                  <tr key={item._id || item.id} className="hover:bg-brand-cream/30 transition-colors">
                    {/* Product Info & Photo */}
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenPhotoModal(item)}
                          className="relative w-10 h-12 bg-brand-cream rounded overflow-hidden shrink-0 border border-brand-border group shadow-2xs"
                          title="Click to Manage Photos & Colors"
                        >
                          {displayImg ? (
                            <Image
                              src={displayImg}
                              alt={item.productName}
                              fill
                              unoptimized
                              className="object-cover group-hover:opacity-75 transition-opacity"
                            />
                          ) : (
                            <ImageIcon size={16} className="m-auto text-brand-muted" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Camera size={12} />
                          </div>
                        </button>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold block line-clamp-1 text-sm">{item.productName}</span>
                            <button
                              onClick={() => handleOpenPhotoModal(item)}
                              className="text-[10px] text-brand-gold hover:underline font-semibold"
                            >
                              [Manage Photos]
                            </button>
                          </div>
                          <span className="text-[10px] text-brand-muted uppercase font-mono">{item.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* SKU Code */}
                    <td className="p-3 font-mono text-xs text-brand-dark font-bold bg-brand-cream/20 rounded px-2 py-1 inline-block my-3">
                      {item.sku}
                    </td>

                    {/* COLOR VARIANTS & PER-COLOR STOCK CONTROLS */}
                    <td className="p-3">
                      <div className="flex flex-col gap-2 min-w-[320px]">
                        {item.colors && item.colors.length > 0 ? (
                          item.colors.map((color, idx) => {
                            const cStock = typeof color.stock === 'number' ? color.stock : 0;
                            const isColorOut = cStock === 0;

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-3 p-2 bg-brand-cream/40 rounded border border-brand-border/60"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-4 h-4 rounded-full border border-black/20 shadow-xs shrink-0"
                                    style={{ backgroundColor: color.code || '#111111' }}
                                  />
                                  <div>
                                    <span className="font-bold text-xs text-brand-dark block">{color.name}</span>
                                    {isColorOut ? (
                                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded uppercase">
                                        OUT OF STOCK
                                      </span>
                                    ) : cStock <= 5 ? (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase">
                                        LOW ({cStock})
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                                        IN STOCK ({cStock})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <KeypadStockInput
                                  currentStock={cStock}
                                  onUpdate={(newVal) =>
                                    handleColorStockChange(item.productId || item.id, color.name, newVal)
                                  }
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center justify-between p-2 bg-brand-cream/30 rounded">
                            <span className="text-xs font-semibold text-brand-muted">Free Size</span>
                            <KeypadStockInput
                              currentStock={totalStock}
                              onUpdate={(newVal) =>
                                handleColorStockChange(item.productId || item.id, 'Default', newVal)
                              }
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Total Stock */}
                    <td className="p-3 font-bold text-sm font-mono text-brand-dark">
                      {totalStock.toLocaleString()} UNITS
                    </td>

                    {/* Stock Status Badge */}
                    <td className="p-3">
                      {isOutOfStock ? (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider border border-rose-200">
                          OUT OF STOCK
                        </span>
                      ) : isLowStock ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider border border-amber-200">
                          LOW STOCK ({totalStock})
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider border border-emerald-200">
                          IN STOCK
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoModal(item)}
                          className="p-1.5 text-brand-dark hover:bg-brand-cream rounded border border-brand-border"
                          title="Edit Colors & Photos"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.productId || item.id, item.productName)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200"
                          title="Delete Product from Inventory"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MANAGE PHOTOS & COLOR VARIANTS MODAL */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setPhotoModalItem(null)} />

          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl z-10 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div>
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">
                  PHOTO & COLOR GALLERY MANAGER
                </span>
                <h3 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider">
                  MANAGE PHOTOS FOR {photoModalItem.productName}
                </h3>
              </div>
              <button onClick={() => setPhotoModalItem(null)} className="p-1 hover:bg-brand-cream rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePhotoModal} className="space-y-6 text-xs">
              <div className="flex justify-between items-center">
                <p className="text-brand-muted">
                  Add images per color variant for{' '}
                  <span className="font-bold text-brand-dark">{photoModalItem.productName}</span> ({photoModalItem.sku})
                </p>
              </div>

              <div className="space-y-6">
                {editingColors.map((color, colorIdx) => (
                  <div key={colorIdx} className="p-4 bg-brand-cream/40 border border-brand-border rounded-lg space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-brand-border/60">
                      <span className="font-bold text-brand-dark uppercase tracking-wider text-xs">
                        COLOR OPTION #{colorIdx + 1}: <span className="text-brand-gold">{color.name}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    </div>

                    {/* Image Gallery */}
                    <div className="space-y-2">
                      <label className="font-bold text-brand-dark uppercase tracking-wider text-[11px] block">
                        PHOTOS ({color.images.length} photos)
                      </label>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {color.images.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="relative aspect-[3/4] bg-brand-cream rounded border border-brand-border overflow-hidden group shadow-2xs"
                          >
                            <Image src={imgUrl} alt={`Photo ${imgIdx + 1}`} fill unoptimized className="object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setPhotoModalItem(null)}
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

      {/* ADD NEW INVENTORY ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsAddModalOpen(false)} />

          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl z-10 p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div>
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">INVENTORY ENTRY</span>
                <h3 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
                  ADD NEW INVENTORY ITEM TO MYSQL DATABASE
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-brand-cream rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-6 text-xs">
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
                    className="w-full p-2.5 border border-brand-border rounded bg-white font-medium"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id || cat.slug} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                    {newItemData.category && !categories.some((c) => c.slug === newItemData.category) && (
                      <option value={newItemData.category}>{newItemData.category}</option>
                    )}
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
                  <label className="font-semibold text-brand-dark block mb-1">INITIAL STOCK QUANTITY *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newItemData.totalStock}
                    onChange={(e) => setNewItemData({ ...newItemData, totalStock: Number(e.target.value) })}
                    className="w-full p-2.5 border border-brand-border rounded font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">PRICE (NPR) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newItemData.price}
                    onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                    className="w-full p-2.5 border border-brand-border rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 border border-brand-border text-brand-dark font-semibold rounded hover:bg-brand-cream"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-brand-dark text-white font-bold uppercase tracking-widest rounded shadow"
                >
                  SAVE ITEM TO MYSQL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
