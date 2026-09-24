'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore, getProductStock } from '@/lib/store';
import { db } from '@/lib/db';

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
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={closeMiniCart} />

      {/* Mini Cart Drawer */}
      <div className="relative w-full max-w-md bg-white h-full flex flex-col justify-between shadow-2xl z-10">
        {/* Header */}
        <div>
          <div className="p-5 border-b border-brand-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} className="text-brand-dark" />
              <span className="font-serif-title font-semibold text-lg text-brand-dark tracking-wider">YOUR BAG</span>
              <span className="text-xs text-brand-muted">({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
            </div>
            <button
              onClick={closeMiniCart}
              className="p-2 text-brand-dark hover:bg-brand-cream rounded-full transition-colors"
              aria-label="Close Bag"
            >
              <X size={20} />
            </button>
          </div>

          {/* Free Shipping Meter */}
          <div className="bg-brand-cream/80 px-5 py-3 border-b border-brand-border">
            {remainingForFreeShipping > 0 ? (
              <p className="text-xs text-brand-dark font-medium mb-1.5">
                Add <span className="font-bold text-brand-gold">NPR {remainingForFreeShipping.toLocaleString()}</span> more for FREE Delivery!
              </p>
            ) : (
              <p className="text-xs text-emerald-700 font-bold mb-1.5 flex items-center gap-1">
                🎉 Congratulations! You qualify for FREE Delivery across Nepal.
              </p>
            )}
            <div className="w-full bg-brand-border h-1.5 rounded-full overflow-hidden">
              <div className="bg-brand-dark h-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <ShoppingBag size={48} className="mx-auto text-brand-muted/40 stroke-1" />
              <h3 className="font-serif-title text-lg font-semibold text-brand-dark">Your bag is empty</h3>
              <p className="text-xs text-brand-muted max-w-xs mx-auto">
                Discover our newest collection of modern dresses, tops & co-ord sets.
              </p>
              <button
                onClick={closeMiniCart}
                className="inline-block px-6 py-3 bg-brand-dark text-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-dark/90 transition-colors"
              >
                START SHOPPING
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const prod = allProds.find((p) => p.id === item.productId || p.slug === item.productSlug);
              const targetColor = prod?.colors.find((c) => c.name === item.colorName);
              const liveStock = targetColor?.stock !== undefined ? targetColor.stock : (prod?.sizes[0]?.stock ?? 0);
              const isItemOutOfStock = !prod || prod.isOutOfStock || liveStock <= 0;

              return (
                <div key={item.id} className={`flex gap-4 p-3 rounded border transition-all ${
                  isItemOutOfStock ? 'bg-rose-50/60 border-rose-200' : 'bg-brand-cream/30 border-brand-border/60'
                }`}>
                  <div className="relative w-20 aspect-[3/4] rounded overflow-hidden bg-brand-cream shrink-0">
                    <Image src={item.image} alt={item.productName} fill unoptimized className={`object-cover ${isItemOutOfStock ? 'opacity-60 grayscale-25' : ''}`} />
                    {isItemOutOfStock && (
                      <span className="absolute inset-x-0 bottom-0 bg-rose-600 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-tighter">
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
                          className="text-xs font-semibold text-brand-dark hover:text-brand-gold line-clamp-1"
                        >
                          {item.productName}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-brand-muted hover:text-brand-sale transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-brand-muted mt-1">
                        <span>Color: {item.colorName}</span>
                        <span>•</span>
                        <span>Size: {item.size}</span>
                      </div>
                      {isItemOutOfStock && (
                        <span className="inline-block mt-1 text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                          OUT OF STOCK
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity controls */}
                      <div className="flex items-center border border-brand-border rounded bg-white">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-brand-cream text-brand-dark transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-brand-dark">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isItemOutOfStock}
                          className="p-1 hover:bg-brand-cream text-brand-dark transition-colors disabled:opacity-30"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-brand-dark">
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
          <div className="p-5 border-t border-brand-border bg-white space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-brand-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-brand-dark">NPR {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-brand-muted">
                <span>Shipping</span>
                <span>{remainingForFreeShipping === 0 ? 'FREE' : 'NPR 150'}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-brand-dark pt-2 border-t border-brand-border">
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
                    <p className="text-[11px] font-semibold text-rose-600 text-center bg-rose-50 p-2 rounded border border-rose-200">
                      ⚠️ Bag contains OUT OF STOCK items. Please remove them to checkout.
                    </p>
                    <Link
                      href="/cart"
                      onClick={closeMiniCart}
                      className="w-full py-3 px-4 bg-rose-600 text-white text-center text-xs font-semibold uppercase tracking-wider block rounded shadow-xs"
                    >
                      VIEW & FIX BAG →
                    </Link>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/cart"
                    onClick={closeMiniCart}
                    className="py-3 px-4 border border-brand-dark text-brand-dark text-center text-xs font-semibold uppercase tracking-wider hover:bg-brand-cream transition-colors"
                  >
                    VIEW BAG
                  </Link>

                  <Link
                    href="/checkout"
                    onClick={() => {
                      clearDirectCheckoutItem();
                      closeMiniCart();
                    }}
                    className="py-3 px-4 bg-brand-dark text-white text-center text-xs font-semibold uppercase tracking-wider hover:bg-brand-dark/90 transition-colors flex items-center justify-center gap-1"
                  >
                    <span>CHECKOUT</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
