'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';
import { CustomerUser } from '@/types';
import { Loader2, CheckCircle2 } from 'lucide-react';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useStore();

  useEffect(() => {
    const rawUser = searchParams?.get('user');
    const redirectTarget = searchParams?.get('redirect') || '/account';

    if (rawUser) {
      try {
        const userObj: CustomerUser = JSON.parse(decodeURIComponent(rawUser));
        db.saveUser(userObj);
        setUser(userObj);
        router.replace(redirectTarget);
        return;
      } catch (err) {
        console.error('Failed to parse Google user payload:', err);
      }
    }

    // Fallback: check cookie if query param missing
    const cookies = document.cookie.split('; ');
    const userCookie = cookies.find((c) => c.startsWith('daisy_google_user='));
    if (userCookie) {
      try {
        const jsonVal = decodeURIComponent(userCookie.split('=')[1]);
        const userObj: CustomerUser = JSON.parse(jsonVal);
        db.saveUser(userObj);
        setUser(userObj);
        router.replace(redirectTarget);
        return;
      } catch (err) {
        console.error('Failed to parse Google user cookie:', err);
      }
    }

    // If neither present, redirect back to login
    router.replace('/login');
  }, [router, searchParams, setUser]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-brand-border rounded-xl shadow-lg space-y-4 max-w-sm w-full text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
        <CheckCircle2 size={24} />
      </div>
      <h2 className="font-serif-title text-xl font-bold text-brand-dark">Authenticating...</h2>
      <p className="text-xs text-brand-muted">Completing Google sign in and redirecting to your dashboard.</p>
      <Loader2 className="w-6 h-6 animate-spin text-brand-dark mt-2" />
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream/30 px-4">
      <Suspense fallback={
        <div className="text-xs font-bold text-brand-dark">Loading session...</div>
      }>
        <GoogleCallbackContent />
      </Suspense>
    </div>
  );
}
