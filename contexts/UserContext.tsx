'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/services/supabaseDatabase';
import { User } from '@/types';

interface UserContextValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  handleLogout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const session = await getSession();
        setUser(session);
      } catch (e) {
        console.error('Session init failed:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refreshUser = async () => {
    const session = await getSession();
    setUser(session);
  };

  const handleLogout = () => {
    localStorage.removeItem('fds_current_user');
    setUser(null);
    router.push('/');
  };

  return (
    <UserContext.Provider value={{ user, loading, setUser, refreshUser, handleLogout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
