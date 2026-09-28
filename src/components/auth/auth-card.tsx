import React from 'react';

interface AuthCardProps {
  badge?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthCard({
  badge = 'DAISY HUB PORTAL',
  title,
  subtitle,
  children,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-xl border border-brand-border shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <span className="text-[11px] uppercase tracking-ultra font-bold text-brand-gold">
          {badge}
        </span>
        <h1 className="font-serif-title text-3xl font-bold text-brand-dark uppercase tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-brand-muted leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
