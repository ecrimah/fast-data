'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { SITE } from '@/lib/brand';

const DISMISS_KEY = 'fds-pwa-install-dismissed';
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches || isIos();
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function dismissPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), isMobile() ? 2500 : 5000);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS has no beforeinstallprompt — show manual instructions on mobile Safari.
    if (isIos() && isMobile()) {
      const timer = window.setTimeout(() => setVisible(true), 4000);
      setIosHint(true);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const close = useCallback(() => {
    dismissPrompt();
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (iosHint || !deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      } else {
        dismissPrompt();
        setVisible(false);
      }
    } catch {
      /* prompt unavailable */
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt, iosHint]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-fade-in-up sm:flex sm:justify-center"
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
    >
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-gold/30 bg-royal shadow-2xl shadow-black/30">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Dismiss install prompt"
        >
          <X size={18} />
        </button>

        <div className="flex gap-4 p-5 pr-12">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-gold/40">
            <img src={SITE.icon} alt="" className="h-10 w-10 rounded-lg" />
          </div>
          <div className="min-w-0">
            <h2 id="pwa-install-title" className="font-bold text-white">
              Add {SITE.shortName} to your home screen
            </h2>
            <p id="pwa-install-desc" className="mt-1 text-sm leading-relaxed text-white/75">
              {iosHint
                ? 'Install the app for faster checkout, one-tap access, and order tracking.'
                : 'Get quick access to buy data bundles, track orders, and chat with Tay — like a native app.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 bg-black/20 px-5 py-4">
          {iosHint ? (
            <div className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-3 text-sm text-white/85">
              <Share className="mt-0.5 shrink-0 text-gold-glow" size={18} />
              <span>
                Tap <strong className="text-gold-glow">Share</strong> in Safari, then{' '}
                <strong className="text-gold-glow">Add to Home Screen</strong>.
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={install}
              disabled={installing || !deferredPrompt}
              className="flex w-full items-center justify-center gap-2 rounded-xl susu-btn-gold py-3 text-sm font-bold disabled:opacity-60"
            >
              {installing ? (
                'Installing…'
              ) : (
                <>
                  <Download size={18} />
                  Install app
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={close}
            className="w-full py-2 text-center text-xs font-medium text-white/50 hover:text-white/80"
          >
            Not now
          </button>
        </div>

        {!iosHint && (
          <div className="flex items-center justify-center gap-1.5 border-t border-white/5 py-2 text-[10px] text-white/40">
            <Smartphone size={12} />
            Works on Android &amp; desktop Chrome
          </div>
        )}
      </div>
    </div>
  );
}
