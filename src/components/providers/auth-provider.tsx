'use client';

import React, { useEffect, useRef } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/db';
import { CustomerUser } from '@/types';

function SessionSync() {
  const { data: session, status } = useSession();
  const { user, setUser } = useStore();
  const lastSyncedEmail = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      if (lastSyncedEmail.current !== session.user.email || !user || user.email !== session.user.email) {
        lastSyncedEmail.current = session.user.email;
        const googleUser: CustomerUser = {
          id: (session.user as any).id || `usr-google-${Date.now()}`,
          name: session.user.name || session.user.email.split('@')[0],
          email: session.user.email,
          role: 'CUSTOMER',
          registrationDate: new Date().toISOString().split('T')[0],
        };
        db.saveUser(googleUser);
        setUser(googleUser);
      }
    }
  }, [session, status, user, setUser]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync />
      {children}
    </SessionProvider>
  );
}
