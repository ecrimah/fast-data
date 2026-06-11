'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Clock } from 'lucide-react';

type VerifyState = 'verifying' | 'paid' | 'pending';

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const orderRef = searchParams.get('order');
  const paymentSuccess = searchParams.get('payment_success') === 'true';
  const [state, setState] = useState<VerifyState>(paymentSuccess ? 'verifying' : 'pending');

  useEffect(() => {
    if (!orderRef || !paymentSuccess) return;

    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      try {
        const res = await fetch('/api/payment/moolre/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentRef: orderRef }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (data?.success || data?.payment_status === 'paid') {
          setState('paid');
          return;
        }
      } catch {
        // ignore and retry
      }

      if (cancelled) return;
      // Retry a few times (the callback may land a moment after redirect).
      if (attempts < 5) {
        setTimeout(check, 3000);
      } else {
        setState('pending');
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [orderRef, paymentSuccess]);

  const isPaid = state === 'paid';
  const isVerifying = state === 'verifying';

  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className={`mb-4 rounded-full p-4 ${isPaid ? 'bg-emerald-100' : 'bg-amber-100'}`}>
        {isPaid ? (
          <CheckCircle className="h-16 w-16 text-emerald-600" />
        ) : isVerifying ? (
          <Loader2 className="h-16 w-16 animate-spin text-amber-500" />
        ) : (
          <Clock className="h-16 w-16 text-amber-500" />
        )}
      </div>

      <h1 className="display-2 text-royal">
        {isPaid ? 'Payment confirmed!' : 'Order received!'}
      </h1>

      <p className="mt-3 max-w-md text-muted">
        {isPaid
          ? 'Your payment is confirmed and your bundle is being delivered — usually within 2–10 minutes.'
          : isVerifying
            ? 'Confirming your payment with Mobile Money…'
            : 'Your order is received. If you completed payment, it will be confirmed shortly and your data delivered. You can close this page.'}
      </p>

      {isVerifying && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="animate-spin" size={16} /> Verifying payment…
        </p>
      )}

      <Link href="/" className="susu-btn-gold mt-8 inline-block">
        Continue shopping
      </Link>
    </div>
  );
}
