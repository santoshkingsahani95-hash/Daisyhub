'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, CheckCircle, Tag } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { MiniCart } from '@/components/cart/mini-cart';
import { SearchOverlay } from '@/components/layout/search-overlay';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearDirectCheckoutItem } = useStore();
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<{ valid: boolean; discountAmount: number; message: string } | null>(null);

  const subtotal = getCartTotal();
  const discount = couponStatus?.valid ? couponStatus.discountAmount : 0;
  const shipping = subtotal >= 3000 || subtotal === 0 ? 0 : 150;
  const total = Math.max(0, subtotal - discount + shipping);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const res = db.validateCoupon(couponCode, subtotal);
    setCouponStatus(res);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        <h1 className="font-serif-title text-3xl md:text-4xl font-bold text-brand-dark mb-8 uppercase tracking-wider">
          YOUR SHOPPING BAG
        </h1>

        {cart.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-brand-border rounded space-y-4">
            <ShoppingBag size={48} className="mx-auto text-brand-muted/40" />
            <h2 className="font-serif-title text-2xl font-bold text-brand-dark">Your bag is currently empty</h2>
            <p className="text-xs text-brand-muted max-w-md mx-auto">
              Explore our latest women&apos;s fashion drops, dresses, tops & co-ord sets.
            </p>
            <Link
              href="/shop"
              className="inline-block px-8 py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90"
            >
              EXPLORE COLLECTION
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Cart Items Table */}
            <div className="lg:col-span-8 space-y-6">
              <div className="border-b border-brand-border pb-4 hidden md:grid grid-cols-12 text-xs font-bold uppercase tracking-wider text-brand-muted">
                <span className="col-span-6">PRODUCT</span>
                <span className="col-span-2 text-center">QUANTITY</span>
                <span className="col-span-2 text-right">PRICE</span>
                <span className="col-span-2 text-right">TOTAL</span>
              </div>

              <div className="divide-y divide-brand-border">
                {cart.map((item) => (
                  <div key={item.id} className="py-6 flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                    {/* Item info */}
                    <div className="col-span-6 flex gap-4 w-full">
                      <div className="relative w-20 aspect-[3/4] bg-brand-cream rounded overflow-hidden shrink-0">
                        <Image src={item.image} alt={item.productName} fill unoptimized className="object-cover" />
                      </div>
                      <div className="space-y-1">
                        <Link href={`/product/${item.productSlug}`} className="font-semibold text-xs text-brand-dark hover:text-brand-gold">
                          {item.productName}
                        </Link>
                        <p className="text-[11px] text-brand-muted">Color: {item.colorName} | Size: {item.size}</p>
                        <p className="text-[11px] text-brand-muted">SKU: {item.sku}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-brand-sale hover:underline text-[11px] flex items-center gap-1 pt-1"
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 flex justify-center w-full md:w-auto">
                      <div className="flex items-center border border-brand-border rounded">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-xs hover:bg-brand-cream text-brand-dark font-bold"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="px-3 text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-xs hover:bg-brand-cream text-brand-dark font-bold"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2 text-right hidden md:block text-xs font-medium text-brand-muted">
                      NPR {item.price.toLocaleString()}
                    </div>

                    {/* Line Total */}
                    <div className="col-span-2 text-right w-full md:w-auto flex justify-between md:justify-end text-xs font-bold text-brand-dark">
                      <span className="md:hidden text-brand-muted font-normal">Line Total:</span>
                      <span>NPR {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between items-center">
                <Link
                  href="/shop"
                  className="text-xs font-bold text-brand-dark hover:text-brand-gold uppercase tracking-wider underline underline-offset-4"
                >
                  ← CONTINUE SHOPPING
                </Link>
              </div>
            </div>

            {/* Right: Summary Card & Coupon */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-brand-cream/60 p-6 rounded-lg border border-brand-border space-y-6">
                <h3 className="font-serif-title text-lg font-bold text-brand-dark uppercase tracking-wider">
                  ORDER SUMMARY
                </h3>

                {/* Coupon Input Form */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label className="text-xs font-semibold text-brand-dark flex items-center gap-1">
                    <Tag size={12} /> PROMO / COUPON CODE
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="e.g. WELCOME10 or ACE500"
                      className="bg-white border border-brand-border text-xs px-3 py-2.5 flex-1 rounded-l uppercase font-mono focus:outline-none focus:border-brand-dark"
                    />
                    <button
                      type="submit"
                      className="bg-brand-dark text-white text-xs font-bold px-4 py-2.5 rounded-r uppercase tracking-wider hover:bg-brand-dark/90"
                    >
                      APPLY
                    </button>
                  </div>
                  {couponStatus && (
                    <p className={`text-[11px] font-medium ${couponStatus.valid ? 'text-emerald-600' : 'text-brand-sale'}`}>
                      {couponStatus.message}
                    </p>
                  )}
                </form>

                {/* Price Breakdown */}
                <div className="space-y-3 text-xs border-t border-brand-border pt-4">
                  <div className="flex justify-between text-brand-muted">
                    <span>Subtotal</span>
                    <span className="font-bold text-brand-dark">NPR {subtotal.toLocaleString()}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Coupon Discount</span>
                      <span>- NPR {discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-brand-muted">
                    <span>Estimated Shipping</span>
                    <span>{shipping === 0 ? 'FREE' : `NPR ${shipping}`}</span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-brand-dark pt-3 border-t border-brand-border">
                    <span>TOTAL</span>
                    <span className="text-base">NPR {total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Out of Stock Warning if any item is out of stock */}
                {(() => {
                  const allProds = db.getProducts();
                  const outOfStockItems = cart.filter((item) => {
                    const prod = allProds.find((p) => p.id === item.productId || p.slug === item.productSlug);
                    if (!prod || prod.isOutOfStock) return true;
                    const targetColor = prod.colors.find((c) => c.name === item.colorName);
                    const colorStock = targetColor?.stock !== undefined ? targetColor.stock : (prod.sizes[0]?.stock ?? 0);
                    return colorStock <= 0;
                  });

                  if (outOfStockItems.length > 0) {
                    return (
                      <div className="space-y-2">
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium">
                          ⚠️ <strong>Out of Stock Alert:</strong> {outOfStockItems.map(i => i.productName).join(', ')} is OUT OF STOCK. Please remove from bag to proceed.
                        </div>
                        <button
                          disabled
                          className="w-full py-4 bg-rose-600/60 text-white text-xs font-bold uppercase tracking-widest text-center cursor-not-allowed block shadow-sm"
                        >
                          REMOVE OUT OF STOCK ITEMS TO CHECKOUT
                        </button>
                      </div>
                    );
                  }

                  return (
                    <Link
                      href="/checkout"
                      onClick={clearDirectCheckoutItem}
                      className="w-full py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest text-center block hover:bg-brand-dark/90 transition-all shadow-md"
                    >
                      PROCEED TO CHECKOUT →
                    </Link>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MiniCart />
      <SearchOverlay />
    </div>
  );
}
