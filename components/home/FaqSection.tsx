'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { FAQS } from '@/lib/faqs';
import { cn } from '@/lib/utils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  const faqs = FAQS.slice(0, 6);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="faq-heading">
      <FaqJsonLd faqs={faqs} />
      <ScrollReveal variant="up">
        <div className="text-center">
          <span className="eyebrow text-gold-dark">Questions &amp; answers</span>
          <h2 id="faq-heading" className="display-2 mt-2 text-royal">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-sm text-muted">
            Everything you need to know about buying data bundles in Ghana.
          </p>
        </div>
      </ScrollReveal>

      <div className="mt-8 space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = open === i;
          return (
            <ScrollReveal key={faq.q} variant="up" delay={i * 60}>
            <div
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-bold text-royal sm:text-base">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-gold-dark transition-transform duration-300',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              <div
                className={cn(
                  'grid transition-all duration-300 ease-in-out',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              </div>
            </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
