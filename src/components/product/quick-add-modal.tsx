'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { useStore, getProductStock, isProductOutOfStock } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const QuickAddModal: React.FC = () => {
  const { quickAddProduct, closeQuickAdd, addToCart } = useStore();
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (quickAddProduct) {
      setSelectedColor(quickAddProduct.colors[0]?.name || '');
      setQuantity(1);
    }
  }, [quickAddProduct]);

  if (!quickAddProduct) return null;

  const activeColorObj = quickAddProduct.colors.find((c) => c.name === selectedColor) || quickAddProduct.colors[0];
  const activeImage = activeColorObj?.images[0] || quickAddProduct.colors[0]?.images[0] || '';
  const displayPrice = quickAddProduct.salePrice || quickAddProduct.price;

  const availableStock = getProductStock(quickAddProduct, selectedColor);
  const isOutOfStock = isProductOutOfStock(quickAddProduct, selectedColor);

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart(quickAddProduct, selectedColor, 'Free Size', Math.min(quantity, availableStock));
    closeQuickAdd();
  };

  return (
    <Dialog open={!!quickAddProduct} onOpenChange={(open) => !open && closeQuickAdd()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-[3/4] bg-secondary md:h-full">
            <Image src={activeImage} alt={quickAddProduct.name} fill unoptimized className="object-cover" />
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Badge variant="destructive" className="text-xs px-3 py-1 tracking-widest shadow-md">
                  OUT OF STOCK
                </Badge>
              </div>
            )}
          </div>

          {/* Details & Controls */}
          <div className="p-6 flex flex-col justify-between space-y-4">
            <div>
              <DialogHeader className="p-0 text-left space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">QUICK ADD</span>
                  {isOutOfStock && (
                    <Badge variant="destructive" className="text-[9px]">
                      OUT OF STOCK
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  {quickAddProduct.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Select your preferred shade and add to your bag directly.
                </DialogDescription>
              </DialogHeader>

              {/* Price */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-base font-bold text-foreground">NPR {displayPrice.toLocaleString()}</span>
                {quickAddProduct.salePrice && (
                  <>
                    <span className="text-xs text-muted-foreground line-through">NPR {quickAddProduct.price.toLocaleString()}</span>
                    <Badge variant="sale" className="text-[10px]">
                      {quickAddProduct.discountPercentage}% OFF
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground block mb-2">
                COLOR: <span className="font-normal text-muted-foreground">{selectedColor}</span>
              </label>
              <div className="flex items-center gap-2">
                {quickAddProduct.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedColor === color.name ? 'border-primary scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                    title={color.name}
                  >
                    <span className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: color.code }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Size Display (Free Size Default) */}
            <div className="py-2.5 px-4 bg-secondary/60 rounded-md border border-border flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                SIZE: <span className="text-brand-gold font-extrabold ml-1">FREE SIZE</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                One Size Fits All
              </span>
            </div>

            {/* Action */}
            <Button
              onClick={handleAdd}
              disabled={isOutOfStock}
              variant={isOutOfStock ? 'destructive' : 'luxury'}
              size="lg"
              className="w-full tracking-widest"
            >
              <ShoppingBag size={15} className="mr-2" />
              <span>{isOutOfStock ? 'OUT OF STOCK' : 'ADD TO BAG'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
