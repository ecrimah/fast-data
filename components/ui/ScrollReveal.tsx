'use client';

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';

const VARIANT_CLASS: Record<Variant, string> = {
  up: 'scroll-reveal-up',
  down: 'scroll-reveal-down',
  left: 'scroll-reveal-left',
  right: 'scroll-reveal-right',
  scale: 'scroll-reveal-scale',
  fade: 'scroll-reveal-fade',
};

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  delay?: number;
  as?: ElementType;
  style?: CSSProperties;
};

export function ScrollReveal({
  children,
  className,
  variant = 'up',
  delay = 0,
  as: Tag = 'div',
  style,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn(
        'scroll-reveal',
        VARIANT_CLASS[variant],
        visible && 'scroll-reveal-visible',
        className
      )}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
