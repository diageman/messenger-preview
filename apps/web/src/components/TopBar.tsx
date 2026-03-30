import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import { StatusMenu, type UserStatus } from './StatusMenu';
import { useAuth } from '@/hooks/auth/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  className?: string;
}

export function TopBar({
  title,
  subtitle,
  showSearch = true,
  className,
}: TopBarProps) {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);

  const handleStatusChange = async (_status: UserStatus) => {
    // В будущем: обновлять статус в Supabase
    await refreshProfile();
  };

  const handleLogout = async () => {
    // В будущем: вызвать signOut из useAuth
    console.log('Logout');
    setIsAccountMenuOpen(false);
  };

  // Получаем инициалы из профиля
  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const userName = profile?.full_name || 'Пользователь';
  const userEmail = profile?.email || '';

  return (
    <header
      className={cn(
        'flex h-16 items-center justify-between border-b border-border-soft bg-bg-panel px-6',
        className
      )}
    >
      {/* Left: Title & Subtitle */}
      <div className="flex items-center gap-4">
        {(title || subtitle) && (
          <div>
            {title && (
              <h1 className="text-lg font-semibold text-text-primary">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs text-text-muted">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Center: Search */}
      {showSearch && (
        <div className="flex-1 px-8">
          <div className="relative mx-auto max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-bg-elevated border-border-soft pl-9 text-sm"
            />
          </div>
        </div>
      )}

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-2">
        {/* Status Menu */}
        <StatusMenu
          currentStatus={profile?.status === 'dnd' ? 'busy' : (profile?.status || 'online')}
          onStatusChange={handleStatusChange}
        />

        {/* Notifications - navigate to Signals */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/signals')}
          className="relative text-text-secondary hover:text-text-primary"
          title="Уведомления"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {/* Profile Avatar - opens account menu */}
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-yellow to-accent-yellow/80 p-0 text-xs font-bold text-black hover:from-accent-yellow/90 hover:to-accent-yellow/70"
            title="Профиль"
          >
            {userInitials}
          </Button>

          {/* Account Menu */}
          <AnimatePresence>
            {isAccountMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsAccountMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-border-soft bg-bg-elevated shadow-lg"
                >
                  {/* Profile Info */}
                  <div className="border-b border-border-soft p-3">
                    <p className="text-sm font-semibold text-text-primary">
                      {userName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {profile?.role || '—'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {userEmail}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setIsAccountMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                    >
                      <Settings className="h-4 w-4" />
                      Настройки
                    </button>
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setIsAccountMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                    >
                      <User className="h-4 w-4" />
                      Профиль
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-border-soft py-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-error transition-colors hover:bg-bg-hover"
                    >
                      <LogOut className="h-4 w-4" />
                      Выйти
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
