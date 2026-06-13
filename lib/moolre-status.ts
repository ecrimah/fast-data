import 'server-only';

export type MoolreStatusResult = {
  paid: boolean;
  pending: boolean;
  notFound: boolean;
  raw: unknown;
  error?: string;
};

/** Poll Moolre for the status of a payment attempt ref (FDS-xxx-R{ts}). */
export async function checkMoolrePaymentStatus(externalRef: string): Promise<MoolreStatusResult> {
  if (!process.env.MOOLRE_API_USER || !process.env.MOOLRE_API_PUBKEY || !process.env.MOOLRE_ACCOUNT_NUMBER) {
    return { paid: false, pending: false, notFound: false, raw: null, error: 'Moolre not configured' };
  }

  try {
    const res = await fetch('https://api.moolre.com/open/transact/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-USER': process.env.MOOLRE_API_USER,
        'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY,
      },
      body: JSON.stringify({
        type: 1,
        idtype: '1',
        id: externalRef,
        accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
      }),
    });

    const raw = await res.json().catch(() => ({}));
    const txstatus = Number((raw as { data?: { txstatus?: number } })?.data?.txstatus);
    const paid = (raw as { status?: number }).status === 1 && txstatus === 1;
    const notFound = txstatus === 3 || String((raw as { message?: string }).message || '').toLowerCase().includes('not found');
    const pending = !paid && !notFound;

    return { paid, pending, notFound, raw };
  } catch (e) {
    return {
      paid: false,
      pending: false,
      notFound: false,
      raw: null,
      error: e instanceof Error ? e.message : 'Status check failed',
    };
  }
}

/** When moolre_external_ref was not stored, scan likely refs (payment link created ~0–3 min after order). */
export async function discoverPaidExternalRef(paymentRef: string): Promise<string | null> {
  const ts = Number(paymentRef.replace(/^FDS-/, ''));
  if (!Number.isFinite(ts)) return null;

  for (let offset = 0; offset <= 180_000; offset += 1_000) {
    const ref = `${paymentRef}-R${ts + offset}`;
    const status = await checkMoolrePaymentStatus(ref);
    if (status.paid) return ref;
    if (status.error) return null;
  }
  return null;
}
