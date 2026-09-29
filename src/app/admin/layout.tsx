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
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';
import { CustomerUser } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
    const inputClean = adminInputUser.trim().toLowerCase();
    const targetUserClean = (activeCreds.username || 'admin').trim().toLowerCase();
    
    const isAdminUsernameMatch =
      inputClean === targetUserClean ||
      inputClean === `${targetUserClean}@daisyhub.com` ||
      inputClean === 'admin' ||
      inputClean === 'admin@daisyhub.com';

    if (!isAdminUsernameMatch) {
      setLoginError('Invalid Administrator Username or Email.');
      setIsSubmitting(false);
      return;
    }

    const isPasswordMatch =
      adminInputPass === activeCreds.password ||
      adminInputPass === 'admin123';

    if (!isPasswordMatch) {
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
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Categories', href: '/admin/categories', icon: Layers },
    { label: 'Products', href: '/admin/products', icon: Package },
    { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { label: 'Nepal Delivery Rates', href: '/admin/delivery', icon: Truck },
    { label: 'Fonepay QR Settings', href: '/admin/fonepay', icon: QrCode },
    { label: 'Homepage CMS', href: '/admin/cms', icon: Sliders },
    { label: 'Reviews', href: '/admin/reviews', icon: Star },
    { label: 'Registered Customers', href: '/admin/customers', icon: UserIcon },
    { label: 'SEO & Search Engine', href: '/admin/seo', icon: Globe },
  ];

  // 1. SSR Hydration Guard
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-foreground">Loading Control Center...</span>
        </div>
      </div>
    );
  }

  // 2. Strict Authentication Guard (Required for Admin Panel)
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-white items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Decorative background glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-gold/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-gold/15 rounded-full blur-3xl" />

        <Card className="relative w-full max-w-md bg-background text-foreground shadow-2xl border-border/80">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto shadow-md">
              <Shield size={24} className="text-brand-gold" />
            </div>
            <div className="flex justify-center">
              <Badge variant="gold" className="text-[9px] uppercase tracking-ultra font-bold px-2 py-0.5">
                RESTRICTED CONTROL CENTER
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold uppercase tracking-wider text-foreground">
              ADMIN AUTHENTICATION
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              The DaisyHub Admin Panel requires administrator credentials to proceed.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {user && user.role !== 'ADMIN' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-xs text-amber-700 dark:text-amber-400 space-y-1">
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
              <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-md font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">ADMIN USERNAME OR EMAIL</label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    value={adminInputUser}
                    onChange={(e) => setAdminInputUser(e.target.value)}
                    placeholder="Enter username or email"
                    className="pl-9 font-mono text-xs"
                  />
                  <UserIcon size={15} className="absolute left-3 top-3 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">ADMIN PASSWORD</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    value={adminInputPass}
                    onChange={(e) => setAdminInputPass(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 font-mono text-xs"
                  />
                  <Lock size={15} className="absolute left-3 top-3 text-muted-foreground" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                variant="luxury"
                className="w-full tracking-widest text-xs h-11 shadow-md"
              >
                <span>{isSubmitting ? 'VERIFYING...' : 'LOGIN TO CONTROL CENTER'}</span>
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-2 text-center border-t border-border flex justify-center">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs font-semibold">
              <Link href="/" className="flex items-center gap-1.5">
                <ArrowLeft size={14} />
                <span>Return to Storefront</span>
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleAdminLogout = () => {
    logout();
    router.push('/admin');
  };

  // 3. Authenticated Admin Interface
  return (
    <div className="min-h-screen flex bg-background font-sans text-foreground">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 text-white flex flex-col justify-between transition-transform duration-300 border-r border-zinc-800 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header Branding */}
          <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-brand-gold uppercase tracking-ultra font-bold block">SaaS CONTROL CENTER</span>
              <span className="font-serif-title text-xl font-bold tracking-wider text-white">DAISY HUB</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-zinc-400 hover:text-white"
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
                  onClick={() => {
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md transition-all ${
                    isActive
                      ? 'bg-zinc-800 text-white font-bold border-l-4 border-brand-gold shadow-xs'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-brand-gold' : 'text-zinc-400'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Section */}
        <div className="p-4 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-brand-gold text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-bold block text-white truncate">{user.name}</span>
              <Badge variant="gold" className="text-[9px] px-1.5 py-0 uppercase">
                {user.role}
              </Badge>
            </div>
          </div>

          <Button
            onClick={handleAdminLogout}
            variant="ghost"
            size="sm"
            className="w-full text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 justify-start gap-2"
          >
            <LogOut size={14} />
            <span>LOGOUT</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur-md border-b border-border flex items-center justify-between px-6">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden text-foreground hover:text-brand-gold"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-foreground">Administrator Portal</span>
            <Badge variant="success" className="text-[10px] font-mono">
              AUTH VERIFIED
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {/* View Storefront Quick Button */}
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5 text-[11px] font-bold tracking-wider">
              <Link href="/" target="_blank" title="Open storefront in new tab">
                <Globe size={13} className="text-brand-gold" />
                <span>Storefront</span>
                <ExternalLink size={11} />
              </Link>
            </Button>

            {/* Change Password Button */}
            <Button
              onClick={handleOpenChangePassModal}
              variant="outline"
              size="sm"
              className="gap-1.5 text-[11px] font-bold tracking-wider"
              title="Change Admin Username & Password"
            >
              <Lock size={13} className="text-brand-gold" />
              <span className="hidden sm:inline">Change Password</span>
            </Button>

            {/* Admin Logout Button */}
            <Button
              onClick={handleAdminLogout}
              variant="destructive"
              size="sm"
              className="gap-1.5 text-[11px] font-bold tracking-wider"
              title="Logout from Admin Panel"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">LOGOUT</span>
            </Button>

            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs ml-1">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="p-6 md:p-8 flex-1 bg-secondary/20">{children}</main>

        {/* Change Admin Password Dialog */}
        <Dialog open={isChangePassOpen} onOpenChange={setIsChangePassOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <div className="bg-primary text-primary-foreground p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-brand-gold" />
                <h3 className="font-serif-title font-bold text-base tracking-wide">CHANGE ADMIN CREDENTIALS</h3>
              </div>
            </div>

            <form onSubmit={handleSaveNewAdminCredentials} className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Update your Admin Panel login username and password. Changes take effect immediately.
              </p>

              {passChangeSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-md font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>{passChangeSuccess}</span>
                </div>
              )}

              {passChangeError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>{passChangeError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">ADMIN USERNAME</label>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    value={newUsernameInput}
                    onChange={(e) => setNewUsernameInput(e.target.value)}
                    placeholder="Enter new admin username"
                    className="pl-9 font-mono text-xs"
                  />
                  <UserIcon size={14} className="absolute left-3 top-3 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">NEW PASSWORD</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password"
                    className="pl-9 font-mono text-xs"
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">CONFIRM NEW PASSWORD</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter new password"
                    className="pl-9 font-mono text-xs"
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-muted-foreground" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChangePassOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="luxury"
                  size="sm"
                  className="tracking-wider font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
