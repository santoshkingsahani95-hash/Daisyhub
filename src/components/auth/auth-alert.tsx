import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthAlertProps {
  type: 'error' | 'success';
  message?: string | null;
}

export function AuthAlert({ type, message }: AuthAlertProps) {
  if (!message) return null;

  if (type === 'error') {
    return (
      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded font-medium flex items-center gap-2">
        <AlertCircle size={16} className="shrink-0 text-rose-600" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded font-medium flex items-center gap-2">
      <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
      <span>{message}</span>
    </div>
  );
}
