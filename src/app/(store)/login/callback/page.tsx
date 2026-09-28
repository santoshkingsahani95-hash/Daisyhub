'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const target = searchParams?.get('redirect') || '/account';
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-brand-border rounded-xl shadow-lg space-y-4 max-w-sm w-full text-center">
      <h2 className="font-serif-title text-xl font-bold text-brand-dark">Redirecting...</h2>
      <p className="text-xs text-brand-muted">Taking you to your destination.</p>
      <Loader2 className="w-6 h-6 animate-spin text-brand-dark mt-2" />
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream/30 px-4">
      <Suspense fallback={
        <div className="text-xs text-brand-dark font-bold">Redirecting...</div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
