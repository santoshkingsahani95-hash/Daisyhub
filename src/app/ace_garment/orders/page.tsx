'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingBag,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  ExternalLink,
  X,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  Filter,
  Copy,
  Check,
  Zap,
  Download,
} from 'lucide-react';
import { db } from '@/lib/db';
import { Order, OrderStatus } from '@/types';

type DateFilterType = 'all' | 'today' | 'yesterday' | 'this_month' | 'custom';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Google Sheet Link State
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(
    'https://docs.google.com/spreadsheets/u/0/'
  );
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isConfiguringSheet, setIsConfiguringSheet] = useState(false);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Script copy feedback
  const [copiedScript, setCopiedScript] = useState(false);

  const loadOrders = () => {
    setOrders(db.getOrders());
  };

  useEffect(() => {
    loadOrders();
    const storedUrl = localStorage.getItem('ace_google_sheet_url');
    if (storedUrl) setGoogleSheetUrl(storedUrl);

    const storedWebhook = localStorage.getItem('ace_google_sheet_webhook');
    if (storedWebhook) setWebhookUrl(storedWebhook);

    const handleDbUpdate = () => loadOrders();
    window.addEventListener('ace-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    const interval = setInterval(loadOrders, 3000);
    return () => {
      window.removeEventListener('ace-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleSaveSheetConfig = () => {
    localStorage.setItem('ace_google_sheet_url', googleSheetUrl);
    localStorage.setItem('ace_google_sheet_webhook', webhookUrl);
    setIsConfiguringSheet(false);
    setMsg('Google Sheet link & Auto-Sync settings updated!');
    setTimeout(() => setMsg(''), 3500);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const updated = db.updateOrderStatus(orderId, newStatus);
    if (updated) {
      loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          orderStatus: newStatus,
        });
      }
      setMsg(`Order status successfully updated to "${newStatus}"!`);
      setTimeout(() => setMsg(''), 3500);
    }
  };

  // Date Filtering Logic
  const filteredOrders = orders.filter((ord) => {
    const orderDate = new Date(ord.createdAt);
    const now = new Date();

    if (dateFilter === 'today') {
      return (
        orderDate.getDate() === now.getDate() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }

    if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return (
        orderDate.getDate() === yesterday.getDate() &&
        orderDate.getMonth() === yesterday.getMonth() &&
        orderDate.getFullYear() === yesterday.getFullYear()
      );
    }

    if (dateFilter === 'this_month') {
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }

    if (dateFilter === 'custom') {
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (orderDate < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (orderDate > to) return false;
      }
      return true;
    }

    return true; // 'all'
  });

  // Status priority sorting: Pending at TOP; Out for Delivery & Cancelled at BOTTOM
  const statusPriority: Record<string, number> = {
    Pending: 0,
    'Out for Delivery': 1,
    Cancelled: 2,
  };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const priorityA = statusPriority[a.orderStatus || 'Pending'] ?? 0;
    const priorityB = statusPriority[b.orderStatus || 'Pending'] ?? 0;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      alert('No orders available in the selected date filter to export.');
      return;
    }

    const headers = [
      'Order Number',
      'Date & Time',
      'Customer Name',
      'Mobile Number',
      'Email Address',
      'Street Address',
      'City',
      'District',
      'Province',
      'Landmark',
      'Purchased Clothing Items',
      'Total Amount (NPR)',
      'Payment Method',
      'Payment Status',
      'Order Status',
    ];

    const rows = sortedOrders.map((ord) => {
      const itemsFormatted = ord.items
        .map((i) => `${i.productName} (${i.size}, ${i.colorName}) x${i.quantity}`)
        .join(' | ');

      const formattedDate = `${new Date(ord.createdAt).toLocaleDateString()} ${new Date(
        ord.createdAt
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      return [
        ord.orderNumber,
        formattedDate,
        ord.customerName,
        ord.customerMobile,
        ord.customerEmail || '',
        ord.shippingAddress?.streetAddress || '',
        ord.shippingAddress?.city || '',
        ord.shippingAddress?.district || '',
        ord.shippingAddress?.province || '',
        ord.shippingAddress?.landmark || '',
        itemsFormatted,
        ord.total,
        ord.paymentMethod ? ord.paymentMethod.toUpperCase() : '',
        ord.paymentStatus ? ord.paymentStatus.toUpperCase() : '',
        ord.orderStatus || 'Pending',
      ];
    });

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent =
      '\ufeff' +
      [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const filterLabel = dateFilter === 'all' ? 'All' : dateFilter.replace('_', '-');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `AceGarment_Orders_${filterLabel}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMsg(`Exported ${sortedOrders.length} order(s) (${dateFilter.replace('_', ' ').toUpperCase()}) to Excel sheet!`);
    setTimeout(() => setMsg(''), 4000);
  };

  const appScriptCode = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.orderNumber,
    data.createdAt,
    data.customerName,
    data.customerMobile,
    data.customerEmail,
    data.address,
    data.items,
    data.total,
    data.paymentMethod
  ]);
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-brand-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
              ORDERS MANAGEMENT
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              LIVE GOOGLE SHEET AUTO-SYNC
            </span>
          </div>
          <p className="text-xs text-brand-muted mt-1">
            Filter customer orders by date & automatically sync new orders straight into Google Sheets without re-entry.
          </p>
        </div>

        {/* Direct Google Sheet Link Button & Config */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow flex items-center gap-2 transition-all cursor-pointer"
            title="Download Excel Sheet for currently filtered orders"
          >
            <Download size={18} />
            <span>CREATE EXCEL SHEET ({filteredOrders.length})</span>
          </button>

          <a
            href={googleSheetUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-3 bg-brand-dark hover:bg-brand-accent text-white text-xs font-bold uppercase tracking-wider rounded shadow flex items-center gap-2 transition-all"
            title="Open linked Google Sheet in new tab"
          >
            <FileSpreadsheet size={18} />
            <span>OPEN GOOGLE SHEET ↗</span>
          </a>

          <button
            onClick={() => setIsConfiguringSheet(!isConfiguringSheet)}
            className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-brand-dark border border-brand-border rounded hover:bg-brand-cream transition-colors flex items-center gap-1.5"
            title="Configure Google Sheet Link & Auto-Sync"
          >
            <Zap size={14} className="text-brand-gold" />
            <span>SHEET SETTINGS</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{msg}</span>
        </div>
      )}

      {/* Google Sheet Config & Webhook Drawer */}
      {isConfiguringSheet && (
        <div className="p-6 bg-white border border-brand-border rounded-lg space-y-5 text-xs shadow-md">
          <div className="flex justify-between items-center pb-3 border-b border-brand-border">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-emerald-700" />
              <h3 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
                GOOGLE SHEET AUTOMATIC SYNC SETUP
              </h3>
            </div>
            <button onClick={() => setIsConfiguringSheet(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-brand-dark block mb-1">1. GOOGLE SHEET DIRECT LINK *</label>
              <input
                type="url"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full p-2.5 border border-brand-border rounded text-xs font-mono bg-brand-cream/30"
              />
              <p className="text-[10px] text-brand-muted mt-1">
                Clicking &quot;OPEN GOOGLE SHEET ↗&quot; will directly open this spreadsheet.
              </p>
            </div>

            <div>
              <label className="font-bold text-brand-dark block mb-1">
                2. GOOGLE APPS SCRIPT WEBHOOK URL (OPTIONAL FOR AUTOMATIC INSTANT SYNC)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full p-2.5 border border-brand-border rounded text-xs font-mono bg-brand-cream/30"
              />
              <p className="text-[10px] text-brand-muted mt-1">
                Every new order automatically posts to this Webhook so you never have to re-enter orders manually!
              </p>
            </div>
          </div>

          {/* Automatic Apps Script Setup Box */}
          <div className="p-4 bg-brand-cream/40 border border-brand-border rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-brand-dark text-xs uppercase tracking-wider">
                HOW TO GET AUTOMATIC REAL-TIME SYNC IN 30 SECONDS:
              </span>
              <button
                onClick={handleCopyScript}
                className="px-3 py-1 bg-brand-dark text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-brand-dark/90"
              >
                {copiedScript ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedScript ? 'COPIED!' : 'COPY SCRIPT CODE'}</span>
              </button>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-brand-muted">
              <li>In your Google Sheet, click <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Paste the copied script code into the editor and click <strong>Deploy &gt; New deployment</strong>.</li>
              <li>Select <strong>Web app</strong>, set &quot;Who has access&quot; to <strong>Anyone</strong>, and click Deploy.</li>
              <li>Copy the Web app URL and paste it into field #2 above!</li>
            </ol>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsConfiguringSheet(false)}
              className="px-4 py-2 border border-brand-border text-brand-dark font-semibold rounded"
            >
              CANCEL
            </button>
            <button
              onClick={handleSaveSheetConfig}
              className="px-5 py-2 bg-brand-dark text-white font-bold rounded uppercase tracking-wider"
            >
              SAVE SETTINGS
            </button>
          </div>
        </div>
      )}

      {/* ORDERS SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg border border-brand-border shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">TOTAL ORDERS</span>
          <div className="flex items-baseline justify-between">
            <span className="font-serif-title text-2xl font-bold text-brand-dark">{orders.length}</span>
            <span className="text-[10px] font-bold text-brand-gold font-mono">({filteredOrders.length} filtered)</span>
          </div>
        </div>

        <div className="bg-amber-50/80 p-4 rounded-lg border border-amber-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">⏳ PENDING</span>
          <span className="font-serif-title text-2xl font-bold text-amber-900">
            {orders.filter((o) => o.orderStatus === 'Pending' || !o.orderStatus).length}
          </span>
        </div>

        <div className="bg-purple-50/80 p-4 rounded-lg border border-purple-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">🚚 OUT FOR DELIVERY</span>
          <span className="font-serif-title text-2xl font-bold text-purple-900">
            {orders.filter((o) => o.orderStatus === 'Out for Delivery').length}
          </span>
        </div>

        <div className="bg-rose-50/80 p-4 rounded-lg border border-rose-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">❌ CANCELLED</span>
          <span className="font-serif-title text-2xl font-bold text-rose-900">
            {orders.filter((o) => o.orderStatus === 'Cancelled').length}
          </span>
        </div>
      </div>

      {/* DATE FILTERING BAR */}
      <div className="bg-white p-4 rounded-lg border border-brand-border shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-brand-gold" />
            <span className="font-bold text-xs text-brand-dark uppercase tracking-wider">FILTER ORDERS BY DATE:</span>
          </div>

          {/* Quick Date Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Date Select' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id as DateFilterType)}
                className={`px-3.5 py-1.5 rounded font-bold uppercase tracking-wider transition-all text-[11px] ${
                  dateFilter === tab.id
                    ? 'bg-brand-dark text-white shadow'
                    : 'bg-brand-cream/60 text-brand-dark hover:bg-brand-cream border border-brand-border/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Inputs (Visible when 'custom' is selected) */}
        {dateFilter === 'custom' && (
          <div className="pt-3 border-t border-brand-border flex flex-wrap items-center gap-4 text-xs bg-brand-cream/30 p-3 rounded">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-brand-dark uppercase tracking-wider text-[11px]">FROM DATE:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="p-2 border border-brand-border rounded font-mono bg-white text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-brand-dark uppercase tracking-wider text-[11px]">TO DATE:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="p-2 border border-brand-border rounded font-mono bg-white text-xs"
              />
            </div>

            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-xs text-rose-600 font-semibold underline hover:text-rose-800"
              >
                Reset Range
              </button>
            )}
          </div>
        )}
      </div>

      {/* Orders Table Display */}
      <div className="bg-white rounded-lg border border-brand-border shadow-sm p-6 overflow-x-auto space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-brand-border text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-dark uppercase tracking-wider">
              SHOWING {filteredOrders.length} OF {orders.length} TOTAL ORDERS
            </span>
            {dateFilter !== 'all' && (
              <span className="text-brand-gold font-bold uppercase text-[10px] bg-brand-gold/10 px-2 py-0.5 rounded font-mono">
                FILTER ACTIVE: {dateFilter.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold uppercase tracking-wider rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>EXPORT {dateFilter.replace('_', ' ').toUpperCase()} TO EXCEL SHEET</span>
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-brand-muted space-y-2">
            <Calendar size={36} className="mx-auto stroke-1 text-brand-muted/40" />
            <p className="font-serif-title text-base font-bold text-brand-dark">No orders match the selected date filter.</p>
            <button
              onClick={() => {
                setDateFilter('all');
                setFromDate('');
                setToDate('');
              }}
              className="text-xs font-bold text-brand-gold uppercase tracking-wider underline"
            >
              Reset All Date Filters
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-brand-dark">
            <thead className="bg-brand-cream uppercase text-[10px] font-bold tracking-wider text-brand-muted">
              <tr>
                <th className="p-3">Order Number</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Customer Details</th>
                <th className="p-3">Clothing Items Purchased</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Order Status</th>
                <th className="p-3 text-right">View Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {sortedOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-brand-dark">{ord.orderNumber}</td>
                  <td className="p-3 text-brand-muted font-sans text-[11px]">
                    {new Date(ord.createdAt).toLocaleDateString()}
                    <span className="block text-[10px] text-brand-muted/70">
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold block text-brand-dark">{ord.customerName}</span>
                    <span className="text-[10px] text-brand-muted font-mono">{ord.customerMobile}</span>
                  </td>
                  <td className="p-3 text-brand-dark">
                    <div className="space-y-1">
                      {ord.items.map((i, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0" />
                          <span className="font-medium line-clamp-1">{i.productName}</span>
                          <span className="text-[10px] font-bold font-mono text-brand-muted bg-brand-cream px-1.5 py-0.2 rounded">
                            {i.size} • {i.colorName} x{i.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 font-bold text-sm text-brand-dark">
                    <span>NPR {ord.total.toLocaleString()}</span>
                    <span className="block text-[10px] text-brand-muted font-normal">
                      Items: NPR {(ord.subtotal || 0).toLocaleString()} + Delivery: NPR {ord.shipping || 0}
                      {ord.discount ? ` - Disc: NPR ${ord.discount}` : ''}
                    </span>
                  </td>
                  <td className="p-3">
                    {ord.paymentMethod === 'fonepay' ? (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-800 border border-red-200 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        FONEPAY
                      </span>
                    ) : ord.paymentMethod === 'cod' ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        💵 COD (CASH)
                      </span>
                    ) : ord.paymentMethod === 'esewa' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        💚 ESEWA
                      </span>
                    ) : ord.paymentMethod === 'khalti' ? (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        🟣 KHALTI
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 font-mono font-bold text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        💳 {ord.paymentMethod ? ord.paymentMethod.toUpperCase() : 'CARD'}
                      </span>
                    )}
                    <span className={`block text-[10px] font-bold uppercase mt-1 ${
                      ord.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-600'
                    }`}>
                      {ord.paymentStatus === 'paid' ? `✓ PAID: NPR ${ord.total.toLocaleString()}` : `⏳ COD DUE: NPR ${ord.total.toLocaleString()}`}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={ord.orderStatus || 'Pending'}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                      className={`px-2 py-1 rounded text-xs font-bold font-mono border focus:outline-none cursor-pointer transition-all shadow-xs ${
                        ord.orderStatus === 'Out for Delivery'
                          ? 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200'
                          : ord.orderStatus === 'Cancelled'
                          ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                          : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                      }`}
                    >
                      <option value="Pending">⏳ Pending</option>
                      <option value="Out for Delivery">🚚 Out for Delivery</option>
                      <option value="Cancelled">❌ Cancelled</option>
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedOrder(ord)}
                      className="px-3 py-1.5 bg-brand-dark text-white hover:bg-brand-gold text-[11px] font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1 shadow-xs"
                      title="View Full Purchased Clothes & Address Details"
                    >
                      <Eye size={14} />
                      <span>VIEW DETAIL</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FULL ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl z-10 p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-brand-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-ultra text-brand-gold">
                  ORDER SPECIFICATION & PURCHASED CLOTHES
                </span>
                <h3 className="font-serif-title text-2xl font-bold text-brand-dark">
                  {selectedOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-brand-dark hover:bg-brand-cream rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Customer & Address Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-cream/40 p-4 rounded border border-brand-border text-xs">
              <div className="space-y-1.5">
                <span className="font-bold text-brand-dark uppercase tracking-wider block text-[10px] text-brand-gold">
                  CUSTOMER INFO
                </span>
                <p className="font-bold text-brand-dark flex items-center gap-1.5">
                  <User size={14} className="text-brand-muted" />
                  <span>{selectedOrder.customerName}</span>
                </p>
                <p className="text-brand-muted flex items-center gap-1.5 font-mono">
                  <Phone size={14} className="text-brand-muted" />
                  <span>{selectedOrder.customerMobile}</span>
                </p>
                <p className="text-brand-muted flex items-center gap-1.5 font-mono">
                  <Mail size={14} className="text-brand-muted" />
                  <span>{selectedOrder.customerEmail}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-brand-dark uppercase tracking-wider block text-[10px] text-brand-gold">
                  DELIVERY LOCATION & METHOD
                </span>
                <p className="font-bold text-brand-dark flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-muted shrink-0" />
                  <span>{selectedOrder.shippingAddress?.streetAddress || 'Address Provided'}</span>
                </p>
                <p className="text-brand-muted pl-5 font-semibold">
                  District: <strong className="text-brand-dark">{selectedOrder.shippingAddress?.district || 'Kathmandu'}</strong> ({selectedOrder.shippingAddress?.province || 'Bagmati Province'})
                </p>
                <p className="text-brand-muted pl-5 text-[11px]">
                  City/Tole: {selectedOrder.shippingAddress?.city || 'Kathmandu'}
                </p>
                {selectedOrder.shippingAddress?.landmark && (
                  <p className="text-brand-muted pl-5 text-[11px] italic">
                    Landmark: {selectedOrder.shippingAddress.landmark}
                  </p>
                )}
                <div className="pl-5 pt-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    selectedOrder.deliveryType === 'branch' || selectedOrder.shippingAddress?.deliveryType === 'branch'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {selectedOrder.deliveryType === 'branch' || selectedOrder.shippingAddress?.deliveryType === 'branch'
                      ? '🏬 BRANCH / COUNTER PICKUP'
                      : '🚚 HOME DELIVERY'}
                  </span>
                </div>
              </div>
            </div>

            {/* Purchased Clothes List */}
            <div className="space-y-3">
              <h4 className="font-serif-title text-sm font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-2">
                PURCHASED CLOTHING ITEMS ({selectedOrder.items.length})
              </h4>

              <div className="divide-y divide-brand-border">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 aspect-[3/4] bg-brand-cream rounded overflow-hidden shrink-0 border border-brand-border">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.productName}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <ShoppingBag size={20} className="m-auto text-brand-muted" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h5 className="font-bold text-brand-dark text-sm">{item.productName}</h5>
                        <div className="flex items-center gap-2 text-[11px] text-brand-muted font-medium">
                          <span>Color: <strong className="text-brand-dark">{item.colorName}</strong></span>
                          <span>•</span>
                          <span>Size: <strong className="text-brand-dark font-mono">{item.size}</strong></span>
                        </div>
                        <p className="text-[11px] text-brand-muted font-mono">Quantity: {item.quantity} unit(s)</p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-brand-dark block text-sm">
                        NPR {(item.price * item.quantity).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-brand-muted">
                        (NPR {item.price.toLocaleString()} each)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Order Summary */}
            <div className="p-4 bg-brand-cream/30 border border-brand-border rounded space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-brand-border/60">
                <span className="font-bold text-brand-dark uppercase tracking-wider text-[11px]">UPDATE ORDER STATUS:</span>
                <select
                  value={selectedOrder.orderStatus || 'Pending'}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                  className={`px-3 py-1.5 rounded text-xs font-bold font-mono border focus:outline-none cursor-pointer transition-all shadow-xs ${
                    selectedOrder.orderStatus === 'Out for Delivery'
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : selectedOrder.orderStatus === 'Cancelled'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  <option value="Pending">⏳ Pending</option>
                  <option value="Out for Delivery">🚚 Out for Delivery</option>
                  <option value="Cancelled">❌ Cancelled</option>
                </select>
              </div>

              <div className="flex justify-between text-brand-muted">
                <span>Payment Method</span>
                <span className="font-mono uppercase font-bold text-brand-dark bg-brand-cream/80 px-2 py-0.5 rounded border border-brand-border/60">
                  {selectedOrder.paymentMethod === 'fonepay'
                    ? '🔴 FONEPAY QR / MOBILE BANKING'
                    : selectedOrder.paymentMethod === 'cod'
                    ? '💵 CASH ON DELIVERY (COD)'
                    : (selectedOrder.paymentMethod || 'ONLINE').toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between text-brand-muted">
                <span>Payment Status</span>
                <span className={`font-mono uppercase font-bold px-2 py-0.5 rounded ${
                  selectedOrder.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}>
                  {selectedOrder.paymentStatus === 'paid' ? '✓ PAID & CONFIRMED' : '⏳ PENDING / DUE ON ARRIVAL'}
                </span>
              </div>

              <div className="flex justify-between text-brand-muted">
                <span>Order Date & Time</span>
                <span className="font-mono text-brand-dark">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>

              <div className="pt-2 border-t border-brand-border space-y-1.5">
                <div className="flex justify-between text-brand-muted">
                  <span>Items Subtotal</span>
                  <span className="font-mono font-semibold text-brand-dark">NPR {(selectedOrder.subtotal || 0).toLocaleString()}</span>
                </div>

                {Boolean(selectedOrder.discount) && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount</span>
                    <span className="font-mono font-semibold">- NPR {(selectedOrder.discount || 0).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-brand-muted">
                  <span>Delivery Charge ({selectedOrder.shippingAddress?.district || 'District'})</span>
                  <span className="font-mono font-semibold text-brand-dark">
                    {selectedOrder.shipping === 0 ? 'FREE' : `NPR ${(selectedOrder.shipping || 0).toLocaleString()}`}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-dark flex justify-between font-bold text-brand-dark text-base bg-brand-cream/50 p-3 rounded">
                <span>TOTAL PAID / PAYABLE AMOUNT:</span>
                <span className="font-mono text-lg text-emerald-800">NPR {selectedOrder.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-end gap-3 pt-2">
              <Link
                href={`/order-confirmation/${selectedOrder.id}`}
                target="_blank"
                className="px-4 py-2.5 border border-brand-border text-brand-dark hover:bg-brand-cream text-xs font-bold uppercase tracking-wider rounded"
              >
                PRINT / VIEW RECEIPT ↗
              </Link>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded"
              >
                CLOSE DETAIL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
