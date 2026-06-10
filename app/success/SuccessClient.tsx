'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const orderRef = searchParams.get('order');
  const paymentSuccess = searchParams.get('payment_success') === 'true';

  useEffect(() => {
    if (orderRef && paymentSuccess) {
      fetch('/api/payment/moolre/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentRef: orderRef }),
      }).catch(() => {});
    }
  }, [orderRef, paymentSuccess]);

  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="mb-4 rounded-full bg-emerald-100 p-4">
        <CheckCircle className="h-16 w-16 text-emerald-600" />
      </div>
      <h1 className="display-2 text-royal">Order received!</h1>
      <p className="mt-3 max-w-md text-muted">
        {paymentSuccess
          ? 'Payment confirmed. Your bundle is being delivered — usually within 2–10 minutes.'
          : 'Your order has been received. We will deliver your data bundle shortly.'}
      </p>
      {paymentSuccess && orderRef && (
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
