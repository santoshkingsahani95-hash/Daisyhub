'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Layers,
  ShoppingBag,
  Sliders,
  Tag,
  Star,
  QrCode,
  ArrowLeft,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Globe,
  User as UserIcon,
  Shield,
  Lock,
  ArrowRight,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';
import { CustomerUser } from '@/types';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { user, setUser, logout } = useStore();

  // Admin Login Guard Form State
  const [adminInputUser, setAdminInputUser] = useState('');
  const [adminInputPass, setAdminInputPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Change Password Modal State
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState('');
  const [passChangeError, setPassChangeError] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    const activeCreds = db.getAdminCredentials();
    const inputLower = adminInputUser.trim().toLowerCase();
    const targetUserLower = activeCreds.username.toLowerCase();
    
    const isAdminUsernameMatch =
      inputLower === targetUserLower ||
      inputLower === `${targetUserLower}@daisyhub.com` ||
      inputLower.includes('admin');

    if (!isAdminUsernameMatch) {
      setLoginError('Invalid Administrator Username or Email.');
      setIsSubmitting(false);
      return;
    }

    if (adminInputPass !== activeCreds.password) {
      setLoginError('Invalid Administrator Password.');
      setIsSubmitting(false);
      return;
    }

    const adminUser: CustomerUser = {
      id: 'usr-admin-1',
      name: 'Admin Manager',
      email: adminInputUser.includes('@') ? adminInputUser : `${activeCreds.username}@daisyhub.com`,
      mobile: '+977 9800000000',
      role: 'ADMIN',
      registrationDate: '2026-01-01',
    };

    db.saveUser(adminUser);
    setUser(adminUser);
    setIsSubmitting(false);
  };

  const handleOpenChangePassModal = () => {
    const creds = db.getAdminCredentials();
    setNewUsernameInput(creds.username);
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPassChangeSuccess('');
    setPassChangeError('');
    setIsChangePassOpen(true);
  };

  const handleSaveNewAdminCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeSuccess('');
    setPassChangeError('');

    if (!newUsernameInput.trim()) {
      setPassChangeError('Admin Username cannot be empty.');
      return;
    }
    if (!newPasswordInput.trim()) {
      setPassChangeError('New Password cannot be empty.');
      return;
    }
    if (newPasswordInput.length < 4) {
      setPassChangeError('Password must be at least 4 characters long.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPassChangeError('Passwords do not match. Please re-enter.');
      return;
    }

    const res = db.updateAdminCredentials(newUsernameInput, newPasswordInput);
    if (res.success) {
      setPassChangeSuccess(res.message);
      setTimeout(() => {
        setIsChangePassOpen(false);
      }, 1500);
    } else {
      setPassChangeError(res.message);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/ace_garment', icon: LayoutDashboard },
    { label: 'Categories', href: '/ace_garment/categories', icon: Layers },
    { label: 'Products', href: '/ace_garment/products', icon: Package },
    { label: 'Inventory', href: '/ace_garment/inventory', icon: Boxes },
    { label: 'Orders', href: '/ace_garment/orders', icon: ShoppingBag },
    { label: 'Fonepay QR Settings', href: '/ace_garment/fonepay', icon: QrCode },
    { label: 'Homepage CMS', href: '/ace_garment/cms', icon: Sliders },
    { label: 'Coupons', href: '/ace_garment/coupons', icon: Tag },
    { label: 'Reviews', href: '/ace_garment/reviews', icon: Star },
    { label: 'Registered Customers', href: '/ace_garment/customers', icon: UserIcon },
    { label: 'SEO & Search Engine', href: '/ace_garment/seo', icon: Globe },
  ];

  // 1. SSR Hydration Guard
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream/40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-dark border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-brand-dark">Loading Control Center...</span>
        </div>
      </div>
    );
  }

  // 2. Strict Authentication Guard (Required for Admin Panel)
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col bg-brand-dark/95 text-white items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Decorative background glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl" />

        <div className="relative w-full max-w-md bg-white text-brand-dark p-8 md:p-10 rounded-xl shadow-2xl border border-white/20 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-brand-dark text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <Shield size={24} className="text-brand-gold" />
            </div>
            <span className="text-[10px] uppercase tracking-ultra font-bold text-brand-gold block pt-2">RESTRICTED CONTROL CENTER</span>
            <h1 className="font-serif-title text-2xl font-bold text-brand-dark uppercase tracking-wider">ADMIN AUTHENTICATION</h1>
            <p className="text-xs text-brand-muted">The Admin Panel requires administrator login credentials to proceed.</p>
          </div>

          {user && user.role !== 'ADMIN' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle size={14} className="shrink-0 text-amber-600" />
                <span>Customer Session Active</span>
              </div>
              <p className="text-[11px] leading-tight">
                You are currently logged in as <strong className="font-mono">{user.email}</strong> (Customer). Please authenticate with Admin credentials below.
              </p>
            </div>
          )}

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1">ADMIN USERNAME OR EMAIL</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={adminInputUser}
                  onChange={(e) => setAdminInputUser(e.target.value)}
                  placeholder="Enter username or email"
                  className="w-full p-3 pl-9 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
                />
                <UserIcon size={16} className="absolute left-3 top-3.5 text-brand-muted" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1">ADMIN PASSWORD</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminInputPass}
                  onChange={(e) => setAdminInputPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-3 pl-9 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
                />
                <Lock size={16} className="absolute left-3 top-3.5 text-brand-muted" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <span>{isSubmitting ? 'VERIFYING...' : 'LOGIN TO ADMIN PANEL'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="pt-2 text-center border-t border-brand-border">
            <Link
              href="/"
              className="text-xs text-brand-muted hover:text-brand-dark font-semibold flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Return to Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin Interface
  return (
    <div className="min-h-screen flex bg-brand-cream/40 font-sans">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-brand-dark text-white flex flex-col justify-between transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header Branding */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-brand-gold uppercase tracking-ultra font-bold block">SaaS CONTROL CENTER</span>
              <span className="font-serif-title text-xl font-bold tracking-wider text-white">DAISY HUB</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-white/70 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1 text-xs uppercase tracking-wider font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded transition-all ${
                    isActive
                      ? 'bg-white text-brand-dark font-bold shadow-md'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 text-xs text-brand-gold hover:text-white transition-colors font-bold uppercase tracking-wider bg-white/5 rounded hover:bg-white/10"
          >
            <Globe size={16} />
            <span>View Live Website ↗</span>
          </Link>

          <Link
            href="/account"
            className="flex items-center gap-2 px-4 py-2.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <UserIcon size={16} />
            <span>Customer Account View</span>
          </Link>

          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="bg-white border-b border-brand-border px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden text-brand-dark"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-brand-dark">Administrator Portal</span>
            <span className="bg-brand-dark text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded">
              AUTH VERIFIED
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* View Storefront Quick Button */}
            <Link
              href="/"
              target="_blank"
              className="px-3 py-1.5 bg-brand-cream hover:bg-brand-dark hover:text-white text-brand-dark text-[11px] font-bold uppercase tracking-wider rounded border border-brand-border transition-all flex items-center gap-1.5 shadow-xs"
              title="Open storefront in new tab"
            >
              <Globe size={14} className="text-brand-gold" />
              <span className="hidden sm:inline">View Store Front</span>
              <ExternalLink size={12} />
            </Link>

            {/* Change Password Button */}
            <button
              onClick={handleOpenChangePassModal}
              className="px-3 py-1.5 bg-white hover:bg-brand-dark hover:text-white text-brand-dark text-[11px] font-bold uppercase tracking-wider rounded border border-brand-border transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Change Admin Username & Password"
            >
              <Lock size={14} className="text-brand-gold" />
              <span>Change Password</span>
            </button>

            <span className="font-bold text-brand-dark hidden sm:inline">{user.name}</span>
            <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="p-6 md:p-8 flex-1">{children}</main>

        {/* Change Admin Password Modal */}
        {isChangePassOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-xl shadow-2xl border border-brand-border overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-brand-dark text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-brand-gold" />
                  <h3 className="font-serif-title font-bold text-base tracking-wide">CHANGE ADMIN CREDENTIALS</h3>
                </div>
                <button
                  onClick={() => setIsChangePassOpen(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveNewAdminCredentials} className="p-6 space-y-4">
                <p className="text-xs text-brand-muted">
                  Update your Admin Panel login username and password. Changes take effect immediately.
                </p>

                {passChangeSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded font-medium">
                    ✓ {passChangeSuccess}
                  </div>
                )}

                {passChangeError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium">
                    ⚠ {passChangeError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">ADMIN USERNAME</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newUsernameInput}
                      onChange={(e) => setNewUsernameInput(e.target.value)}
                      placeholder="Enter new admin username"
                      className="w-full p-2.5 pl-9 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
                    />
                    <UserIcon size={15} className="absolute left-3 top-3 text-brand-muted" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">NEW PASSWORD</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full p-2.5 pl-9 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
                    />
                    <Lock size={15} className="absolute left-3 top-3 text-brand-muted" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-brand-dark block mb-1">CONFIRM NEW PASSWORD</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full p-2.5 pl-9 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark font-mono"
                    />
                    <Lock size={15} className="absolute left-3 top-3 text-brand-muted" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
                  <button
                    type="button"
                    onClick={() => setIsChangePassOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-dark"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-dark text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-dark/90 shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

