'use client';

import { Login } from '@/views/Login';
import { useUser } from '@/contexts/UserContext';

export default function LoginPage() {
  const { setUser } = useUser();
  return <Login setUser={setUser} />;
}
