import 'server-only';

/**
 * Public site URL used for Moolre callback + redirect links.
 * Apex fastdataservices.store 308-redirects POST webhooks and drops the body,
 * so we always normalize to www for this domain.
 */
export function resolvePublicAppUrl(fallbackOrigin?: string): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || 'https://www.fastdataservices.store')
    .trim()
    .replace(/\/+$/, '');

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();

    // Never send Moolre callbacks to the apex — POST bodies are lost on redirect.
    if (host === 'fastdataservices.store') {
      url.hostname = 'www.fastdataservices.store';
    }

    return url.origin;
  } catch {
    return 'https://www.fastdataservices.store';
  }
}

export function moolreCallbackUrl(fallbackOrigin?: string): string {
  return `${resolvePublicAppUrl(fallbackOrigin)}/api/payment/moolre/callback`;
}

export function moolreSuccessRedirectUrl(paymentRef: string, fallbackOrigin?: string): string {
  const base = resolvePublicAppUrl(fallbackOrigin);
  return `${base}/success?order=${encodeURIComponent(paymentRef)}&payment_success=true`;
}
