'use client';

import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Save, Search, CheckCircle2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { db } from '@/lib/db';
import { DistrictDeliveryRate } from '@/types';
import { NEPAL_PROVINCES, generateDefaultDeliveryRates } from '@/lib/nepal-locations';

export default function AdminDeliveryRatesPage() {
  const [rates, setRates] = useState<DistrictDeliveryRate[]>([]);
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updateMsg, setUpdateMsg] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const isDirtyRef = React.useRef(false);
  isDirtyRef.current = isDirty;

  // Bulk Apply Form State
  const [bulkProvince, setBulkProvince] = useState<string>('Bagmati Province');
  const [bulkFee, setBulkFee] = useState<number>(150);

  useEffect(() => {
    const loaded = db.getDeliveryRates();
    setRates(loaded && loaded.length > 0 ? loaded : generateDefaultDeliveryRates());

    // Fetch latest from MongoDB Atlas on mount
    db.syncWithServer().then(() => {
      if (!isDirtyRef.current) {
        const fresh = db.getDeliveryRates();
        if (fresh && fresh.length > 0) setRates(fresh);
      }
    });

    const handleDbUpdate = () => {
      if (!isDirtyRef.current) {
        const fresh = db.getDeliveryRates();
        if (fresh && fresh.length > 0) setRates(fresh);
      }
    };
    window.addEventListener('ace-db-updated', handleDbUpdate);
    return () => window.removeEventListener('ace-db-updated', handleDbUpdate);
  }, []);

  const handleRateChange = (districtName: string, field: keyof DistrictDeliveryRate, value: any) => {
    setIsDirty(true);
    setRates((prev) =>
      prev.map((r) => {
        if (r.district === districtName) {
          if (field === 'deliveryFee') {
            return {
              ...r,
              deliveryFee: Number(value),
              homeDeliveryFee: Number(value),
              branchDeliveryFee: Number(value),
            };
          }
          if (field === 'enabled') {
            return {
              ...r,
              enabled: Boolean(value),
              homeDeliveryEnabled: Boolean(value),
              branchDeliveryEnabled: Boolean(value),
            };
          }
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleBulkApply = () => {
    setIsDirty(true);
    setRates((prev) =>
      prev.map((r) => {
        if (r.province === bulkProvince) {
          return {
            ...r,
            deliveryFee: Number(bulkFee),
            homeDeliveryFee: Number(bulkFee),
            branchDeliveryFee: Number(bulkFee),
          };
        }
        return r;
      })
    );
    setUpdateMsg(`Updated all districts in ${bulkProvince} to NPR ${bulkFee}. Click SAVE below to broadcast.`);
    setTimeout(() => setUpdateMsg(''), 4000);
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all 77 district delivery rates to system default values?')) {
      const defs = generateDefaultDeliveryRates();
      setRates(defs);
      db.updateDeliveryRates(defs);
      setIsDirty(false);
      setUpdateMsg('All 77 district delivery rates reset to defaults and saved!');
      setTimeout(() => setUpdateMsg(''), 3000);
    }
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateDeliveryRates(rates);
    setIsDirty(false);
    setUpdateMsg('🎉 All 77 Nepal District Delivery Rates saved and synced live across all devices!');
    setTimeout(() => setUpdateMsg(''), 4000);
  };

  const filteredRates = rates.filter((r) => {
    const matchesProvince = selectedProvinceFilter === 'All' || r.province === selectedProvinceFilter;
    const matchesSearch =
      r.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.province.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProvince && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
            <Truck className="text-brand-dark" />
            <span>NEPAL DELIVERY RATES MANAGER</span>
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            Configure delivery fee in NPR for all 77 districts across Nepal&apos;s 7 Provinces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {updateMsg && (
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded flex items-center gap-1 border border-emerald-200">
              <CheckCircle2 size={14} /> {updateMsg}
            </span>
          )}
          <button
            onClick={handleSaveAll}
            className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 flex items-center justify-center gap-2 rounded shadow cursor-pointer"
          >
            <Save size={16} />
            <span>SAVE ALL 77 DISTRICT RATES</span>
          </button>
        </div>
      </div>

      {/* Bulk Province Rate Applicator Card */}
      <div className="bg-white p-6 rounded-lg border border-brand-border shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-brand-gold" />
            <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider">
              BULK PROVINCE RATE SETTER
            </h2>
          </div>
          <span className="text-[10px] bg-brand-cream text-brand-dark px-2.5 py-1 rounded font-mono font-bold uppercase border border-brand-border">
            Quick Multi-District Override
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
          <div>
            <label className="font-semibold text-brand-dark block mb-1">SELECT PROVINCE *</label>
            <select
              value={bulkProvince}
              onChange={(e) => setBulkProvince(e.target.value)}
              className="w-full p-2.5 border border-brand-border rounded bg-brand-cream/40 font-semibold focus:outline-none focus:border-brand-dark"
            >
              {NEPAL_PROVINCES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.districts.length} Districts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-brand-dark block mb-1">DELIVERY FEE FOR ALL DISTRICTS (NPR) *</label>
            <input
              type="number"
              min={0}
              value={bulkFee}
              onChange={(e) => setBulkFee(Number(e.target.value))}
              className="w-full p-2.5 border border-brand-border rounded font-mono font-bold bg-white focus:outline-none"
              placeholder="e.g. 150"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleBulkApply}
              className="w-full py-2.5 bg-brand-dark text-white font-bold uppercase tracking-wider rounded hover:bg-brand-dark/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>APPLY TO PROVINCE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-brand-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        {/* Province Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="font-bold text-brand-muted uppercase text-[10px] tracking-wider shrink-0 mr-1">PROVINCE:</span>
          {['All', ...NEPAL_PROVINCES.map((p) => p.name)].map((pName) => (
            <button
              key={pName}
              onClick={() => setSelectedProvinceFilter(pName)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                selectedProvinceFilter === pName
                  ? 'bg-brand-dark text-white shadow-xs font-bold'
                  : 'bg-brand-cream/60 hover:bg-brand-cream text-brand-dark border border-brand-border/60'
              }`}
            >
              {pName === 'All' ? 'All 77 Districts' : pName.replace(' Province', '')}
            </button>
          ))}
        </div>

        {/* Search District */}
        <div className="flex items-center gap-2 w-full md:w-64 bg-brand-cream/50 px-3 py-2 rounded border border-brand-border">
          <Search size={15} className="text-brand-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search district name..."
            className="bg-transparent text-xs w-full focus:outline-none"
          />
        </div>
      </div>

      {/* Main 77 Districts Table */}
      <form onSubmit={handleSaveAll} className="bg-white rounded-lg border border-brand-border shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center text-xs pb-3 border-b border-brand-border">
          <span className="font-bold text-brand-dark uppercase tracking-wider">
            SHOWING {filteredRates.length} OF 77 NEPAL DISTRICTS
          </span>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-brand-muted hover:text-brand-dark flex items-center gap-1 font-semibold"
          >
            <RefreshCw size={13} />
            <span>Reset All to Defaults</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-brand-dark">
            <thead className="bg-brand-cream uppercase text-[10px] font-bold tracking-wider text-brand-muted">
              <tr>
                <th className="p-3">District Name</th>
                <th className="p-3">Province</th>
                <th className="p-3">🚚 Delivery Charge (NPR)</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredRates.map((item) => {
                const currentFee = typeof item.deliveryFee === 'number' ? item.deliveryFee : (typeof item.homeDeliveryFee === 'number' ? item.homeDeliveryFee : 150);
                const isEnabled = typeof item.enabled === 'boolean' ? item.enabled : (typeof item.homeDeliveryEnabled === 'boolean' ? item.homeDeliveryEnabled : true);

                return (
                  <tr key={item.district} className="hover:bg-brand-cream/30 transition-colors">
                    <td className="p-3 font-bold text-sm text-brand-dark">
                      <div className="flex items-center gap-2">
                        <MapPin size={15} className="text-brand-gold shrink-0" />
                        <span>{item.district}</span>
                      </div>
                    </td>
                    <td className="p-3 font-medium text-brand-muted">{item.province}</td>

                    {/* Delivery Fee Input */}
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1.5 bg-brand-cream/50 p-1 rounded border border-brand-border">
                        <span className="font-mono text-xs font-bold text-brand-muted pl-1">NPR</span>
                        <input
                          type="number"
                          min={0}
                          max={5000}
                          value={currentFee}
                          onChange={(e) => handleRateChange(item.district, 'deliveryFee', Number(e.target.value))}
                          className="w-24 p-1.5 bg-white border border-brand-border rounded font-mono font-bold text-center text-xs focus:outline-none focus:ring-1 focus:ring-brand-dark"
                        />
                      </div>
                    </td>

                    {/* Enabled / Disabled Status Toggle */}
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleRateChange(item.district, 'enabled', !isEnabled)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isEnabled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {isEnabled ? <CheckCircle2 size={13} /> : <ToggleLeft size={13} />}
                        <span>{isEnabled ? 'DELIVERY ACTIVE' : 'DELIVERY DISABLED'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-brand-border">
          <span className="text-xs text-brand-muted">
            All delivery charges update dynamically on the Checkout page when saved.
          </span>
          <button
            type="submit"
            className="px-8 py-3 bg-brand-dark text-white font-bold text-xs uppercase tracking-widest rounded shadow hover:bg-brand-dark/90 cursor-pointer"
          >
            SAVE ALL 77 DISTRICT RATES
          </button>
        </div>
      </form>
    </div>
  );
}
