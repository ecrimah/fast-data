'use client';

import { Checkout } from '@/views/Checkout';
import { useUser } from '@/contexts/UserContext';

export default function CheckoutPage() {
  const { user } = useUser();
  return <Checkout user={user} />;
}
