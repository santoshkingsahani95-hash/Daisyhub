'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';
import { Heart, ShoppingBag } from 'lucide-react';
import { Product } from '@/types';
import { useStore, isProductOutOfStock } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
      className="group relative flex flex-col bg-card rounded-md transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Wrapper */}
      <div className="relative aspect-[3/4] w-full bg-secondary/60 overflow-hidden rounded-md border border-border/60">
        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 items-start">
          {isOutOfStock ? (
            <Badge variant="destructive" className="text-[9px] font-bold tracking-widest px-2 py-0.5 shadow-xs">
              OUT OF STOCK
            </Badge>
          ) : (
            <>
              {product.isNewArrival && (
                <Badge variant="default" className="text-[9px] font-bold tracking-widest px-2 py-0.5 shadow-xs">
                  NEW
                </Badge>
              )}
              {product.isTrending && (
                <Badge variant="gold" className="text-[9px] font-bold tracking-widest px-2 py-0.5 shadow-xs">
                  TRENDING
                </Badge>
              )}
              {product.salePrice && product.discountPercentage && (
                <Badge variant="sale" className="text-[9px] font-bold tracking-widest px-2 py-0.5 shadow-xs">
                  -{product.discountPercentage}%
                </Badge>
              )}
            </>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-full bg-background/85 backdrop-blur-xs transition-all duration-300 shadow-xs ${
            inWishlist ? 'text-brand-sale' : 'text-foreground hover:text-brand-sale hover:scale-105'
          }`}
          aria-label="Wishlist"
        >
          <Heart size={15} className={inWishlist ? 'fill-brand-sale' : ''} />
        </button>

        {/* Image Swap Link */}
        <Link href={`/product/${product.slug}`} className="block w-full h-full">
          <ImageWithSkeleton
            src={isHovered && secondImg ? secondImg : firstImg}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={`object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
              isOutOfStock ? 'opacity-70 grayscale-[30%]' : ''
            }`}
          />
        </Link>

        {/* Quick Add Hover Overlay Button */}
        <div className="absolute bottom-3 left-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 hidden md:block">
          {isOutOfStock ? (
            <Button
              disabled
              variant="destructive"
              size="sm"
              className="w-full text-xs font-bold tracking-widest cursor-not-allowed shadow-md"
            >
              OUT OF STOCK
            </Button>
          ) : (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openQuickAdd(product);
              }}
              variant="luxury"
              size="sm"
              className="w-full text-xs font-semibold tracking-widest shadow-lg flex items-center justify-center gap-2"
            >
              <ShoppingBag size={14} />
              <span>QUICK ADD</span>
            </Button>
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
              className={`w-3.5 h-3.5 rounded-full border border-border transition-all ${
                selectedColorIndex === idx ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'opacity-75 hover:opacity-100'
              }`}
              style={{ backgroundColor: color.code }}
              title={color.name}
            />
          ))}
        </div>

        {/* Product Title */}
        <Link
          href={`/product/${product.slug}`}
          className="text-xs md:text-sm font-medium text-foreground hover:text-brand-gold line-clamp-1 transition-colors block"
        >
          {product.name}
        </Link>

        {/* Pricing & Stock Status */}
        <div className="flex items-center justify-between text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">NPR {displayPrice.toLocaleString()}</span>
            {product.salePrice && (
              <span className="text-muted-foreground line-through text-[11px] md:text-xs">
                NPR {product.price.toLocaleString()}
              </span>
            )}
          </div>
          {isOutOfStock && (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 leading-none">
              SOLD OUT
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
