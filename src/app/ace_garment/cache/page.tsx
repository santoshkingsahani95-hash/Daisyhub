import React from 'react';
import { CacheDashboard } from '@/components/admin/CacheDashboard';

export const metadata = {
  title: 'Cache Pre-Warming & Performance | Ace Garment Admin',
  description: 'Manage database object cache, pre-warming triggers, and route crawler telemetry.',
};

export default function AdminCachePage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <CacheDashboard />
    </div>
  );
}
