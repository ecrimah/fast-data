import { NextResponse } from 'next/server';
import { initMoolrePayment } from '@/lib/moolre-payment';
import { resolvePublicAppUrl } from '@/lib/moolre-app-url';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, customerEmail, payerPhone } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing orderId' }, { status: 400 });
    }

    const baseUrl = resolvePublicAppUrl(new URL(req.url).origin);
    const result = await initMoolrePayment({ orderId, customerEmail, baseUrl, payerPhone });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url: result.url ?? null,
      promptSent: result.promptSent ?? false,
      payer: result.payer ?? null,
      reference: result.reference ?? null,
      message: result.message ?? null,
    });
  } catch (error) {
    console.error('[Moolre init]', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
