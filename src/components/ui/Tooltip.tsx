import { type ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  position?: TooltipPosition;
  children: ReactNode;
  className?: string;
}

const positionClasses: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-navy-700 border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-navy-700 border-l-transparent border-r-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-navy-700 border-t-transparent border-b-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-navy-700 border-t-transparent border-b-transparent border-l-transparent',
};

export function Tooltip({
  content,
  position = 'top',
  children,
  className = '',
}: TooltipProps) {
  return (
    <div className={`relative inline-flex group ${className}`}>
      {children}
      <div
        className={[
          'absolute z-50 pointer-events-none',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-150',
          positionClasses[position],
        ].join(' ')}
        role="tooltip"
      >
        <div className="relative whitespace-nowrap rounded-md bg-navy-700 px-3 py-1.5 text-xs text-slate-50 shadow-lg">
          {content}
          <span
            className={`absolute border-4 ${arrowClasses[position]}`}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
