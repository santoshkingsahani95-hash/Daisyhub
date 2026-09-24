'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, CheckCircle2, Layers, Upload } from 'lucide-react';
import { db } from '@/lib/db';
import { Category } from '@/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [msg, setMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [subcategoriesInput, setSubcategoriesInput] = useState('');

  const compressAndSetImage = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImage(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setImage(rawUrl);
        }
      };
      img.onerror = () => setImage(rawUrl);
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setCategories(db.getCategories());
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImage('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop');
    setSubcategoriesInput('Basic Tops, Casual Tops, Elegant Blouses');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description);
    setImage(cat.image);
    setSubcategoriesInput(cat.subcategories.join(', '));
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"? This action cannot be undone.`)) {
      db.deleteCategory(id);
      setCategories(db.getCategories());
      setMsg(`Category "${catName}" has been deleted.`);
      setTimeout(() => setMsg(''), 3500);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generatedSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const subcats = subcategoriesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const categoryObj: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      slug: generatedSlug,
      name: name.trim(),
      description: description.trim(),
      image: image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
      subcategories: subcats.length > 0 ? subcats : ['General'],
    };

    if (editingCategory) {
      db.updateCategory(editingCategory.id, categoryObj);
    } else {
      db.addCategory(categoryObj);
    }

    setCategories(db.getCategories());
    setIsModalOpen(false);
    setMsg(
      editingCategory
        ? `Category "${name}" updated successfully!`
        : `New category "${name}" added successfully!`
    );
    setTimeout(() => setMsg(''), 3500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Title & Add Category Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
            <Layers className="text-brand-gold" size={28} />
            <span>CATEGORY MANAGEMENT</span>
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Add new categories, remove existing categories, replace hero images, and edit subcategories live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {msg && (
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded flex items-center gap-1 border border-emerald-200">
              <CheckCircle2 size={14} /> {msg}
            </span>
          )}
          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 flex items-center justify-center gap-2 rounded shadow transition-all"
          >
            <Plus size={16} />
            <span>ADD NEW CATEGORY</span>
          </button>
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-lg border border-brand-border shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="relative h-48 w-full bg-brand-cream">
              <Image src={cat.image} alt={cat.name} fill unoptimized className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-4">
                <div>
                  <span className="text-[10px] text-brand-gold uppercase tracking-widest font-bold">CATEGORY</span>
                  <h3 className="font-serif-title text-2xl font-bold text-white uppercase">{cat.name}</h3>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-brand-dark/80 font-sans leading-relaxed">{cat.description}</p>

              <div>
                <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block mb-1.5">
                  SUBCATEGORIES ({cat.subcategories.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {cat.subcategories.map((sub) => (
                    <span key={sub} className="bg-brand-cream text-brand-dark text-[10px] font-medium px-2.5 py-0.5 rounded border border-brand-border">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-between items-center">
                <span className="text-[10px] text-brand-muted font-mono uppercase">SLUG: /category/{cat.slug}</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="px-3.5 py-1.5 bg-brand-cream hover:bg-brand-dark hover:text-white text-brand-dark text-xs font-semibold uppercase tracking-wider rounded border border-brand-border transition-all flex items-center gap-1"
                    title="Edit Category"
                  >
                    <Edit2 size={14} />
                    <span>EDIT</span>
                  </button>

                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-brand-sale text-xs font-semibold uppercase tracking-wider rounded border border-rose-200 transition-all flex items-center gap-1"
                    title="Delete Category"
                  >
                    <Trash2 size={14} />
                    <span>REMOVE</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />

          <div className="relative w-full max-w-xl bg-white rounded-lg shadow-2xl z-10 p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-brand-border">
              <div>
                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">ADMIN CATEGORY EDITOR</span>
                <h3 className="font-serif-title text-xl font-bold text-brand-dark uppercase tracking-wider">
                  {editingCategory ? `EDIT CATEGORY: ${editingCategory.name}` : 'CREATE NEW CATEGORY'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-brand-cream rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Category Image Preview & Upload */}
              <div className="space-y-2">
                <label className="font-bold text-brand-dark uppercase tracking-wider block">CATEGORY PHOTO / HERO IMAGE *</label>
                <div className="relative h-44 w-full bg-brand-cream rounded border border-brand-border overflow-hidden">
                  {image ? (
                    <Image src={image} alt="Category Photo Preview" fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-brand-muted">
                      <ImageIcon size={32} />
                      <span className="text-[10px] mt-1">No Image Selected</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-brand-border hover:border-brand-dark bg-brand-cream/30 p-3 rounded text-center transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    id="category-photo-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) compressAndSetImage(file);
                    }}
                  />
                  <label
                    htmlFor="category-photo-file"
                    className="cursor-pointer px-4 py-2 bg-brand-dark text-white text-xs font-bold rounded uppercase tracking-wider hover:bg-brand-dark/90 flex items-center gap-2"
                  >
                    <Upload size={14} />
                    <span>Upload Photo from Computer</span>
                  </label>
                  <p className="text-[10px] text-brand-muted mt-1.5">Pick image file (PNG, JPG, WEBP)</p>
                </div>

                <div>
                  <label className="font-semibold text-brand-dark block mb-1">OR ENTER IMAGE URL</label>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2.5 border border-brand-border rounded text-xs bg-white"
                  />
                </div>
              </div>

              {/* Category Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-brand-dark uppercase tracking-wider block mb-1">CATEGORY NAME *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ethnic Wear, Sweaters"
                    className="w-full p-3 border border-brand-border rounded font-semibold text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
                  <label className="font-bold text-brand-dark uppercase tracking-wider block mb-1">URL SLUG</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. ethnic-wear (auto-generated if empty)"
                    className="w-full p-3 border border-brand-border rounded font-mono text-xs focus:outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-brand-dark uppercase tracking-wider block mb-1">DESCRIPTION *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter category description shown on shop pages..."
                  className="w-full p-2.5 border border-brand-border rounded"
                />
              </div>

              {/* Subcategories */}
              <div>
                <label className="font-bold text-brand-dark uppercase tracking-wider block mb-1">
                  SUBCATEGORIES (Comma separated)
                </label>
                <input
                  type="text"
                  value={subcategoriesInput}
                  onChange={(e) => setSubcategoriesInput(e.target.value)}
                  placeholder="Basic Tops, Crop Tops, Satin Blouses"
                  className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
                />
              </div>

              {/* Actions */}
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
                  {editingCategory ? 'SAVE CATEGORY CHANGES' : 'CREATE CATEGORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
