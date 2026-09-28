'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Palette, Plus, Trash2, Camera, Upload, Check, X, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import { ColorOption, SizeVariant } from '@/types';

interface ProductVariantInspectorProps {
  colors: ColorOption[];
  onChange: (updatedColors: ColorOption[]) => void;
}

const PRESET_COLORS = [
  { name: 'Black', code: '#111111' },
  { name: 'White', code: '#FFFFFF' },
  { name: 'Beige / Cream', code: '#E8DCC4' },
  { name: 'Camel / Brown', code: '#A57146' },
  { name: 'Crimson Red', code: '#B91C1C' },
  { name: 'Pastel Pink', code: '#F472B6' },
  { name: 'Emerald Green', code: '#047857' },
  { name: 'Navy Blue', code: '#1E3A8A' },
  { name: 'Gold / Yellow', code: '#D97706' },
  { name: 'Lavender / Purple', code: '#9333EA' },
];

const DEFAULT_SIZES: SizeVariant[] = [
  { size: 'XS', stock: 10 },
  { size: 'S', stock: 15 },
  { size: 'M', stock: 20 },
  { size: 'L', stock: 12 },
  { size: 'XL', stock: 5 },
  { size: 'XXL', stock: 2 },
];

export const ProductVariantInspector: React.FC<ProductVariantInspectorProps> = ({ colors, onChange }) => {
  // Flatten images into clickable list: { colorIndex, imageIndex, url, colorName, colorCode }
  const allImages = colors.flatMap((col, colIdx) =>
    col.images.map((url, imgIdx) => ({
      colIdx,
      imgIdx,
      url,
      colorName: col.name,
      colorCode: col.code,
      colorObj: col,
    }))
  );

  const [selectedImageKey, setSelectedImageKey] = useState<string>(
    allImages.length > 0 ? `0-0` : ''
  );

  // New Image URL input or upload
  const [newImageUrl, setNewImageUrl] = useState('');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorCode, setCustomColorCode] = useState('#111111');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Auto sync selectedImageKey when colors list changes
  React.useEffect(() => {
    if (allImages.length > 0) {
      const exists = allImages.some((item) => `${item.colIdx}-${item.imgIdx}` === selectedImageKey);
      if (!exists || !selectedImageKey) {
        setSelectedImageKey(`${allImages[0].colIdx}-${allImages[0].imgIdx}`);
      }
    }
  }, [colors, allImages.length]);

  // Find active image item
  const activeItem = allImages.find(
    (item) => `${item.colIdx}-${item.imgIdx}` === selectedImageKey
  ) || allImages[0];

  const handleFileUpload = async (file: File, callback: (url: string) => void) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        callback(data.url);
      } else {
        const msg = data.error || `Upload failed with status ${res.status}`;
        setUploadError(msg);
        alert(`Image Upload Error: ${msg}`);
      }
    } catch (e: any) {
      console.error('[Product Variant Inspector Upload Error]', e);
      const msg = e?.message || 'Network error during image upload';
      setUploadError(msg);
      alert(`Image Upload Error: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddImage = (imageUrl: string) => {
    if (!imageUrl.trim()) return;
    const updated = JSON.parse(JSON.stringify(colors)) as ColorOption[];
    
    // Add to first color variant or active color variant
    const targetColIdx = activeItem ? Math.min(activeItem.colIdx, updated.length - 1) : 0;
    if (updated[targetColIdx]) {
      if (!Array.isArray(updated[targetColIdx].images)) {
        updated[targetColIdx].images = [];
      }
      updated[targetColIdx].images.push(imageUrl.trim());
    } else if (updated.length > 0) {
      updated[0].images.push(imageUrl.trim());
    } else {
      updated.push({
        name: 'Default',
        code: '#111111',
        images: [imageUrl.trim()],
        sizes: DEFAULT_SIZES,
        stock: 10,
      });
    }

    onChange(updated);
    setNewImageUrl('');
    const newColIdx = updated[targetColIdx] ? targetColIdx : 0;
    const newImgIdx = updated[newColIdx].images.length - 1;
    setSelectedImageKey(`${newColIdx}-${newImgIdx}`);
  };

  const handleAddColorVariant = (colorName: string, colorCode: string) => {
    const updated = JSON.parse(JSON.stringify(colors)) as ColorOption[];
    updated.push({
      name: colorName,
      code: colorCode,
      images: [],
      sizes: DEFAULT_SIZES,
    });
    onChange(updated);
    const newColIdx = updated.length - 1;
    setSelectedImageKey(`${newColIdx}-0`);
  };

  const handleUpdateActiveColorDetails = (fields: Partial<ColorOption>) => {
    if (!activeItem) return;
    const updated = JSON.parse(JSON.stringify(colors)) as ColorOption[];
    const target = updated[activeItem.colIdx];
    if (target) {
      if (fields.name !== undefined) target.name = fields.name;
      if (fields.code !== undefined) target.code = fields.code;
      if (fields.price !== undefined) target.price = fields.price;
      if (fields.salePrice !== undefined) target.salePrice = fields.salePrice;
      if (fields.sizes !== undefined) target.sizes = fields.sizes;
      onChange(updated);
    }
  };

  const handleUpdateFreeSizeStock = (newStock: number) => {
    if (!activeItem) return;
    const updated = JSON.parse(JSON.stringify(colors)) as ColorOption[];
    const target = updated[activeItem.colIdx];
    if (target) {
      const sanitizedStock = Math.max(0, newStock);
      target.stock = sanitizedStock;
      target.sizes = [{ size: 'Free Size', stock: sanitizedStock }];
      onChange(updated);
    }
  };

  const handleDeleteImage = (colIdx: number, imgIdx: number) => {
    const updated = JSON.parse(JSON.stringify(colors)) as ColorOption[];
    if (updated[colIdx]) {
      if (updated[colIdx].images.length <= 1 && updated.length <= 1) {
        alert('Product must have at least 1 image.');
        return;
      }
      updated[colIdx].images.splice(imgIdx, 1);
      if (updated[colIdx].images.length === 0) {
        updated.splice(colIdx, 1);
      }
      onChange(updated);
      setSelectedImageKey('0-0');
    }
  };

  const activeColorObj = activeItem?.colorObj;
  const activeSizes = activeColorObj?.sizes || DEFAULT_SIZES;

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border border-brand-border shadow-sm text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-3">
        <div>
          <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">INTERACTIVE VARIANT & PHOTO INSPECTOR</span>
          <h4 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
            <Camera size={18} className="text-brand-gold" />
            <span>CLICK ANY PHOTO TO EDIT ITS COLOR, SIZES & STOCK</span>
          </h4>
          <p className="text-[11px] text-brand-muted">
            Click on any image thumbnail below to inspect and customize its specific color swatch, sizes, and stock inventory.
          </p>
        </div>

        {/* Add Color Swatch Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddColorVariant('New Color', '#3B82F6')}
            className="px-3.5 py-2 bg-brand-cream hover:bg-brand-border text-brand-dark font-bold text-xs rounded border border-brand-border flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>+ Add Color Swatch</span>
          </button>
        </div>
      </div>

      {/* 1. THUMBNAIL GALLERY GRID */}
      <div>
        <span className="font-bold text-brand-dark block mb-2 uppercase tracking-wider text-[10px]">
          PRODUCT PHOTO GALLERY ({allImages.length} PHOTOS TOTAL):
        </span>

        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {allImages.map((item) => {
            const key = `${item.colIdx}-${item.imgIdx}`;
            const isSelected = key === selectedImageKey;

            return (
              <div
                key={key}
                onClick={() => setSelectedImageKey(key)}
                className={`group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  isSelected
                    ? 'border-brand-gold ring-4 ring-brand-gold/20 scale-105 shadow-md'
                    : 'border-brand-border hover:border-brand-dark'
                }`}
              >
                <Image src={item.url} alt={item.colorName} fill unoptimized className="object-cover" />

                {/* Color Tag Badge */}
                <div className="absolute bottom-1 left-1 right-1 bg-black/80 backdrop-blur-xs text-white p-1 rounded text-[9px] flex items-center justify-between">
                  <span className="truncate font-semibold">{item.colorName}</span>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40" style={{ backgroundColor: item.colorCode }} />
                </div>

                {isSelected && (
                  <div className="absolute top-1 right-1 bg-brand-gold text-brand-dark font-bold p-1 rounded-full shadow">
                    <Check size={10} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Image Card Button */}
          <label className={`aspect-[3/4] rounded-lg border-2 border-dashed border-brand-border hover:border-brand-dark bg-brand-cream/30 flex flex-col items-center justify-center text-center p-2 transition-colors text-brand-muted hover:text-brand-dark ${isUploading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}>
            {isUploading ? (
              <div className="flex flex-col items-center gap-1">
                <span className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-bold uppercase text-brand-dark mt-1">UPLOADING...</span>
              </div>
            ) : (
              <>
                <Upload size={20} />
                <span className="text-[10px] font-bold mt-1 uppercase">Upload Photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await handleFileUpload(file, (url) => handleAddImage(url));
                  e.target.value = '';
                }
              }}
            />
          </label>
        </div>
        {uploadError && (
          <p className="mt-2 text-rose-600 text-[11px] font-semibold">⚠️ {uploadError}</p>
        )}
      </div>

      {/* 2. CLICKED IMAGE PROPERTIES & VARIANT STOCK INSPECTOR PANEL */}
      {activeItem && (
        <div className="bg-brand-cream/40 p-5 rounded-lg border border-brand-gold/40 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Active Image Large Preview */}
            <div className="w-full md:w-48 flex flex-col items-center gap-2">
              <div className="relative w-full aspect-[3/4] bg-white rounded-lg border border-brand-border overflow-hidden shadow-sm">
                <Image src={activeItem.url} alt={activeItem.colorName} fill unoptimized className="object-cover" />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-brand-dark">
                <span>Color: {activeItem.colorName}</span>
                <span className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: activeItem.colorCode }} />
              </div>

              <button
                type="button"
                onClick={() => handleDeleteImage(activeItem.colIdx, activeItem.imgIdx)}
                className="w-full py-1.5 bg-rose-50 border border-rose-200 text-brand-sale hover:bg-rose-100 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1"
              >
                <Trash2 size={12} />
                <span>Delete Photo</span>
              </button>
            </div>

            {/* Right: Variant Properties Form */}
            <div className="flex-1 space-y-4">
              <div className="border-b border-brand-border pb-2">
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-wider block">PROPERTIES FOR CLICKED PHOTO</span>
                <h5 className="font-serif-title text-sm font-bold text-brand-dark uppercase">
                  EDIT COLOR & SIZE STOCK FOR &quot;{activeItem.colorName}&quot;
                </h5>
              </div>

              {/* Color Name & Swatch Selector */}
              <div>
                <label className="font-bold text-brand-dark block mb-1">SELECT PRESET COLOR OR ENTER CUSTOM:</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map((pc) => (
                    <button
                      key={pc.name}
                      type="button"
                      onClick={() => handleUpdateActiveColorDetails({ name: pc.name, code: pc.code })}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
                        activeItem.colorName === pc.name
                          ? 'border-brand-dark bg-brand-dark text-white font-bold shadow-xs'
                          : 'border-brand-border bg-white text-brand-dark hover:border-brand-dark'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: pc.code }} />
                      <span>{pc.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-semibold text-brand-muted block mb-0.5">COLOR NAME</label>
                    <input
                      type="text"
                      value={activeItem.colorName}
                      onChange={(e) => handleUpdateActiveColorDetails({ name: e.target.value })}
                      className="w-full p-2 border border-brand-border rounded font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-brand-muted block mb-0.5">HEX CODE</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeItem.colorCode}
                        onChange={(e) => handleUpdateActiveColorDetails({ code: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-brand-border p-0.5"
                      />
                      <input
                        type="text"
                        value={activeItem.colorCode}
                        onChange={(e) => handleUpdateActiveColorDetails({ code: e.target.value })}
                        className="w-full p-2 border border-brand-border rounded font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* FREE SIZE STOCK QUANTITY FOR THIS COLOR */}
              <div className="pt-2 border-t border-brand-border">
                <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-brand-border shadow-xs">
                  <div>
                    <span className="font-bold text-brand-dark uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <Layers size={14} className="text-brand-gold" />
                      <span>FREE SIZE STOCK QUANTITY FOR &quot;{activeItem.colorName}&quot;:</span>
                    </span>
                    <p className="text-[10px] text-brand-muted mt-0.5">All clothes at Daisy Hub are Free Size (One Size Fits All).</p>
                  </div>

                  <div className="w-32 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={activeColorObj?.stock !== undefined ? activeColorObj.stock : activeSizes.reduce((acc, s) => acc + s.stock, 0)}
                      onChange={(e) => handleUpdateFreeSizeStock(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-brand-border rounded font-mono font-bold text-sm text-center focus:outline-none focus:border-brand-dark bg-brand-cream/30"
                    />
                    <span className="text-[10px] font-bold text-brand-dark uppercase">UNITS</span>
                  </div>
                </div>
              </div>

              {/* Add Image via URL to Active Color */}
              <div className="pt-2 border-t border-brand-border flex items-center gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste additional image URL for this color..."
                  className="flex-1 p-2 border border-brand-border rounded font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => handleAddImage(newImageUrl)}
                  className="px-3 py-2 bg-brand-dark text-white font-bold text-xs rounded hover:bg-brand-dark/90"
                >
                  + Add URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
