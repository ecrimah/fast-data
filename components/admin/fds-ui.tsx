import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function NexusPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('fds-nexus-page space-y-5', className)}>{children}</div>;
}

export function NexusHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="fds-nexus-header">
      <div className="min-w-0">
        {eyebrow && <p className="fds-eyebrow">{eyebrow}</p>}
        <h1 className="fds-title">{title}</h1>
        {description && <p className="fds-subtitle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function GlassPanel({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: 'gold' | 'emerald' | 'sky' | 'rose';
}) {
  return (
    <div className={cn('fds-glass', glow && `fds-glass-glow-${glow}`, className)}>{children}</div>
  );
}

export function StatOrb({
  label,
  value,
  hint,
  tone = 'gold',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'gold' | 'emerald' | 'sky' | 'rose' | 'violet';
}) {
  return (
    <div className={cn('fds-stat-orb', `fds-stat-orb-${tone}`)}>
      <p className="fds-stat-orb-label">{label}</p>
      <p className="fds-stat-orb-value">{value}</p>
      {hint && <p className="fds-stat-orb-hint">{hint}</p>}
    </div>
  );
}

export function NexusPill({
  tone,
  children,
}: {
  tone: 'success' | 'warn' | 'danger' | 'neutral' | 'info';
  children: ReactNode;
}) {
  return <span className={cn('fds-pill', `fds-pill-${tone}`)}>{children}</span>;
}

export function NexusBtn({
  children,
  variant = 'gold',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'gold' | 'ghost' | 'danger' }) {
  return (
    <button type="button" className={cn('fds-btn', `fds-btn-${variant}`, className)} {...props}>
      {children}
    </button>
  );
}

export function NexusTable({ children }: { children: ReactNode }) {
  return (
    <div className="fds-table-wrap overflow-x-auto">
      <table className="fds-table w-full text-sm">{children}</table>
    </div>
  );
}

export function EmptyNexus({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="fds-empty py-12 text-center">
      {icon && <div className="mx-auto mb-3 opacity-40">{icon}</div>}
      <p className="font-bold text-white/90">{title}</p>
      {description && <p className="mt-1 text-xs text-white/45">{description}</p>}
    </div>
  );
}
