'use client';

import React from 'react';
import Link from 'next/link';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore, getProductStock } from '@/lib/store';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const MiniCart: React.FC = () => {
  const { isMiniCartOpen, closeMiniCart, cart, updateQuantity, removeFromCart, getCartTotal, clearDirectCheckoutItem } = useStore();

  if (!isMiniCartOpen) return null;

  const allProds = db.getProducts();
  const total = getCartTotal();
  const freeShippingThreshold = 3000;
  const progress = Math.min(100, (total / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - total);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in" onClick={closeMiniCart} />

      {/* Mini Cart Drawer */}
      <div className="relative w-full max-w-md bg-background text-foreground h-full flex flex-col justify-between shadow-2xl z-10 border-l border-border animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div>
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} className="text-foreground" />
              <span className="font-serif-title font-semibold text-lg text-foreground tracking-wider">YOUR BAG</span>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </Badge>
            </div>
            <button
              onClick={closeMiniCart}
              className="p-1.5 text-foreground hover:bg-muted rounded-full transition-colors"
              aria-label="Close Bag"
            >
              <X size={18} />
            </button>
          </div>

          {/* Free Shipping Meter */}
          <div className="bg-secondary/70 px-5 py-3 border-b border-border">
            {remainingForFreeShipping > 0 ? (
              <p className="text-xs text-foreground font-medium mb-1.5">
                Add <span className="font-bold text-brand-gold">NPR {remainingForFreeShipping.toLocaleString()}</span> more for FREE Delivery!
              </p>
            ) : (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mb-1.5 flex items-center gap-1">
                🎉 Congratulations! You qualify for FREE Delivery across Nepal.
              </p>
            )}
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <ShoppingBag size={48} className="mx-auto text-muted-foreground/40 stroke-1" />
              <h3 className="font-serif-title text-lg font-semibold text-foreground">Your bag is empty</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Discover our newest collection of modern dresses, tops & co-ord sets.
              </p>
              <Button
                onClick={closeMiniCart}
                variant="luxury"
                size="sm"
                className="tracking-widest"
              >
                START SHOPPING
              </Button>
            </div>
          ) : (
            cart.map((item) => {
              const prod = allProds.find((p) => p.id === item.productId || p.slug === item.productSlug);
              const targetColor = prod?.colors.find((c) => c.name === item.colorName);
              const liveStock = targetColor?.stock !== undefined ? targetColor.stock : (prod?.sizes[0]?.stock ?? 0);
              const isItemOutOfStock = !prod || prod.isOutOfStock || liveStock <= 0;

              return (
                <div key={item.id} className={`flex gap-4 p-3 rounded-lg border transition-all ${
                  isItemOutOfStock ? 'bg-destructive/10 border-destructive/30' : 'bg-card border-border shadow-xs'
                }`}>
                  <div className="relative w-20 aspect-[3/4] rounded overflow-hidden bg-secondary shrink-0">
                    <ImageWithSkeleton src={item.image} alt={item.productName} fill className={`object-cover ${isItemOutOfStock ? 'opacity-60 grayscale-[25%]' : ''}`} />
                    {isItemOutOfStock && (
                      <span className="absolute inset-x-0 bottom-0 bg-destructive text-destructive-foreground text-[8px] font-bold text-center py-0.5 uppercase tracking-tighter">
                        OUT OF STOCK
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <Link
                          href={`/product/${item.productSlug}`}
                          onClick={closeMiniCart}
                          className="text-xs font-semibold text-foreground hover:text-brand-gold line-clamp-1 transition-colors"
                        >
                          {item.productName}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span>Color: {item.colorName}</span>
                        <span>•</span>
                        <span>Size: {item.size}</span>
                      </div>
                      {isItemOutOfStock && (
                        <Badge variant="destructive" className="mt-1 text-[9px]">
                          OUT OF STOCK
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity controls */}
                      <div className="flex items-center border border-border rounded-md bg-background">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-muted text-foreground transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isItemOutOfStock}
                          className="p-1 hover:bg-muted text-foreground transition-colors disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-foreground">
                        NPR {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-border bg-card space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">NPR {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{remainingForFreeShipping === 0 ? 'FREE' : 'NPR 150'}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold text-foreground pt-1">
                <span>Total</span>
                <span>NPR {(total + (remainingForFreeShipping === 0 ? 0 : 150)).toLocaleString()}</span>
              </div>
            </div>

            {/* Check if any cart item is out of stock */}
            {(() => {
              const hasOutOfStock = cart.some((item) => {
                const prod = allProds.find((p) => p.id === item.productId || p.slug === item.productSlug);
                const targetColor = prod?.colors.find((c) => c.name === item.colorName);
                const liveStock = targetColor?.stock !== undefined ? targetColor.stock : (prod?.sizes[0]?.stock ?? 0);
                return !prod || prod.isOutOfStock || liveStock <= 0;
              });

              if (hasOutOfStock) {
                return (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-destructive text-center bg-destructive/10 p-2 rounded border border-destructive/20">
                      ⚠️ Bag contains OUT OF STOCK items. Please remove them to checkout.
                    </p>
                    <Button asChild variant="destructive" className="w-full tracking-wider text-xs">
                      <Link href="/cart" onClick={closeMiniCart}>
                        VIEW & FIX BAG →
                      </Link>
                    </Button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline" className="w-full tracking-wider text-xs">
                    <Link href="/cart" onClick={closeMiniCart}>
                      VIEW BAG
                    </Link>
                  </Button>

                  <Button asChild variant="luxury" className="w-full tracking-wider text-xs shadow-md">
                    <Link
                      href="/checkout"
                      onClick={() => {
                        clearDirectCheckoutItem();
                        closeMiniCart();
                      }}
                      className="flex items-center justify-center gap-1.5"
                    >
                      <span>CHECKOUT</span>
                      <ArrowRight size={13} />
                    </Link>
                  </Button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
