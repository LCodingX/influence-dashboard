import {
  type ReactNode,
  type MouseEvent,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  className = '',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: Event) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setOpen(false);
    }
  }, []);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleClickOutside, handleEscape]);

  const handleToggle = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    setOpen((prev) => !prev);
  }, []);

  const handleItemClick = useCallback(
    (onClick: () => void) => {
      return () => {
        onClick();
        setOpen(false);
      };
    },
    []
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        onClick={handleToggle}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-md"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open && (
        <div
          className={[
            'absolute z-50 mt-1 min-w-[180px] rounded-lg border border-navy-700 bg-navy-800 py-1 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={handleItemClick(item.onClick)}
              className={[
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:bg-navy-700',
                item.danger
                  ? 'text-rose-500 hover:bg-rose-500/10'
                  : 'text-slate-300 hover:bg-navy-700 hover:text-slate-50',
              ].join(' ')}
              role="menuitem"
            >
              {item.icon && (
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
