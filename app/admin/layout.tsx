'use client';

import { ReactNode, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { UserRole } from '@/types';
import { AdminShell } from '@/components/admin/AdminShell';

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const { user, loading, handleLogout } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== UserRole.ADMIN)) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== UserRole.ADMIN) {
    return (
      <div className="fds-nexus flex min-h-screen items-center justify-center">
        <p className="text-sm text-white/50">Opening command nexus…</p>
      </div>
    );
  }

  return (
    <AdminShell adminName={user.name} onLogout={handleLogout}>
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}
