'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Order, PaymentStatus } from '../types';
import { getOrderStatus } from '../services/supabaseDatabase';
import { getPaymentPendingState, setSuccessOrderState } from '@/lib/navigationState';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const PaymentPending: React.FC = () => {
  const router = useRouter();
  const [state, setState] = useState<{ order: Order; transactionRef: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const pendingState = getPaymentPendingState();
    setState(pendingState);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!state) {
      router.push('/');
      return;
    }

    const { order } = state;

    const pollInterval = setInterval(async () => {
      try {
        const updatedOrder = await getOrderStatus(order.id);

        if (updatedOrder && updatedOrder.payment_status === PaymentStatus.PAID) {
          setStatus('success');
          clearInterval(pollInterval);
          setSuccessOrderState(updatedOrder);
          setTimeout(() => router.push('/success'), 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000);

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(pollInterval);
          clearInterval(timerInterval);
          setStatus('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [ready, state, router]);

  if (!ready) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-brand-600" size={48} />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-400">
        Invalid payment session.{' '}
        <button onClick={() => router.push('/')} className="text-brand-600 underline">
          Go Home
        </button>
      </div>
    );
  }

  const { order } = state;

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
        {status === 'pending' && (
          <>
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Verifying Payment</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              We're confirming your payment with Paystack. This usually takes a few seconds.
            </p>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Checking status... ({timeLeft}s remaining)
              </span>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Reference: {order.payment_ref}
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Payment Verified!</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your payment has been successfully verified. Redirecting to success page...
            </p>
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Reference: {order.payment_ref}
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Verification Timeout</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              We couldn't verify your payment within the expected time. Please check your Paystack dashboard or contact support.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/wallet')}
                className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 dark:hover:bg-brand-500 transition-colors"
              >
                Check Wallet
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Contact Support
              </button>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-4">
              Reference: {order.payment_ref}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
