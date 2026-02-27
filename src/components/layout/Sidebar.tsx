import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FlaskConical,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4.5 w-4.5" />,
  },
  {
    to: '/experiments',
    label: 'Experiments',
    icon: <FlaskConical className="h-4.5 w-4.5" />,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <Settings className="h-4.5 w-4.5" />,
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={[
        'fixed left-0 top-14 bottom-0 z-40 flex flex-col border-r border-navy-700 bg-navy-800',
        'transition-[width] duration-150',
        collapsed ? 'w-14' : 'w-56',
      ].join(' ')}
    >
      <nav className="flex flex-1 flex-col gap-1 px-2 pt-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                'transition-colors duration-150',
                isActive
                  ? 'border-l-2 border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-l-2 border-transparent text-slate-400 hover:bg-navy-700 hover:text-slate-50',
                collapsed ? 'justify-center px-0' : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-navy-700 px-2 py-2">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-slate-400 transition-colors duration-150 hover:bg-navy-700 hover:text-slate-50"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
