'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { formatGHS } from '@/lib/admin-metrics';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage, NexusTable, StatOrb } from '@/components/admin/fds-ui';
import { Search, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: 'user' | 'admin' | 'agent';
  wallet_balance: number;
  referral_code: string | null;
  created_at: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async (q = '') => {
    setLoading(true);
    try {
      const d = await adminFetch(`/api/admin/customers${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      setCustomers(d.customers ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setErr('');
    setTimeout(() => setMsg(''), 3500);
  };
  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : 'Action failed');

  const creditWallet = async (c: Customer) => {
    const input = prompt(`Adjust wallet for ${c.email || c.name}. Enter amount in GH₵ (negative to debit):`);
    if (input === null) return;
    const amount = Number(input);
    if (!amount || Number.isNaN(amount)) {
      setErr('Enter a valid non-zero amount');
      return;
    }
    setBusyId(c.id);
    try {
      const d = await adminFetch('/api/admin/customers', {
        method: 'PATCH',
        body: JSON.stringify({ id: c.id, action: 'credit', amount }),
      });
      setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, wallet_balance: d.wallet_balance } : x)));
      flash(`Wallet updated for ${c.email || c.name}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusyId('');
    }
  };

  const changeRole = async (c: Customer, role: Customer['role']) => {
    setBusyId(c.id);
    try {
      await adminFetch('/api/admin/customers', {
        method: 'PATCH',
        body: JSON.stringify({ id: c.id, action: 'role', role }),
      });
      setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, role } : x)));
      flash(`Role updated to ${role}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusyId('');
    }
  };

  const totalWallet = customers.reduce((sum, c) => sum + Number(c.wallet_balance ?? 0), 0);
  const admins = customers.filter((c) => c.role === 'admin').length;

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="People"
        title="Customers"
        description="Search users, credit or debit wallets with a full ledger trail, and manage roles."
      />
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {err && <p className="text-sm text-rose-300">{err}</p>}

      <div className="grid grid-cols-3 gap-3">
        <StatOrb tone="violet" label="Customers" value={String(customers.length)} hint="latest 200" />
        <StatOrb tone="gold" label="Wallet float" value={formatGHS(totalWallet)} hint="sum of balances" />
        <StatOrb tone="emerald" label="Admins" value={String(admins)} />
      </div>

      <GlassPanel>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" />
            <input
              className="fds-input pl-9"
              placeholder="Search by email, phone, or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(search)}
            />
          </div>
          <NexusBtn variant="gold" onClick={() => load(search)}>
            Search
          </NexusBtn>
        </div>
      </GlassPanel>

      <GlassPanel>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-white/50">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading customers…
          </div>
        ) : (
          <NexusTable>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Wallet</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/40">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-semibold text-white">{c.name || '—'}</p>
                      <p className="text-xs text-white/40">{c.email}</p>
                    </td>
                    <td className="text-white/70">{c.phone || '—'}</td>
                    <td className="font-bold text-gold-glow">{formatGHS(Number(c.wallet_balance ?? 0))}</td>
                    <td>
                      <select
                        className="fds-input py-1 text-xs"
                        value={c.role}
                        disabled={busyId === c.id}
                        onChange={(e) => changeRole(c, e.target.value as Customer['role'])}
                      >
                        <option value="user">user</option>
                        <option value="agent">agent</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <NexusBtn
                        variant="ghost"
                        className="text-xs"
                        onClick={() => creditWallet(c)}
                        disabled={busyId === c.id}
                      >
                        Adjust wallet
                      </NexusBtn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </NexusTable>
        )}
      </GlassPanel>
    </NexusPage>
  );
}
