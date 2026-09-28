import React from 'react';

export function AuthDivider({ text = 'OR' }: { text?: string }) {
  return (
    <div className="relative flex items-center justify-center my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-brand-border" />
      </div>
      <span className="relative bg-white px-4 text-[10px] uppercase font-bold tracking-widest text-brand-muted">
        {text}
      </span>
    </div>
  );
}
