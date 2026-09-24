'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import { Product } from '@/types';
import { useStore, isProductOutOfStock } from '@/lib/store';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const { toggleWishlist, isInWishlist, openQuickAdd } = useStore();
  const inWishlist = isInWishlist(product.id);

  const currentColor = product.colors[selectedColorIndex] || product.colors[0];
  const firstImg = currentColor?.images[0] || '';
  const secondImg = currentColor?.images[1] || product.colors[0]?.images[1] || firstImg;

  const displayPrice = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
  const isOutOfStock = isProductOutOfStock(product, currentColor?.name);

  return (
    <div
      className="group relative flex flex-col bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Wrapper */}
      <div className="relative aspect-[3/4] w-full bg-brand-cream overflow-hidden rounded">
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
          {isOutOfStock ? (
            <span className="bg-rose-600 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-xs shadow-sm">
              OUT OF STOCK
            </span>
          ) : (
            <>
              {product.isNewArrival && (
                <span className="bg-brand-dark text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs">
                  NEW
                </span>
              )}
              {product.isTrending && (
                <span className="bg-brand-gold text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs">
                  TRENDING
                </span>
              )}
              {product.salePrice && product.discountPercentage && (
                <span className="bg-brand-sale text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs">
                  -{product.discountPercentage}%
                </span>
              )}
            </>
          )}
        </div>

        {/* Wishlist Button (Always visible on mobile, hover on desktop) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-full bg-white/80 backdrop-blur-xs transition-all duration-300 ${
            inWishlist ? 'text-brand-sale' : 'text-brand-dark hover:text-brand-sale'
          }`}
          aria-label="Wishlist"
        >
          <Heart size={16} className={inWishlist ? 'fill-brand-sale' : ''} />
        </button>

        {/* Image Swap Link */}
        <Link href={`/product/${product.slug}`} className="block w-full h-full">
          <Image
            src={isHovered && secondImg ? secondImg : firstImg}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={`object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
              isOutOfStock ? 'opacity-75 grayscale-25' : ''
            }`}
          />
        </Link>

        {/* Quick Add Hover Overlay Button (Desktop & Touch) */}
        <div className="absolute bottom-3 left-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block">
          {isOutOfStock ? (
            <button
              disabled
              className="w-full py-2.5 bg-rose-600/90 text-white text-xs font-bold uppercase tracking-widest cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              <span>OUT OF STOCK</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openQuickAdd(product);
              }}
              className="w-full py-2.5 bg-white/95 text-brand-dark hover:bg-brand-dark hover:text-white text-xs font-semibold uppercase tracking-widest transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <ShoppingBag size={14} />
              <span>QUICK ADD</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="pt-3 pb-1 space-y-1.5">
        {/* Color Indicators */}
        <div className="flex items-center gap-1.5">
          {product.colors.map((color, idx) => (
            <button
              key={color.name}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedColorIndex(idx);
              }}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                selectedColorIndex === idx ? 'ring-1 ring-brand-dark scale-110' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: color.code }}
              title={color.name}
            />
          ))}
        </div>

        {/* Product Title */}
        <Link
          href={`/product/${product.slug}`}
          className="text-xs md:text-sm font-medium text-brand-dark hover:text-brand-gold line-clamp-1 transition-colors block"
        >
          {product.name}
        </Link>

        {/* Pricing & Stock Status */}
        <div className="flex items-center justify-between text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-dark">NPR {displayPrice.toLocaleString()}</span>
            {product.salePrice && (
              <span className="text-brand-muted line-through text-[11px] md:text-xs">
                NPR {product.price.toLocaleString()}
              </span>
            )}
          </div>
          {isOutOfStock && (
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
              OUT OF STOCK
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
