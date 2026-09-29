'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, Package, ArrowRight } from 'lucide-react';
import { db } from '@/lib/db';
import { Order, Product } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

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
        <h1 className="font-serif-title text-3xl font-bold text-foreground uppercase tracking-wider">
          CONTROL CENTER DASHBOARD
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Real-time store performance, revenue analytics & inventory monitoring.</p>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="shadow-xs hover:border-brand-gold/40 transition-colors">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">TOTAL REVENUE</span>
              <span className="text-2xl font-bold text-foreground font-mono block">NPR {totalRevenue.toLocaleString()}</span>
              <Badge variant="success" className="text-[9px] gap-1 px-1.5 py-0 mt-1 font-semibold">
                <TrendingUp size={11} /> +18.4% this month
              </Badge>
            </div>
            <div className="p-3 bg-secondary rounded-full text-foreground border border-border">
              <DollarSign size={22} className="text-brand-gold" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-brand-gold/40 transition-colors">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">TOTAL ORDERS</span>
              <span className="text-2xl font-bold text-foreground font-mono block">{orders.length}</span>
              <span className="text-[11px] text-muted-foreground block">98% fulfillment rate</span>
            </div>
            <div className="p-3 bg-secondary rounded-full text-foreground border border-border">
              <ShoppingBag size={22} className="text-brand-gold" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-brand-gold/40 transition-colors">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">ACTIVE PRODUCTS</span>
              <span className="text-2xl font-bold text-foreground font-mono block">{products.length}</span>
              <span className="text-[11px] text-muted-foreground block">Across catalog</span>
            </div>
            <div className="p-3 bg-secondary rounded-full text-foreground border border-border">
              <Package size={22} className="text-brand-gold" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs hover:border-brand-gold/40 transition-colors">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">LOW STOCK ALERTS</span>
              <span className="text-2xl font-bold text-destructive font-mono block">{lowStockProducts.length}</span>
              <span className="text-[11px] text-destructive font-semibold block">Requires replenishment</span>
            </div>
            <div className="p-3 bg-destructive/10 rounded-full text-destructive border border-destructive/20">
              <AlertTriangle size={22} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Orders + Low Stock Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders */}
        <Card className="lg:col-span-8 shadow-xs">
          <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-border">
            <div>
              <CardTitle className="text-base uppercase tracking-wider">
                RECENT ORDERS
              </CardTitle>
              <CardDescription className="text-xs">Latest transactions placed across Nepal</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-bold gap-1">
              <Link href="/admin/orders">
                <span>VIEW ALL</span>
                <ArrowRight size={13} />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No customer orders recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.slice(0, 7).map((ord) => (
                    <TableRow key={ord.id}>
                      <TableCell className="font-mono font-bold">{ord.orderNumber}</TableCell>
                      <TableCell className="font-medium">{ord.customerName}</TableCell>
                      <TableCell className="font-bold">NPR {ord.total.toLocaleString()}</TableCell>
                      <TableCell className="font-mono uppercase text-muted-foreground">{ord.paymentMethod}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            ord.orderStatus === 'Out for Delivery'
                              ? 'default'
                              : ord.orderStatus === 'Cancelled'
                              ? 'destructive'
                              : 'warning'
                          }
                          className="font-mono text-[9px]"
                        >
                          {ord.orderStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="lg:col-span-4 shadow-xs">
          <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-border">
            <div>
              <CardTitle className="text-base uppercase tracking-wider">
                LOW STOCK WATCH
              </CardTitle>
              <CardDescription className="text-xs">Items nearing depleted stock</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-bold">
              <Link href="/admin/inventory">
                MANAGE
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">All items have healthy inventory levels.</p>
            ) : (
              lowStockProducts.slice(0, 6).map((p) => {
                const minStock = Math.min(...p.sizes.map((s) => s.stock));
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg border border-border text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground block line-clamp-1">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>
                    </div>
                    <Badge variant="destructive" className="text-[9px] font-bold">
                      {minStock} LEFT
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
