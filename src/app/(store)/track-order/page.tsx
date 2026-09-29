'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, CheckCircle2, Truck, Package, Clock, MapPin } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { db } from '@/lib/db';
import { Order } from '@/types';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialNum = searchParams.get('orderId') || 'ACE-884910';

  const [orderQuery, setOrderQuery] = useState(initialNum);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const steps = ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Completed'];

  const refreshOrder = async (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : orderQuery).trim();
    if (!q) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders?id=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.order) {
        setActiveOrder(json.order);
        setIsLoading(false);
        return;
      }
    } catch { }

    const found = db.getOrderById(q);
    setActiveOrder(found || null);
    setIsLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;
    refreshOrder(orderQuery);
    setSearched(true);
  };

  useEffect(() => {
    if (initialNum) {
      refreshOrder(initialNum);
      setSearched(true);
    }
  }, [initialNum]);

  useEffect(() => {
    const handleDbUpdate = (e: Event) => {
      const key = (e as CustomEvent)?.detail?.key;
      if (!key || key === 'all' || key === 'orders' || key === 'ace_db_orders') {
        refreshOrder();
      }
    };
    window.addEventListener('ace-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('ace-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, [orderQuery]);

  const getStepIndex = (status?: string) => {
    if (!status) return 0;
    if (status === 'Pending') return 0;
    if (status === 'Processing') return 1;
    if (status === 'Shipped') return 2;
    if (status === 'Out for Delivery') return 3;
    if (status === 'Completed') return 4;
    if (status === 'Cancelled') return -1;
    return 0;
  };

  const currentStepIndex = activeOrder ? getStepIndex(activeOrder.orderStatus) : 0;
  const isCancelled = activeOrder?.orderStatus === 'Cancelled';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-ultra text-brand-gold">LIVE LOGISTICS TRACKER</span>
          <h1 className="font-serif-title text-3xl md:text-5xl font-bold text-brand-dark">TRACK YOUR ORDER</h1>
          <p className="text-xs text-brand-muted">Enter your Daisy Hub order number to view real-time delivery timeline.</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto mb-12 flex">
          <input
            type="text"
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            placeholder="e.g. ACE-433765 or ord-433765"
            className="flex-1 p-3.5 border border-brand-border rounded-l text-xs font-mono uppercase focus:outline-none focus:border-brand-dark"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded-r hover:bg-brand-dark/90 flex items-center gap-1 disabled:opacity-50"
          >
            <Search size={14} />
            <span>{isLoading ? 'SEARCHING...' : 'TRACK'}</span>
          </button>
        </form>

        {/* Results */}
        {searched && !activeOrder && !isLoading && (
          <div className="text-center py-16 border border-dashed border-brand-border rounded">
            <Clock size={36} className="mx-auto text-brand-muted/40 mb-3" />
            <p className="font-serif-title text-lg font-bold text-brand-dark">Order &quot;{orderQuery}&quot; not found</p>
            <p className="text-xs text-brand-muted mt-1">Please verify your order number in your confirmation email or receipt.</p>
          </div>
        )}

        {activeOrder && (
          <div className="space-y-8 bg-brand-cream/40 p-6 md:p-10 rounded-lg border border-brand-border shadow-xs">
            {/* Order Header Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-brand-border text-xs">
              <div>
                <span className="text-brand-muted uppercase tracking-widest font-semibold block text-[10px]">ORDER NUMBER</span>
                <span className="font-mono text-base font-bold text-brand-dark">{activeOrder.orderNumber}</span>
              </div>

              <div>
                <span className="text-brand-muted uppercase tracking-widest font-semibold block text-[10px]">LIVE STATUS</span>
                <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded inline-block mt-0.5 border ${
                  activeOrder.orderStatus === 'Completed'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : activeOrder.orderStatus === 'Out for Delivery'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : activeOrder.orderStatus === 'Shipped'
                    ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                    : activeOrder.orderStatus === 'Processing'
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : activeOrder.orderStatus === 'Cancelled'
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {activeOrder.orderStatus === 'Completed'
                    ? '✅ COMPLETED'
                    : activeOrder.orderStatus === 'Out for Delivery'
                    ? '🚚 OUT FOR DELIVERY'
                    : activeOrder.orderStatus === 'Shipped'
                    ? '📦 SHIPPED'
                    : activeOrder.orderStatus === 'Processing'
                    ? '⚙️ PROCESSING'
                    : activeOrder.orderStatus === 'Cancelled'
                    ? '❌ CANCELLED'
                    : '⏳ PENDING'}
                </span>
              </div>

              <div>
                <span className="text-brand-muted uppercase tracking-widest font-semibold block text-[10px]">CUSTOMER</span>
                <span className="font-bold text-brand-dark block">{activeOrder.customerName}</span>
                <span className="text-[11px] font-mono text-brand-muted">{activeOrder.customerMobile}</span>
              </div>

              <div>
                <span className="text-brand-muted uppercase tracking-widest font-semibold block text-[10px]">ESTIMATED DELIVERY</span>
                <span className="font-bold text-emerald-800">{activeOrder.estimatedDelivery || '3-5 Business Days'}</span>
              </div>
            </div>

            {/* Cancelled Alert State */}
            {isCancelled ? (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-md text-xs space-y-1">
                <span className="font-bold uppercase tracking-wider block text-rose-700">❌ THIS ORDER WAS CANCELLED</span>
                <p className="text-[11px] text-rose-800">
                  This order has been cancelled by customer request or store management. Inventory has been restored.
                </p>
              </div>
            ) : (
              /* Visual Timeline Bar */
              <div className="py-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-dark mb-8">DELIVERY PROGRESS TIMELINE</h3>
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
                  {/* Horizontal Progress Line on Desktop */}
                  <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-brand-border -z-0" />

                  {steps.map((stepName, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;

                    return (
                      <div key={stepName} className="relative z-10 flex md:flex-col items-center gap-3 md:gap-2 text-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCompleted
                              ? 'bg-brand-dark text-white shadow-md'
                              : 'bg-white text-brand-muted border-2 border-brand-border'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <div className="text-left md:text-center">
                          <span className={`text-xs block font-medium ${isCurrent ? 'font-bold text-brand-dark' : isCompleted ? 'text-brand-dark' : 'text-brand-muted'}`}>
                            {stepName}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">IN PROGRESS</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Items List */}
            <div className="pt-6 border-t border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-dark">PACKAGE CONTENT ({activeOrder.items.length})</h3>
                <Link
                  href={`/order-confirmation/${activeOrder.id}`}
                  target="_blank"
                  className="text-xs font-bold text-brand-gold hover:underline uppercase tracking-wider"
                >
                  VIEW / PRINT RECEIPT ↗
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOrder.items.map((item, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded border border-brand-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <Package size={20} className="text-brand-dark shrink-0" />
                      <div>
                        <span className="font-semibold text-brand-dark block">{item.productName}</span>
                        <span className="text-brand-muted text-[11px]">{item.colorName} / Size: {item.size} x {item.quantity}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-brand-dark">NPR {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-serif-title">Loading tracking center...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
