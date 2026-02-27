import { type ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-navy-700 text-slate-300',
  success: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
  error: 'bg-rose-500/15 text-rose-500 border-rose-500/25',
  info: 'bg-blue-500/15 text-blue-500 border-blue-500/25',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        'transition-colors duration-150',
        variantClasses[variant],
        variant === 'default' ? 'border-navy-700' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
