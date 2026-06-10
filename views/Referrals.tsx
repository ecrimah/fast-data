'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User } from '../types';
import { Copy, Gift, Users, Lock, Loader2, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../services/supabaseClient';
import { getReferralsEnabled } from '../services/supabaseDatabase';
import { SITE } from '@/lib/brand';

interface ReferralProps {
  user: User | null;
}

interface ReferralStats {
  enabled: boolean;
  code: string;
  invited: number;
  earned: number;
}

export const Referrals: React.FC<ReferralProps> = ({ user }) => {
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const enabled = await getReferralsEnabled();
        if (!enabled) {
          setStats({ enabled: false, code: '', invited: 0, earned: 0 });
          setLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setStats({ enabled: true, code: user?.referral_code ?? '', invited: 0, earned: 0 });
          setLoading(false);
          return;
        }

        const res = await fetch('/api/referrals/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        setStats(data);
      } catch {
        setStats({ enabled: false, code: '', invited: 0, earned: 0 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-royal" size={48} />
      </div>
    );
  }

  if (!stats?.enabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6 rounded-full bg-slate-100 p-8">
          <Lock className="h-16 w-16 text-slate-400" />
          <span className="absolute -bottom-2 -right-2 rounded-full bg-royal px-3 py-1 text-xs font-bold text-white shadow-lg">
            Soon
          </span>
        </div>
        <h2 className="text-3xl font-extrabold text-royal">Coming Soon</h2>
        <p className="mt-3 max-w-md text-sm text-muted">
          Our referral program is being rolled out. Check back shortly to invite friends and earn wallet rewards.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-16 text-center">
        <Gift className="mx-auto h-12 w-12 text-gold-dark" />
        <h2 className="mt-4 text-2xl font-extrabold text-royal">Join our Referral Program</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Sign in to get your unique code and earn GH₵ rewards when friends make their first purchase.
        </p>
        <Link href="/login" className="susu-btn-gold mt-6 inline-flex px-6 py-3 text-sm font-bold">
          Sign in to start
        </Link>
      </div>
    );
  }

  const code = stats.code || user.referral_code;
  const shareText = `Buy cheap non-expiry data bundles on ${SITE.name}! Use my code ${code} when you sign up: ${SITE.url}/login`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    if (navigator.share) {
      await navigator.share({ title: SITE.name, text: shareText, url: SITE.url });
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#081F3F] to-[#0A2E5D] p-8 text-center text-white md:p-12">
        <div className="relative z-10 mx-auto max-w-2xl">
          <span className="eyebrow text-gold-glow">Refer &amp; earn</span>
          <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">Invite friends, earn wallet credit</h1>
          <p className="mt-3 text-sm text-slate-300">
            Share your code. When a friend signs up and completes their first paid order, you earn wallet credit instantly.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur">
            <span className="px-4 font-mono text-xl font-bold tracking-wider text-gold-glow">{code}</span>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-xl bg-white p-2.5 text-royal transition hover:bg-gold/20"
              aria-label="Copy referral code"
            >
              <Copy size={20} />
            </button>
            <button
              type="button"
              onClick={shareCode}
              className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-white transition hover:bg-white/20"
              aria-label="Share referral code"
            >
              <Share2 size={20} />
            </button>
          </div>
          {copied && <p className="mt-2 text-xs text-emerald-300">Copied to clipboard!</p>}
        </div>
        <Gift className="absolute -left-4 top-8 h-40 w-40 rotate-12 text-white/5" />
        <Users className="absolute -bottom-4 -right-4 h-36 w-36 -rotate-12 text-white/5" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-elevated p-6">
          <h3 className="font-bold text-royal">How it works</h3>
          <ul className="mt-4 space-y-4 text-sm text-muted">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold-dark">1</span>
              Copy your referral code above.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold-dark">2</span>
              Friends enter it when they create an account.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold-dark">3</span>
              You earn wallet credit after their first paid order.
            </li>
          </ul>
        </div>

        <div className="card-elevated p-6">
          <h3 className="font-bold text-royal">Your stats</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-2xl font-extrabold text-royal">{stats.invited}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Friends invited</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-2xl font-extrabold text-gold-dark">GH₵ {stats.earned.toFixed(2)}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Rewards earned</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/wallet')}
            className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-bold text-royal hover:bg-slate-50"
          >
            View wallet balance
          </button>
        </div>
      </div>
    </div>
  );
};
