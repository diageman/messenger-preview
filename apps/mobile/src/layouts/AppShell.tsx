import * as React from 'react';
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
  Menu,
} from 'lucide-react';

const navigation = [
  { id: 'line', label: 'Линия', icon: Radio, path: '/' },
  { id: 'chats', label: 'Чаты', icon: MessagesSquare, path: '/chats' },
  { id: 'shifts', label: 'Смены', icon: Briefcase, path: '/shifts' },
  { id: 'crew', label: 'Экипаж', icon: Users, path: '/crew' },
  { id: 'signals', label: 'Сигналы', icon: Bell, path: '/signals', badge: 3 },
];

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen flex-col bg-background-primary">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border-default bg-background-secondary px-4 safe-top">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-brand-yellow-primary" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-text-primary">Мессенджер</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-md p-2 text-text-secondary hover:bg-background-tertiary hover:text-text-primary md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-border-default bg-background-secondary md:flex">
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
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-yellow-primary text-black'
                    : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
                )
              }
            >
              <Settings className="h-5 w-5" strokeWidth={1.5} />
              Панель парка
            </NavLink>
          </nav>

          <div className="border-t border-border-default p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background-tertiary text-xs font-medium text-text-secondary">
                Д
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-text-primary">Дмитрий</p>
                <p className="truncate text-xs text-text-tertiary">Водитель</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-border-default bg-background-secondary px-2 pb-safe md:hidden safe-bottom">
          {navigation.slice(0, 5).map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-lg p-2 transition-colors',
                  isActive
                    ? 'text-brand-yellow-primary'
                    : 'text-text-secondary hover:text-text-primary'
                )
              }
            >
              <div className="relative">
                <item.icon className="h-5 w-5" strokeWidth={1.5} />
                {item.badge && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-semantic-error text-[10px] font-medium text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
