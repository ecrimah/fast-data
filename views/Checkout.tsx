'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bundle, Network, User, PaymentStatus } from '../types';
import { createOrder } from '../services/supabaseDatabase';
import { supabase } from '../services/supabaseClient';
import { getCheckoutState } from '@/lib/navigationState';
import { Loader2, Smartphone, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutProps {
  user: User | null;
}

const networkBar = (network: Network) => {
  if (network === Network.MTN) return 'bg-mtn';
  if (network === Network.VODAFONE) return 'bg-telecel';
  return 'bg-at';
};

export const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const router = useRouter();
  const [checkoutState, setCheckoutState] = useState<{ bundle: Bundle; network: Network } | null>(null);
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'moolre' | 'wallet'>('moolre');

  useEffect(() => {
    setCheckoutState(getCheckoutState());
    setPhone(user?.phone || '');
    setReady(true);
  }, [user?.phone]);

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-royal" size={48} />
      </div>
    );
  }

  if (!checkoutState) {
    return (
      <div className="card-elevated mx-auto max-w-lg p-8 text-center">
        <p className="text-muted">Invalid checkout session.</p>
        <button onClick={() => router.push('/')} className="mt-4 text-sm font-bold text-royal underline">
          Back to shop
        </button>
      </div>
    );
  }

  const { bundle, network } = checkoutState;

  const handlePayment = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      setError('Please enter a valid Ghana phone number.');
      return;
    }
    if (!user && paymentMethod === 'wallet') {
      setError('Sign in to pay with your wallet.');
      return;
    }

    setLoading(true);
    try {
      const orderUser =
        user ||
        ({
          id: 'guest',
          email: 'guest@fastdataservices.com',
          name: 'Guest',
          role: 'user',
          wallet_balance: 0,
          referral_code: '',
          created_at: '',
        } as User);

      if (paymentMethod === 'moolre') {
        const order = await createOrder(
          orderUser,
          network,
          bundle.size,
          phone,
          'moolre',
          PaymentStatus.PENDING
        );
        const paymentRes = await fetch('/api/payment/moolre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, customerEmail: orderUser.email }),
        });
        const paymentResult = await paymentRes.json();
        if (!paymentResult.success || !paymentResult.url) {
          throw new Error(paymentResult.message || 'Could not start Moolre payment');
        }
        window.location.href = paymentResult.url;
        return;
      }

      const order = await createOrder(orderUser, network, bundle.size, phone, 'wallet', PaymentStatus.PAID);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Please sign in again');

      const dispatchRes = await fetch('/api/orders/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!dispatchRes.ok) {
        const d = await dispatchRes.json().catch(() => ({}));
        throw new Error(d.error || 'Could not dispatch order');
      }
      router.push('/success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-4">
      <p className="eyebrow text-gold-dark">Secure checkout</p>
      <h1 className="display-2 mt-2 text-royal">Complete your order</h1>

      <div className="card-elevated mt-8 overflow-hidden">
        <div className={cn('h-1', networkBar(network))} />
        <div className="border-b border-border bg-slate-50 p-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Package</span>
            <span className="font-bold text-royal">
              {network} · {bundle.size} GB
            </span>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-muted">Total</span>
            <span className="text-2xl font-extrabold text-gold-dark">GH₵ {bundle.price.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-royal">Beneficiary number</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-3 text-muted" size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="024 XXX XXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('moolre')}
              className={cn(
                'flex flex-col items-center rounded-xl border p-4 text-sm font-semibold transition-all',
                paymentMethod === 'moolre'
                  ? 'border-gold bg-gold/10 text-royal ring-1 ring-gold/40'
                  : 'border-border text-muted hover:border-gold/30'
              )}
            >
              <CreditCard className="mb-2" />
              Moolre MoMo
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('wallet')}
              disabled={!user}
              className={cn(
                'flex flex-col items-center rounded-xl border p-4 text-sm font-semibold transition-all',
                paymentMethod === 'wallet'
                  ? 'border-gold bg-gold/10 text-royal ring-1 ring-gold/40'
                  : !user
                    ? 'cursor-not-allowed opacity-50'
                    : 'border-border text-muted'
              )}
            >
              <Wallet className="mb-2" />
              Wallet
              {user && <span className="mt-1 text-xs">GH₵ {user.wallet_balance.toFixed(2)}</span>}
            </button>
          </div>

          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            className="susu-btn-gold flex w-full items-center justify-center gap-2 py-4 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Confirm & Pay'}
          </button>
        </div>
      </div>
    </div>
  );
};
