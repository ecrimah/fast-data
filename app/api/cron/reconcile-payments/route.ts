import { NextResponse } from 'next/server';
import { reconcilePendingPayments } from '@/lib/reconcile-pending-payments';

/** Vercel cron: poll Moolre for paid-but-unmatched orders every few minutes. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await reconcilePendingPayments(100);
  return NextResponse.json({ ok: true, ...result });
}
