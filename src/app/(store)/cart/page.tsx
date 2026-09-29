'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearDirectCheckoutItem } = useStore();

  const subtotal = getCartTotal();
  const shipping = subtotal >= 3000 || subtotal === 0 ? 0 : 150;
  const total = Math.max(0, subtotal + shipping);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        <h1 className="font-serif-title text-3xl md:text-4xl font-bold text-foreground mb-8 uppercase tracking-wider">
          YOUR SHOPPING BAG
        </h1>

        {cart.length === 0 ? (
          <Card className="text-center py-20 border-dashed space-y-4">
            <CardContent className="space-y-4 pt-6">
              <ShoppingBag size={48} className="mx-auto text-muted-foreground/40 stroke-1" />
              <h2 className="font-serif-title text-2xl font-bold text-foreground">Your bag is currently empty</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Explore our latest women&apos;s fashion drops, dresses, tops & co-ord sets.
              </p>
              <Button asChild variant="luxury" size="lg" className="tracking-widest">
                <Link href="/shop">
                  EXPLORE COLLECTION
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Cart Items Table */}
            <div className="lg:col-span-8 space-y-6">
              <div className="border-b border-border pb-4 hidden md:grid grid-cols-12 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="col-span-6">PRODUCT</span>
                <span className="col-span-2 text-center">QUANTITY</span>
                <span className="col-span-2 text-right">PRICE</span>
                <span className="col-span-2 text-right">TOTAL</span>
              </div>

              <div className="divide-y divide-border">
                {cart.map((item) => (
                  <div key={item.id} className="py-6 flex flex-col md:grid md:grid-cols-12 gap-4 items-center">
                    {/* Item info */}
                    <div className="col-span-6 flex gap-4 w-full">
                      <div className="relative w-20 aspect-[3/4] bg-secondary rounded overflow-hidden shrink-0 border border-border">
                        <Image src={item.image} alt={item.productName} fill unoptimized className="object-cover" />
                      </div>
                      <div className="space-y-1">
                        <Link href={`/product/${item.productSlug}`} className="font-semibold text-xs text-foreground hover:text-brand-gold transition-colors">
                          {item.productName}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">Color: {item.colorName} | Size: {item.size}</p>
                        <p className="text-[11px] text-muted-foreground">SKU: {item.sku}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:underline text-[11px] flex items-center gap-1 pt-1 transition-colors"
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2 flex justify-center w-full md:w-auto">
                      <div className="flex items-center border border-border rounded bg-card">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-xs hover:bg-muted text-foreground font-bold transition-colors"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="px-3 text-xs font-bold text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-xs hover:bg-muted text-foreground font-bold transition-colors"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-2 text-right hidden md:block text-xs font-medium text-muted-foreground">
                      NPR {item.price.toLocaleString()}
                    </div>

                    {/* Line Total */}
                    <div className="col-span-2 text-right w-full md:w-auto flex justify-between md:justify-end text-xs font-bold text-foreground">
                      <span className="md:hidden text-muted-foreground font-normal">Line Total:</span>
                      <span>NPR {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between items-center">
                <Link
                  href="/shop"
                  className="text-xs font-bold text-foreground hover:text-brand-gold uppercase tracking-wider underline underline-offset-4 transition-colors"
                >
                  ← CONTINUE SHOPPING
                </Link>
              </div>
            </div>

            {/* Right: Summary Card */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-secondary/40 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base uppercase tracking-wider">
                    ORDER SUMMARY
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price Breakdown */}
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-bold text-foreground">NPR {subtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-muted-foreground">
                      <span>Estimated Shipping</span>
                      <span>{shipping === 0 ? 'FREE' : `NPR ${shipping}`}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-sm font-bold text-foreground pt-1">
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
                          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded font-medium">
                            ⚠️ <strong>Out of Stock Alert:</strong> {outOfStockItems.map(i => i.productName).join(', ')} is OUT OF STOCK. Please remove from bag to proceed.
                          </div>
                          <Button
                            disabled
                            variant="destructive"
                            className="w-full text-xs font-bold tracking-widest cursor-not-allowed"
                          >
                            REMOVE OUT OF STOCK ITEMS TO CHECKOUT
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <Button asChild variant="luxury" size="lg" className="w-full text-xs font-bold uppercase tracking-widest shadow-md">
                        <Link
                          href="/checkout"
                          onClick={clearDirectCheckoutItem}
                          className="flex items-center justify-center gap-1.5"
                        >
                          <span>PROCEED TO CHECKOUT</span>
                          <ArrowRight size={14} />
                        </Link>
                      </Button>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
