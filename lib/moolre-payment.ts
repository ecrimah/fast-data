import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export async function initMoolrePayment(args: {
  orderId: string;
  customerEmail?: string;
  baseUrl: string;
}): Promise<{ success: boolean; url?: string; message?: string }> {
  if (!process.env.MOOLRE_API_USER || !process.env.MOOLRE_API_PUBKEY || !process.env.MOOLRE_ACCOUNT_NUMBER) {
    return { success: false, message: 'Moolre payment is not configured' };
  }

  if (!hasSupabaseAdminConfig()) {
    return { success: false, message: 'Database not configured' };
  }

  const supabase = createServiceClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, payment_ref, amount, payment_status')
    .or(`id.eq.${args.orderId},payment_ref.eq.${args.orderId}`)
    .single();

  if (error || !order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.payment_status === 'paid') {
    return { success: false, message: 'Order already paid' };
  }

  const baseUrl = args.baseUrl.replace(/\/+$/, '');
  const uniqueRef = `${order.payment_ref}-R${Date.now()}`;

  const payload = {
    type: 1,
    amount: String(order.amount),
    email: process.env.MOOLRE_MERCHANT_EMAIL || args.customerEmail || 'payments@fastdataservices.com',
    externalref: uniqueRef,
    callback: `${baseUrl}/api/payment/moolre/callback`,
    redirect: `${baseUrl}/success?order=${encodeURIComponent(order.payment_ref)}&payment_success=true`,
    reusable: '0',
    currency: 'GHS',
    accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
    metadata: {
      original_payment_ref: order.payment_ref,
      order_id: order.id,
    },
  };

  const response = await fetch('https://api.moolre.com/embed/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-USER': process.env.MOOLRE_API_USER,
      'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (result.status === 1 && result.data?.authorization_url) {
    return { success: true, url: result.data.authorization_url };
  }

  return { success: false, message: result.message || 'Failed to generate payment link' };
}
