'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';
import { Coupon } from '@/types';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(15);
  const [minOrder, setMinOrder] = useState(2000);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setCoupons(db.getCoupons());
  }, []);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const newCoupon: Coupon = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrder),
      expiryDate: '2026-12-31',
      active: true,
    };

    db.addCoupon(newCoupon);
    setCoupons([...db.getCoupons()]);
    setCode('');
    setMsg(`Coupon "${newCoupon.code}" created successfully!`);
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
            COUPON MANAGER
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">Create promotional discount codes with minimum order constraints.</p>
        </div>
        {msg && <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded">{msg}</span>}
      </div>

      <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
        <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
          CREATE NEW PROMO CODE
        </h2>

        <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-semibold text-brand-dark block mb-1">COUPON CODE *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SUMMER20"
              className="w-full p-2.5 border border-brand-border rounded uppercase font-mono"
            />
          </div>
          <div>
            <label className="font-semibold text-brand-dark block mb-1">DISCOUNT TYPE</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
              className="w-full p-2.5 border border-brand-border rounded bg-white"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (NPR)</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-brand-dark block mb-1">DISCOUNT VALUE *</label>
            <input
              type="number"
              required
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="w-full p-2.5 border border-brand-border rounded font-mono"
            />
          </div>
          <div>
            <label className="font-semibold text-brand-dark block mb-1">MIN ORDER (NPR)</label>
            <input
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(Number(e.target.value))}
              className="w-full p-2.5 border border-brand-border rounded font-mono"
            />
          </div>

          <div className="md:col-span-4 pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-brand-dark/90 flex items-center gap-2"
            >
              <Plus size={16} />
              <span>CREATE COUPON</span>
            </button>
          </div>
        </form>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-lg border border-brand-border shadow-sm p-6">
        <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider mb-4">
          ACTIVE COUPONS LIST
        </h2>
        <table className="w-full text-left text-xs text-brand-dark">
          <thead className="bg-brand-cream uppercase text-[10px] font-bold tracking-wider text-brand-muted">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Min Order</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {coupons.map((c) => (
              <tr key={c.code} className="hover:bg-brand-cream/30">
                <td className="p-3 font-mono font-bold">{c.code}</td>
                <td className="p-3 font-bold text-emerald-700">
                  {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `NPR ${c.discountValue} OFF`}
                </td>
                <td className="p-3 font-mono">NPR {c.minOrderValue.toLocaleString()}</td>
                <td className="p-3 text-brand-muted">{c.expiryDate}</td>
                <td className="p-3">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                    ACTIVE
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
