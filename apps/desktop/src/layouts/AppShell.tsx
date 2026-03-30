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
    <div className="flex h-screen bg-background-primary">
      <aside className="flex w-64 flex-col border-r border-border-default bg-background-secondary">
        <div className="flex h-16 items-center gap-3 border-b border-border-default px-4">
          <Car className="h-8 w-8 text-brand-yellow-primary" strokeWidth={1.5} />
          <div>
            <h1 className="text-base font-semibold text-text-primary">Мессенджер</h1>
            <p className="text-xs text-text-tertiary">Парк Онлайн</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-yellow-primary text-black'
                    : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
                )
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" strokeWidth={1.5} />
                {item.label}
              </div>
              {item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-semantic-error px-1.5 text-xs font-medium text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <nav className="border-t border-border-default px-2 py-4">
          {secondaryNavigation.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-yellow-primary text-black'
                    : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
                )
              }
            >
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border-default p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-tertiary text-sm font-medium text-text-secondary">
              Д
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-text-primary">Дмитрий</p>
              <p className="truncate text-xs text-text-tertiary">Водитель • Комфорт</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
