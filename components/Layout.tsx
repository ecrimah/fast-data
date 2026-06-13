'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Wallet, ShoppingBag, LogOut, LayoutDashboard, Gift, ArrowRight, Mail } from 'lucide-react';
import { User, UserRole } from '../types';
import { SITE } from '@/lib/brand';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FdsLogo } from '@/components/brand/FdsLogo';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const NAV = [
  { href: '/', icon: ShoppingBag, label: 'Shop' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/referrals', icon: Gift, label: 'Referrals' },
  { href: '/contact', icon: Mail, label: 'Contact' },
];

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isHome = pathname === '/';

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5f5]">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="hidden border-b border-slate-100 bg-slate-50 sm:block">
          <div className="mx-auto flex h-7 max-w-7xl items-center justify-between px-4 text-[10px] font-medium sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="pulse-dot" />
                <span className="font-bold uppercase tracking-[0.16em] text-gold-dark">Live delivery</span>
              </span>
              <span className="hidden h-3 w-px bg-slate-200 md:block" />
              <span className="hidden md:inline">
                Assistant <span className="font-bold text-royal">Tay</span>
              </span>
            </div>
            <span className="text-slate-400">{SITE.supportEmail}</span>
          </div>
        </div>

        <div className="relative border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <FdsLogo size={44} priority />

            <nav className="hidden items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                      active ? 'text-royal' : 'text-slate-500 hover:text-royal'
                    )}
                  >
                    {active && <span className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-gold/30" />}
                    <item.icon size={16} className="relative" />
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    'relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold',
                    pathname === '/admin' ? 'text-royal' : 'text-slate-500 hover:text-royal'
                  )}
                >
                  <LayoutDashboard size={16} />
                  Admin
                </Link>
              )}
            </nav>

            <div className="hidden items-center gap-2 sm:flex">
              {user ? (
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                  <div className="text-right">
                    <p className="text-xs font-bold text-royal">{user.name.split(' ')[0]}</p>
                    <p className="text-[11px] font-mono text-gold-dark">GH₵ {user.wallet_balance.toFixed(2)}</p>
                  </div>
                  <button onClick={onLogout} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500">
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link href="/login" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-royal hover:border-gold/40 hover:bg-slate-50">
                  Sign in
                </Link>
              )}
              <Link
                href={isHome ? '#shop-bundles' : '/'}
                className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white gradient-accent shadow-md shadow-gold/20"
              >
                Buy Data
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <button type="button" className="rounded-lg p-2 text-royal md:hidden" onClick={() => setOpen(!open)}>
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-b border-slate-200 bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {[...NAV, ...(isAdmin ? [{ href: '/admin', icon: LayoutDashboard, label: 'Admin' }] : [])].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-slate-200 pt-4">
              {user ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-royal">{user.name.split(' ')[0]}</p>
                    <p className="text-[11px] font-mono text-gold-dark">GH₵ {user.wallet_balance.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onLogout();
                    }}
                    className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-royal hover:border-gold/40 hover:bg-slate-50"
                >
                  Sign in
                </Link>
              )}

              <Link
                href={isHome ? '#shop-bundles' : '/'}
                onClick={() => setOpen(false)}
                className="group mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-3 text-sm font-bold text-white gradient-accent shadow-md shadow-gold/20"
              >
                Buy Data
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-grow">{children}</main>

      <SiteFooter />
    </div>
  );
};
