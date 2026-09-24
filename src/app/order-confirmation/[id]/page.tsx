'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Truck, PackageCheck, ArrowRight, Printer } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { db } from '@/lib/db';
import { Order } from '@/types';

export default function OrderConfirmationPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const id = rawId ? decodeURIComponent(rawId) : '';
  const [order, setOrder] = useState<Order | null>(null);

  const loadOrder = () => {
    if (!id) return;
    const found = db.getOrderById(id);
    if (found) {
      setOrder(found);
    } else {
      // Fallback: check all orders
      const all = db.getOrders();
      if (all.length > 0) {
        const match = all.find(
          (o) =>
            o.id.toLowerCase() === id.toLowerCase() ||
            o.orderNumber.toLowerCase() === id.toLowerCase() ||
            o.id.toLowerCase().includes(id.toLowerCase())
        );
        if (match) setOrder(match);
      }
    }
  };

  useEffect(() => {
    loadOrder();

    const handleDbUpdate = () => loadOrder();
    window.addEventListener('ace-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('ace-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, [id]);

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <AnnouncementBar />
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
          <h2 className="font-serif-title text-2xl font-bold text-brand-dark">Order Receipt Not Found</h2>
          <Link href="/" className="px-6 py-3 bg-brand-dark text-white text-xs font-semibold uppercase tracking-widest">
            RETURN TO HOMEPAGE
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream/30">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        {/* Success Header */}
        <div className="bg-white p-8 md:p-10 rounded-lg border border-brand-border shadow-sm text-center space-y-4 mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <span className="text-xs uppercase tracking-ultra font-bold text-brand-gold block">DAISY HUB RECEIPT</span>
          <h1 className="font-serif-title text-3xl md:text-5xl font-bold text-brand-dark">ORDER CONFIRMED!</h1>
          <p className="text-xs md:text-sm text-brand-muted max-w-md mx-auto">
            Thank you, <span className="font-semibold text-brand-dark">{order.customerName}</span>. Your order has been placed successfully and is being prepared with care.
          </p>
          <div className="inline-flex items-center gap-2 bg-brand-cream px-4 py-2 rounded-full text-xs font-mono font-bold text-brand-dark">
            <span>ORDER NUMBER: {order.orderNumber}</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Shipping Info */}
          <div className="bg-white p-6 rounded-lg border border-brand-border space-y-3">
            <h3 className="font-serif-title text-sm font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
              <Truck size={16} /> SHIPPING INFORMATION
            </h3>
            <div className="text-xs text-brand-muted space-y-1">
              <p className="font-bold text-brand-dark">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.streetAddress}, {order.shippingAddress.landmark}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.district}</p>
              <p>{order.shippingAddress.province}, Nepal</p>
              <p className="pt-2 font-mono">Mobile: {order.shippingAddress.mobile}</p>
            </div>
          </div>

          {/* Payment & Delivery Status */}
          <div className="bg-white p-6 rounded-lg border border-brand-border space-y-3">
            <h3 className="font-serif-title text-sm font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
              <PackageCheck size={16} /> DELIVERY STATUS
            </h3>
            <div className="text-xs space-y-2">
              <div>
                <span className="text-brand-muted block font-semibold mb-1">Status:</span>
                <span className={`font-bold font-mono text-xs px-3 py-1 rounded inline-block border ${
                  order.orderStatus === 'Out for Delivery'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : order.orderStatus === 'Cancelled'
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {order.orderStatus === 'Pending' ? '⏳ PENDING' : order.orderStatus === 'Out for Delivery' ? '🚚 OUT FOR DELIVERY' : '❌ CANCELLED'}
                </span>
              </div>
              <div>
                <span className="text-brand-muted block">Payment Method:</span>
                <span className="font-semibold text-brand-dark uppercase font-mono">{order.paymentMethod} ({order.paymentStatus})</span>
              </div>
              <div>
                <span className="text-brand-muted block">Estimated Delivery:</span>
                <span className="font-semibold text-brand-dark">{order.estimatedDelivery}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Receipt Table */}
        <div className="bg-white p-6 md:p-8 rounded-lg border border-brand-border shadow-sm space-y-6">
          <h3 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-4">
            PURCHASED ITEMS
          </h3>

          <div className="divide-y divide-brand-border">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-4 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 aspect-[3/4] bg-brand-cream rounded overflow-hidden shrink-0">
                    <Image src={item.image} alt={item.productName} fill unoptimized className="object-cover" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-brand-dark">{item.productName}</h4>
                    <p className="text-[11px] text-brand-muted">Color: {item.colorName} | Size: {item.size}</p>
                    <p className="text-[11px] text-brand-muted">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="font-bold text-brand-dark">NPR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-brand-border pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-brand-muted">
              <span>Subtotal</span>
              <span className="font-bold text-brand-dark">NPR {order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-brand-muted">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? 'FREE' : `NPR ${order.shipping}`}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-brand-dark pt-2 border-t border-brand-border">
              <span>TOTAL PAID</span>
              <span className="font-serif-title">NPR {order.total.toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-4">
            <Link
              href={`/track-order?orderId=${order.orderNumber}`}
              className="flex-1 py-3.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest text-center hover:bg-brand-dark/90 flex items-center justify-center gap-2"
            >
              <span>TRACK ORDER STATUS</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              href="/shop"
              className="flex-1 py-3.5 border border-brand-dark text-brand-dark text-xs font-bold uppercase tracking-widest text-center hover:bg-brand-cream"
            >
              CONTINUE SHOPPING
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
