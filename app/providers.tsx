'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { Layout } from '@/components/Layout';
import { SupportChat } from '@/components/SupportChat';

function AppShellInner({ children }: { children: ReactNode }) {
  const { user, loading, handleLogout } = useUser();
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';
  const isAdminPage = pathname.startsWith('/admin');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] text-royal">
        Loading Fast Data Services…
      </div>
    );
  }

  if (isAuthPage || isAdminPage) {
    return (
      <>
        {children}
        <SupportChat />
      </>
    );
  }

  return (
    <>
      <Layout user={user} onLogout={handleLogout}>
        {children}
      </Layout>
      <SupportChat />
    </>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <AppShellInner>{children}</AppShellInner>
    </UserProvider>
  );
}
