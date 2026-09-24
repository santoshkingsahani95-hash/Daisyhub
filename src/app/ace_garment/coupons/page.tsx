'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, CheckCircle2, Trash2, ToggleLeft, ToggleRight, Calendar, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { Coupon } from '@/types';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrder, setMinOrder] = useState<number>(2000);
  const [expiryDate, setExpiryDate] = useState<string>('2026-12-31');
  const [msg, setMsg] = useState('');

  const loadCoupons = () => {
    setCoupons([...db.getCoupons()]);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const newCoupon: Coupon = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrder),
      expiryDate: expiryDate || '2026-12-31',
      active: true,
    };

    db.addCoupon(newCoupon);
    loadCoupons();
    setCode('');
    setMsg(`Coupon "${newCoupon.code}" saved successfully!`);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleToggleStatus = (couponCode: string) => {
    const updated = db.toggleCouponStatus(couponCode);
    loadCoupons();
    if (updated) {
      setMsg(`Coupon "${couponCode}" status changed to ${updated.active ? 'ACTIVE' : 'INACTIVE'}`);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleDeleteCoupon = (couponCode: string) => {
    if (confirm(`Are you sure you want to delete coupon code "${couponCode}"?`)) {
      db.deleteCoupon(couponCode);
      loadCoupons();
      setMsg(`Coupon "${couponCode}" deleted successfully.`);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-brand-border shadow-xs">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
            COUPON MANAGER
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">Create, activate, deactivate, or delete promotional discount codes.</p>
        </div>
        {msg && (
          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded shadow-xs flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{msg}</span>
          </span>
        )}
      </div>

      {/* Form */}
      <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
        <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
          CREATE OR UPDATE PROMO CODE
        </h2>

        <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="font-semibold text-brand-dark block mb-1">COUPON CODE *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. SUMMER20"
              className="w-full p-2.5 border border-brand-border rounded uppercase font-mono text-xs focus:outline-none focus:border-brand-dark"
            />
          </div>

          <div>
            <label className="font-semibold text-brand-dark block mb-1">DISCOUNT TYPE</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
              className="w-full p-2.5 border border-brand-border rounded bg-white text-xs focus:outline-none"
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
              min={1}
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="w-full p-2.5 border border-brand-border rounded font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-brand-dark block mb-1">MIN ORDER (NPR)</label>
            <input
              type="number"
              min={0}
              value={minOrder}
              onChange={(e) => setMinOrder(Number(e.target.value))}
              className="w-full p-2.5 border border-brand-border rounded font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-brand-dark block mb-1">EXPIRY DATE *</label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full p-2.5 border border-brand-border rounded font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="md:col-span-5 pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-brand-dark/90 flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} />
              <span>SAVE PROMO CODE</span>
            </button>
            <span className="text-[11px] text-brand-muted">
              Note: If coupon code already exists, saving will update its details & keep it valid until expiry date.
            </span>
          </div>
        </form>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-lg border border-brand-border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
            ALL PROMO COUPONS ({coupons.length})
          </h2>
        </div>

        {coupons.length === 0 ? (
          <div className="text-center py-12 text-brand-muted space-y-2">
            <Tag size={32} className="mx-auto stroke-1 text-brand-muted/40" />
            <p className="font-serif-title font-bold text-brand-dark">No coupons created yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-brand-dark">
              <thead className="bg-brand-cream uppercase text-[10px] font-bold tracking-wider text-brand-muted">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Min Order</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {coupons.map((c) => {
                  const isExpired = c.expiryDate ? new Date(c.expiryDate) < new Date(new Date().setHours(0, 0, 0, 0)) : false;

                  return (
                    <tr key={c.code} className="hover:bg-brand-cream/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-brand-dark flex items-center gap-1.5">
                        <Tag size={14} className="text-brand-gold shrink-0" />
                        <span>{c.code}</span>
                      </td>
                      <td className="p-3 font-bold text-emerald-700">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `NPR ${c.discountValue.toLocaleString()} OFF`}
                      </td>
                      <td className="p-3 font-mono">NPR {c.minOrderValue.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar size={12} className="text-brand-muted" />
                          <span className={isExpired ? 'text-rose-600 font-bold line-through' : 'text-brand-dark'}>
                            {c.expiryDate}
                          </span>
                          {isExpired && (
                            <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1 rounded uppercase">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleStatus(c.code)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer transition-all border ${
                            c.active && !isExpired
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Click to toggle active/inactive status"
                        >
                          {c.active && !isExpired ? (
                            <>
                              <ToggleRight size={14} className="text-emerald-600" />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={14} className="text-amber-600" />
                              <span>INACTIVE</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(c.code)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 text-[10px] font-bold rounded transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Delete this coupon"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
