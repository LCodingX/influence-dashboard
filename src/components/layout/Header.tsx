import { useState, useRef, useEffect, useCallback } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';

interface HeaderUser {
  display_name: string | null;
  avatar_url: string | null;
}

interface HeaderProps {
  user: HeaderUser;
  onSignOut: () => void;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Header({ user, onSignOut }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, handleClickOutside]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-navy-700 bg-navy-800 px-4">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-slate-50">
          Influence Dashboard
        </span>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-navy-700"
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name ?? 'User avatar'}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
              {getInitials(user.display_name)}
            </div>
          )}
          <span className="hidden text-sm text-slate-50 sm:inline">
            {user.display_name ?? 'User'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-navy-700 bg-navy-800 py-1 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 transition-colors duration-150 hover:bg-navy-700 hover:text-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
