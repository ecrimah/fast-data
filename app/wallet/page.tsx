'use client';

import { Wallet } from '@/views/Wallet';
import { useUser } from '@/contexts/UserContext';

export default function WalletPage() {
  const { user, refreshUser } = useUser();
  return <Wallet user={user} refreshUser={refreshUser} />;
}
