'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, Chrome, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Footer } from '@/components/layout/footer';
import { db } from '@/lib/db';
import { useStore } from '@/lib/store';
import { CustomerUser } from '@/types';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get('redirect') || null;
  const isRegisteredSuccess = searchParams?.get('registered') === '1';

  const { setUser } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Customer Login Check
    const existing = db.findUserByEmail(email);
    if (existing) {
      if (existing.password && existing.password !== password) {
        setLoginError('Invalid password. Please check your credentials.');
        return;
      }
      setUser(existing);
      router.push(redirectTarget || '/account');
    } else {
      // Create new customer session if first time
      const custUser: CustomerUser = {
        id: `usr-${Date.now()}`,
        name: email ? email.split('@')[0] : 'Daisy Customer',
        email: email.trim(),
        mobile: '+977 9841234567',
        password: password,
        role: 'CUSTOMER',
        registrationDate: new Date().toISOString().split('T')[0],
      };
      db.saveUser(custUser);
      setUser(custUser);
      router.push(redirectTarget || '/account');
    }
  };

  const handleGoogleAuth = () => {
    const target = redirectTarget ? encodeURIComponent(redirectTarget) : '/account';
    window.location.href = `/api/auth/google?redirect=${target}`;
  };

  return (
    <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-xl border border-brand-border shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <span className="text-[11px] uppercase tracking-ultra font-bold text-brand-gold">DAISY HUB PORTAL</span>
        <h1 className="font-serif-title text-3xl font-bold text-brand-dark">SIGN IN</h1>
        <p className="text-xs text-brand-muted">Sign in to your account or access the Admin Control Center.</p>
      </div>

      {isRegisteredSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>Registration successful! Please sign in with your email and password.</span>
        </div>
      )}

      {loginError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{loginError}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-brand-dark block mb-1">EMAIL ADDRESS</label>
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-brand-dark">PASSWORD</label>
            <a href="#" className="text-[11px] text-brand-muted hover:text-brand-dark">Forgot password?</a>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full p-3 border border-brand-border rounded text-xs focus:outline-none focus:border-brand-dark"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="accent-brand-dark"
          />
          <label htmlFor="remember" className="text-xs text-brand-muted">Remember me on this device</label>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 transition-all flex items-center justify-center gap-2 shadow-md"
        >
          <span>SIGN IN</span>
          <ArrowRight size={14} />
        </button>
      </form>

      <div className="relative flex items-center justify-center my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-brand-border" />
        </div>
        <span className="relative bg-white px-4 text-[10px] uppercase font-bold tracking-widest text-brand-muted">OR</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        className="w-full py-3 border border-brand-border rounded text-xs font-semibold text-brand-dark hover:bg-brand-cream transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
      >
        <Chrome size={16} className="text-rose-500" />
        <span>Continue with Google</span>
      </button>

      <p className="text-xs text-brand-muted text-center pt-2">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-bold text-brand-dark hover:underline">
          Create Account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-cream/30">
      <AnnouncementBar />
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <Suspense fallback={
          <div className="text-xs text-brand-dark font-bold">Loading Login Form...</div>
        }>
          <LoginForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
