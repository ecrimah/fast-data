'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SESSION_KEY = 'fds_visitor_sid';
const LANDING_KEY = 'fds_visitor_landing';

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        (crypto?.randomUUID?.() as string) ||
        `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `v_${Date.now().toString(36)}`;
  }
}

function parseUtm(): Record<string, string> {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 120);
    });
    return utm;
  } catch {
    return {};
  }
}

/** Records every visit (one row per browser) so the admin can see and reach out to leads. */
export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track the admin dashboard itself.
    if (pathname?.startsWith('/admin')) return;

    try {
      const sessionId = getSessionId();
      let landing = sessionStorage.getItem(LANDING_KEY);
      if (!landing) {
        landing = pathname || '/';
        sessionStorage.setItem(LANDING_KEY, landing);
      }

      const payload = {
        sessionId,
        intent: 'visited',
        landingPage: landing,
        lastPage: pathname || '/',
        referrer: document.referrer || null,
        utm: parseUtm(),
      };

      const body = JSON.stringify(payload);
      // Prefer sendBeacon so it survives navigation; fall back to fetch.
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
          () => {}
        );
      }
    } catch {
      // tracking must never break the page
    }
  }, [pathname]);

  return null;
}

/** Enrich the current visitor row with intent/phone (e.g. on checkout). Safe no-op on failure. */
export function trackIntent(data: {
  intent?: 'browsed' | 'checkout_started' | 'abandoned' | 'purchased';
  phone?: string;
  name?: string;
  interestNetwork?: string;
  interestBundle?: string;
}) {
  try {
    const sessionId = getSessionId();
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, lastPage: window.location.pathname, ...data }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
