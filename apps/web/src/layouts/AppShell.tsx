import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '@messenger/ui';
import {
  Radio,
  MessagesSquare,
  Briefcase,
  Users,
  Bell,
  Settings,
  Car,
} from 'lucide-react';

const navigation = [
  { id: 'line', label: 'Линия', icon: Radio, path: '/' },
  { id: 'chats', label: 'Чаты', icon: MessagesSquare, path: '/chats' },
  { id: 'shifts', label: 'Смены', icon: Briefcase, path: '/shifts' },
  { id: 'crew', label: 'Экипаж', icon: Users, path: '/crew' },
  { id: 'signals', label: 'Сигналы', icon: Bell, path: '/signals', badge: 3 },
];

const secondaryNavigation = [
  { id: 'settings', label: 'Панель парка', icon: Settings, path: '/settings' },
];

export function AppShell() {
  return (
    <div className="flex h-screen bg-bg-app">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border-soft bg-bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border-soft px-4">
          <Car className="h-8 w-8 text-accent-yellow" strokeWidth={1.5} />
          <div>
            <h1 className="text-base font-semibold text-text-primary">Мессенджер</h1>
            <p className="text-xs text-text-muted">Парк Онлайн</p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-bg-hover text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-yellow" />
                  )}
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn('h-5 w-5 transition-colors', isActive ? 'text-accent-yellow' : '')}
                      strokeWidth={1.5}
                    />
                    {item.label}
                  </div>
                  {item.badge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-semantic-error px-1.5 text-xs font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Secondary Navigation */}
        <nav className="border-t border-border-soft px-2 py-4">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-bg-hover text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-yellow" />
                  )}
                  <item.icon
                    className={cn('h-5 w-5 transition-colors', isActive ? 'text-accent-yellow' : '')}
                    strokeWidth={1.5}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-border-soft p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated text-sm font-medium text-text-secondary">
              Д
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-text-primary">Дмитрий</p>
              <p className="truncate text-xs text-text-muted">Водитель • Комфорт</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
