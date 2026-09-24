'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, Calendar, Mail, Phone, ShieldCheck, UserCheck, RefreshCw, FileSpreadsheet, Download } from 'lucide-react';
import { db } from '@/lib/db';
import { CustomerUser } from '@/types';

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = () => {
    setUsers([...db.getUsers()]);
  };

  useEffect(() => {
    loadUsers();
    window.addEventListener('ace-db-updated', loadUsers);
    window.addEventListener('storage', loadUsers);
    return () => {
      window.removeEventListener('ace-db-updated', loadUsers);
      window.removeEventListener('storage', loadUsers);
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.mobile && u.mobile.includes(q))
    );
  });

  // Sort by registration date descending
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    return new Date(b.registrationDate || 0).getTime() - new Date(a.registrationDate || 0).getTime();
  });

  const customerOnlyCount = users.filter((u) => u.role === 'CUSTOMER').length;

  const exportToCSV = () => {
    if (sortedUsers.length === 0) {
      alert('No customer data available to export.');
      return;
    }

    const headers = ['Customer ID', 'Full Name', 'Email Address', 'Mobile Contact', 'Signup Date', 'Role', 'Account Status'];
    const rows = sortedUsers.map((u) => [
      `"${u.id}"`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${u.mobile || ''}"`,
      `"${u.registrationDate || ''}"`,
      `"${u.role}"`,
      '"VERIFIED & ACTIVE"',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DaisyHub_Customer_List_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-lg border border-brand-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-wider">
            REGISTERED CUSTOMERS LIST
          </h1>
          <p className="text-xs text-brand-muted mt-0.5">
            View all signed up customer accounts, registration dates, emails, and mobile contact numbers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-brand-cream px-4 py-2 rounded border border-brand-border text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">TOTAL CUSTOMERS</span>
            <span className="font-serif-title text-xl font-bold text-brand-dark">{customerOnlyCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg border border-brand-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or mobile..."
            className="w-full p-2.5 pl-9 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
          />
          <Search size={15} className="absolute left-3 top-3 text-brand-muted" />
        </div>

        <button
          onClick={loadUsers}
          className="px-3.5 py-2 bg-brand-cream hover:bg-brand-dark hover:text-white text-brand-dark border border-brand-border text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>REFRESH LIST</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-brand-border shadow-sm p-6 overflow-x-auto space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-3 text-xs">
          <span className="font-bold text-brand-dark uppercase tracking-wider">
            SHOWING {sortedUsers.length} REGISTERED ACCOUNTS
          </span>
        </div>

        {sortedUsers.length === 0 ? (
          <div className="text-center py-16 text-brand-muted space-y-2">
            <Users size={36} className="mx-auto stroke-1 text-brand-muted/40" />
            <p className="font-serif-title font-bold text-brand-dark">No customer accounts found.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-brand-dark">
            <thead className="bg-brand-cream uppercase text-[10px] font-bold tracking-wider text-brand-muted">
              <tr>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Mobile Contact</th>
                <th className="p-3">Signup Date</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {sortedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="p-3 font-bold text-brand-dark flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-dark text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {u.name ? u.name.slice(0, 2).toUpperCase() : 'CU'}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="p-3 text-brand-dark font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-brand-muted shrink-0" />
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-brand-dark">
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-brand-muted shrink-0" />
                      <span>{u.mobile || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-brand-muted">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-brand-gold shrink-0" />
                      <span>{u.registrationDate || '2026-01-01'}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {u.role === 'ADMIN' ? (
                      <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                        ADMIN
                      </span>
                    ) : (
                      <span className="bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                        CUSTOMER
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                      <UserCheck size={12} className="text-emerald-600" />
                      VERIFIED & ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
