'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '../services/supabaseDatabase';
import { User } from '../types';
import { Loader2, ArrowRight, Package, ShieldCheck, Zap, Wallet } from 'lucide-react';
import { FdsLogo } from '@/components/brand/FdsLogo';
import { SITE } from '@/lib/brand';

interface LoginProps {
  setUser: (user: User) => void;
}

const PERKS = [
  { icon: Package, text: 'Track orders and receipts' },
  { icon: Zap, text: 'Buy data in seconds with MoMo' },
  { icon: Wallet, text: 'Top up wallet & save more' },
  { icon: ShieldCheck, text: 'Secure Moolre payments' },
] as const;

export const Login: React.FC<LoginProps> = ({ setUser }) => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user: User;
      if (isLogin) {
        user = await signIn(formData.email, formData.password);
      } else {
        user = await signUp(formData.email, formData.name, formData.phone);
      }
      setUser(user);
      router.push(user.role === 'admin' ? '/admin' : '/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden min-h-[280px] overflow-hidden lg:flex lg:min-h-screen lg:flex-col lg:justify-between">
        <div className="absolute inset-0">
          <Image
            src={SITE.heroAuth}
            alt={`Customer buying data bundles on ${SITE.shortName}`}
            fill
            sizes="(max-width: 1024px) 0vw, 50vw"
            className="object-cover"
            style={{ objectPosition: '50% 30%' }}
            priority
          />
        </div>

        <div aria-hidden className="absolute inset-0 bg-black/25" />

        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(180deg, rgba(6, 29, 69, 0.88) 0%, rgba(6, 29, 69, 0.3) 38%, rgba(6, 29, 69, 0.4) 62%, rgba(6, 29, 69, 0.92) 100%),
              radial-gradient(ellipse 50% 40% at 15% 10%, rgba(212, 175, 55, 0.15), transparent 55%)
            `,
          }}
        />

        <div className="relative z-10 px-8 pb-4 pt-10 lg:pt-12">
          <FdsLogo size={52} priority linked={false} />
          <h1 className="mt-8 max-w-sm text-3xl font-extrabold tracking-tight text-white">
            Welcome back to{' '}
            <span className="text-aurora">Ghana&apos;s fast data platform.</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
            Sign in to view orders, manage your wallet, or access your admin dashboard.
          </p>
        </div>

        <ul className="relative z-10 space-y-3 px-8 pb-10 lg:pb-12">
          {PERKS.map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/20 text-gold-glow">
                <item.icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-slate-100">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col px-4 py-8 sm:px-6 sm:py-12 lg:items-center lg:justify-center lg:px-12">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <FdsLogo size={36} priority />
          <Link href="/" className="text-xs font-semibold text-gold-dark hover:text-royal">
            Home →
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgba(6,29,69,0.1)]">
            <div className="h-1 gradient-accent" />

            <div className="p-6 sm:p-8">
              <span className="eyebrow text-gold-dark">Account</span>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#111]">
                {isLogin ? 'Sign in' : 'Create account'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isLogin
                  ? 'Access your orders, wallet, and referrals.'
                  : 'Join thousands enjoying fast, reliable data bundles.'}
              </p>

              {error && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#111]">Full name</label>
                      <input
                        name="name"
                        required
                        placeholder="Kwame Mensah"
                        className="flex h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20"
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#111]">Phone number</label>
                      <input
                        name="phone"
                        required
                        placeholder="024 XXX XXXX"
                        className="flex h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20"
                        onChange={handleChange}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#111]">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="flex h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20"
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="password" className="text-sm font-medium text-[#111]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-tay-chat'))}
                      className="text-xs font-semibold text-gold-dark hover:text-royal"
                    >
                      Need help?
                    </button>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="flex h-11 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20"
                    onChange={handleChange}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white gradient-accent shadow-lg shadow-gold/25 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      {isLogin ? 'Sign in' : 'Get started'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    or
                  </span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/"
                  className="flex h-10 items-center justify-center rounded-xl border border-border bg-slate-50 text-xs font-semibold text-royal hover:border-gold/40"
                >
                  Browse bundles
                </Link>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-tay-chat'))}
                  className="flex h-10 items-center justify-center rounded-xl border border-border bg-slate-50 text-xs font-semibold text-royal hover:border-gold/40"
                >
                  Chat with Tay
                </button>
              </div>
            </div>

            <div className="border-t border-border bg-slate-50/80 px-6 py-4 text-center sm:px-8">
              <p className="text-sm text-muted">
                {isLogin ? 'New to Fast Data Services? ' : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="font-semibold text-gold-dark hover:text-royal"
                >
                  {isLogin ? 'Create account' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-muted">
            <Link href="/" className="font-semibold text-[#111] hover:text-gold-dark">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
