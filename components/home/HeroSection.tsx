'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, MessageCircle, Bot } from 'lucide-react';
import { SITE } from '@/lib/brand';
import { cn } from '@/lib/utils';

const SLIDES = SITE.heroSlides;
const INTERVAL_MS = 6000;

export function HeroSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollToShop = () => {
    document.getElementById('shop-bundles')?.scrollIntoView({ behavior: 'smooth' });
  };

  const openTayChat = () => {
    window.dispatchEvent(new CustomEvent('open-tay-chat'));
  };

  const next = useCallback(() => {
    setActive((i) => (i + 1) % SLIDES.length);
  }, []);

  const prev = useCallback(() => {
    setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <section
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide backgrounds */}
      <div className="absolute inset-0 -z-20">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className={cn(
              'absolute inset-0 transition-opacity duration-1000 ease-in-out',
              i === active ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: '62% 28%' }}
            />
          </div>
        ))}
      </div>

      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `
            linear-gradient(95deg,
              rgba(8, 31, 63, 0.94) 0%,
              rgba(8, 31, 63, 0.88) 32%,
              rgba(10, 46, 93, 0.55) 55%,
              rgba(10, 46, 93, 0.25) 78%,
              rgba(8, 31, 63, 0.45) 100%),
            linear-gradient(180deg,
              rgba(8, 31, 63, 0.0) 0%,
              rgba(8, 31, 63, 0.0) 55%,
              rgba(8, 31, 63, 0.88) 100%)
          `,
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 50% 40% at 8% 20%, rgba(212, 175, 55, 0.14), transparent 70%),
            radial-gradient(ellipse 40% 30% at 85% 15%, rgba(212, 175, 55, 0.08), transparent 65%)
          `,
        }}
      />

      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 30% 0%, black, transparent 75%)',
        }}
      />

      <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col px-4 pb-6 pt-10 sm:min-h-[580px] sm:px-6 lg:min-h-[620px] lg:px-8 lg:pb-8 lg:pt-14">
        <div className="flex flex-1 items-center">
          <div className="reveal-up mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 backdrop-blur lg:mx-0">
              <span className="pulse-dot" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-glow">
                Live · Powered by Tay AI
              </span>
            </div>

            <h1
              className="mt-5 text-[clamp(1.875rem,3vw+0.75rem,3.25rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-white"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.55)' }}
            >
              Smart data for Ghana.
              <br />
              <span className="text-aurora">Delivered in minutes.</span>
            </h1>

            <p
              className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-100 lg:mx-0 md:text-base"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.45)' }}
            >
              {SITE.description} Choose your network, pay with MoMo, and let Tay help you order or track anytime.
            </p>

            <ul className="mt-5 hidden flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-200 sm:flex">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-gold-glow" />
                Secure Moolre payments
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-gold-glow" />
                Non-expiry bundles
              </li>
              <li className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-gold-glow" />
                Tay AI support 24/7
              </li>
            </ul>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <button
                type="button"
                onClick={scrollToShop}
                className="group pop-hover inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white gradient-accent shadow-lg shadow-gold/30 sm:w-auto"
              >
                Browse bundles
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={openTayChat}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15 sm:w-auto"
              >
                <MessageCircle className="h-4 w-4 text-gold-glow" />
                Chat with Tay
              </button>
            </div>

            <p className="mt-4 text-[11px] text-slate-300">
              New here?{' '}
              <Link href="/login" className="font-semibold text-gold-glow underline-offset-4 hover:underline">
                Create a free account
              </Link>{' '}
              for wallet payments & referrals.
            </p>
          </div>
        </div>

        {/* Slider controls */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                aria-label={`Go to slide ${i + 1}: ${slide.caption}`}
                aria-current={i === active ? 'true' : undefined}
                onClick={() => setActive(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === active ? 'w-8 bg-gold-glow' : 'w-1.5 bg-white/30 hover:bg-white/50'
                )}
              />
            ))}
            <span className="ml-2 hidden text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:inline">
              {SLIDES[active].caption}
            </span>
          </div>

          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={prev}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={next}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 sm:grid-cols-4 sm:gap-6">
          <Metric label="Networks" value="3" delay={0} />
          <Metric label="Avg delivery" value="< 2 min" delay={80} />
          <Metric label="Bundle types" value="15+" delay={160} />
          <Metric label="AI assistant" value="Tay" delay={240} />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, delay = 0 }: { label: string; value: string; delay?: number }) {
  return (
    <div
      className="min-w-0 text-center sm:text-left animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <p className="num text-lg font-extrabold leading-none text-white sm:text-xl">{value}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}
