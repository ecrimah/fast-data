'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  FileText,
  Cable,
  Settings,
  Menu,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Bell,
  Smartphone,
  MessageSquare,
  Tag,
  Gift,
  AlertTriangle,
  BarChart3,
  Wallet,
  ListChecks,
  Package,
  Users,
} from 'lucide-react';
import { useEffect, useState, ReactNode } from 'react';
import { FdsLogo } from '@/components/brand/FdsLogo';
import { adminFetch } from '@/lib/api/admin-client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Command', icon: LayoutGrid, exact: true },
  { href: '/admin/operations', label: 'Queue', icon: ListChecks },
  { href: '/admin/orders', label: 'Orders', icon: FileText },
  { href: '/admin/packages', label: 'Packages', icon: Package },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Cable },
  { href: '/admin/momo', label: 'MoMo Match', icon: Smartphone },
  { href: '/admin/sms', label: 'SMS Hub', icon: MessageSquare },
  { href: '/admin/transactions', label: 'Ledger', icon: Wallet },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/promotions', label: 'Promos', icon: Tag },
  { href: '/admin/referrals', label: 'Referrals', icon: Gift },
  { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

interface AdminShellProps {
  adminName: string;
  children: ReactNode;
  onLogout: () => void;
}

export function AdminShell({ adminName, children, onLogout }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState('');
  const [alertTotal, setAlertTotal] = useState(0);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    adminFetch('/api/admin/notifications')
      .then((d) => setAlertTotal(d.total ?? 0))
      .catch(() => {});
    const id = setInterval(() => {
      adminFetch('/api/admin/notifications')
        .then((d) => setAlertTotal(d.total ?? 0))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fds-nexus flex min-h-screen">
      <aside className="fds-nexus-sidebar hidden lg:flex">
        <Link href="/admin" className="mb-4 block px-2">
          <FdsLogo size={36} linked={false} />
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('fds-nav-link', active && 'fds-nav-link-active')}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-1 border-t border-white/5 pt-4">
          <Link href="/" className="fds-nav-link">
            <ExternalLink className="h-4 w-4" />
            Storefront
          </Link>
          <button type="button" onClick={onLogout} className="fds-nav-link w-full text-rose-300 hover:text-rose-200">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="fds-nexus-topbar">
          <button type="button" className="rounded-lg p-2 text-white/60 lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-glow/80">FDS Nexus</p>
            <p className="truncate text-sm font-bold text-white">Operations Command</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 sm:inline-flex">
              <ShieldCheck className="h-3 w-3" />
              Live · {time}
            </span>
            <Link
              href="/admin/operations"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            >
              <Bell className="h-4 w-4" />
              {alertTotal > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-navy-900">
                  {alertTotal > 9 ? '9+' : alertTotal}
                </span>
              )}
            </Link>
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-royal text-[10px] font-bold text-white">
                {adminName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-white">{adminName.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        <main className="fds-nexus-main flex-1">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close" />
          <aside className="fds-nexus-sidebar absolute left-0 top-0 h-full w-72 p-4 shadow-2xl">
            <FdsLogo size={32} linked={false} />
            <nav className="mt-6 space-y-1">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="fds-nav-link">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
