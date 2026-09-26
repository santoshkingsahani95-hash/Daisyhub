'use client';

import React from 'react';

interface AnnouncementBarProps {
  text?: string;
  enabled?: boolean;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  text = 'WELCOME TO DAISY HUB (daissyhub.com) | FREE DELIVERY ACROSS NEPAL ON ORDERS ABOVE NPR 3,000',
  enabled = true,
}) => {
  if (!enabled) return null;

  return (
    <div className="bg-brand-dark text-white text-[11px] md:text-xs tracking-widest font-medium uppercase py-2 px-4 text-center relative overflow-hidden z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span suppressHydrationWarning>{text}</span>
      </div>
    </div>
  );
};
