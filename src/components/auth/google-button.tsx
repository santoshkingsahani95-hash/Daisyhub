'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Chrome, Loader2 } from 'lucide-react';

interface GoogleButtonProps {
  text?: string;
  callbackUrl?: string;
  className?: string;
}

export function GoogleButton({
  text = 'Continue with Google',
  callbackUrl = '/account',
  className = '',
}: GoogleButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      await signIn('google', { callbackUrl });
    } catch (err) {
      console.error('Google sign-in error:', err);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-3 border border-brand-border rounded text-xs font-semibold text-brand-dark hover:bg-brand-cream/60 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin text-brand-dark" />
      ) : (
        <Chrome size={16} className="text-rose-500" />
      )}
      <span>{loading ? 'Connecting to Google...' : text}</span>
    </button>
  );
}
