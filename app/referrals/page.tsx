'use client';

import { Referrals } from '@/views/Referrals';
import { useUser } from '@/contexts/UserContext';

export default function ReferralsPage() {
  const { user } = useUser();
  return <Referrals user={user} />;
}
