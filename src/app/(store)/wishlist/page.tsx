'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';

export default function WishlistPage() {
  const { wishlist, toggleWishlist, openQuickAdd } = useStore();
  const allProducts = db.getProducts();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        <div className="flex items-center justify-between border-b border-brand-border pb-6 mb-8">
          <div>
            <h1 className="font-serif-title text-3xl md:text-4xl font-bold text-brand-dark uppercase tracking-wider">
              MY WISHLIST
            </h1>
            <p className="text-xs text-brand-muted mt-1">
              {wishlist.length} {wishlist.length === 1 ? 'saved item' : 'saved items'}
            </p>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-brand-border rounded space-y-4">
            <Heart size={48} className="mx-auto text-brand-muted/40 stroke-1" />
            <h2 className="font-serif-title text-2xl font-bold text-brand-dark">Your wishlist is empty</h2>
            <p className="text-xs text-brand-muted max-w-md mx-auto">
              Save your favorite fashion pieces here while browsing to keep track of items you love.
            </p>
            <Link
              href="/shop"
              className="inline-block px-8 py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90"
            >
              EXPLORE COLLECTION
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((item) => {
              const fullProduct = allProducts.find((p) => p.id === item.productId);
              return (
                <div key={item.productId} className="group relative bg-white border border-brand-border rounded overflow-hidden flex flex-col justify-between">
                  <div className="relative aspect-[3/4] bg-brand-cream overflow-hidden">
                    <Image src={item.image} alt={item.name} fill unoptimized className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <button
                      onClick={() => fullProduct && toggleWishlist(fullProduct)}
                      className="absolute top-2.5 right-2.5 p-2 bg-white/80 rounded-full text-brand-sale hover:bg-white transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] text-brand-muted uppercase tracking-widest font-semibold">{item.category}</span>
                    <Link href={`/product/${item.slug}`} className="font-semibold text-xs text-brand-dark hover:text-brand-gold line-clamp-1 block">
                      {item.name}
                    </Link>

                    <div className="flex items-center gap-2 text-xs font-bold text-brand-dark">
                      <span>NPR {(item.salePrice || item.price).toLocaleString()}</span>
                      {item.salePrice && (
                        <span className="text-brand-muted line-through font-normal text-[11px]">NPR {item.price.toLocaleString()}</span>
                      )}
                    </div>

                    <button
                      onClick={() => fullProduct && openQuickAdd(fullProduct)}
                      className="w-full py-2.5 bg-brand-dark text-white text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark/90 transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                      <ShoppingBag size={14} />
                      <span>ADD TO BAG</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
