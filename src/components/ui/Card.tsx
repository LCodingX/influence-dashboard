import { type ReactNode } from 'react';

interface CardProps {
  title?: string;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, header, children, className = '' }: CardProps) {
  const hasHeader = title || header;

  return (
    <div
      className={[
        'rounded-lg border border-navy-700 bg-navy-800',
        'transition-colors duration-150',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasHeader && (
        <div className="flex items-center justify-between border-b border-navy-700 px-5 py-4">
          {title && (
            <h3 className="text-sm font-semibold text-slate-50">{title}</h3>
          )}
          {header}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
