'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import { db } from '@/lib/db';
import { Order, Product } from '@/types';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = () => {
    setOrders(db.getOrders());
    setProducts(db.getProducts());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('ace-db-updated', loadData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('ace-db-updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const lowStockProducts = products.filter((p) => p.sizes.some((s) => s.stock < 5));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
          ADMIN DASHBOARD
        </h1>
        <p className="text-xs text-brand-muted mt-1">Real-time store performance, revenue analytics & low stock monitoring.</p>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block">TOTAL REVENUE</span>
            <span className="text-2xl font-bold text-brand-dark font-mono mt-1 block">NPR {totalRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> +18.4% this month
            </span>
          </div>
          <div className="p-3 bg-brand-cream rounded-full text-brand-dark">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block">TOTAL ORDERS</span>
            <span className="text-2xl font-bold text-brand-dark font-mono mt-1 block">{orders.length}</span>
            <span className="text-[10px] text-brand-muted mt-1 block">98% fulfillment rate</span>
          </div>
          <div className="p-3 bg-brand-cream rounded-full text-brand-dark">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block">ACTIVE PRODUCTS</span>
            <span className="text-2xl font-bold text-brand-dark font-mono mt-1 block">{products.length}</span>
            <span className="text-[10px] text-brand-muted mt-1 block">Across 4 categories</span>
          </div>
          <div className="p-3 bg-brand-cream rounded-full text-brand-dark">
            <Package size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider block">LOW STOCK ALERTS</span>
            <span className="text-2xl font-bold text-brand-sale font-mono mt-1 block">{lowStockProducts.length}</span>
            <span className="text-[10px] text-brand-sale font-semibold mt-1 block">Requires restocking</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-full text-brand-sale">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Orders + Low Stock Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-8 bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-4">
            <h3 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
              RECENT ORDERS
            </h3>
            <Link href="/ace_garment/orders" className="text-xs font-bold text-brand-dark hover:underline">
              VIEW ALL →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-brand-dark">
              <thead className="bg-brand-cream/60 uppercase text-[10px] font-bold tracking-wider text-brand-muted">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-brand-cream/30">
                    <td className="p-3 font-mono font-bold">{ord.orderNumber}</td>
                    <td className="p-3 font-medium">{ord.customerName}</td>
                    <td className="p-3 font-bold">NPR {ord.total.toLocaleString()}</td>
                    <td className="p-3 font-mono uppercase">{ord.paymentMethod}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase border ${
                        ord.orderStatus === 'Out for Delivery'
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : ord.orderStatus === 'Cancelled'
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {ord.orderStatus === 'Pending' ? '⏳ PENDING' : ord.orderStatus === 'Out for Delivery' ? '🚚 OUT FOR DELIVERY' : '❌ CANCELLED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-4 bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-4">
            <h3 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
              LOW STOCK WATCHLIST
            </h3>
            <Link href="/ace_garment/inventory" className="text-xs font-bold text-brand-dark hover:underline">
              MANAGE
            </Link>
          </div>

          <div className="space-y-3">
            {lowStockProducts.slice(0, 5).map((p) => {
              const minStock = Math.min(...p.sizes.map((s) => s.stock));
              return (
                <div key={p.id} className="flex items-center justify-between p-3 bg-brand-cream/40 rounded border border-brand-border/60 text-xs">
                  <div>
                    <span className="font-semibold text-brand-dark block line-clamp-1">{p.name}</span>
                    <span className="text-[10px] text-brand-muted font-mono">{p.sku}</span>
                  </div>
                  <span className="bg-rose-100 text-brand-sale text-[10px] font-bold px-2 py-0.5 rounded">
                    {minStock} LEFT
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
