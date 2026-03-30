import { NavLink } from 'react-router-dom';
import { cn } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessagesSquare,
  Contact,
  Settings,
  Car,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useResizable } from '../hooks/useResizable';
import { useAuth } from '@/hooks/auth/useAuth';

// MVP: Only working sections
const navigation = [
  { id: 'chats', label: 'Чаты', icon: MessagesSquare, path: '/' },
  { id: 'contacts', label: 'Контакты', icon: Contact, path: '/contacts' },
];

const secondaryNavigation = [
  { id: 'settings', label: 'Настройки', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const { profile } = useAuth();
  const { width, isCollapsed, toggleCollapse } = useResizable({
    key: 'messenger_sidebar_width',
    minWidth: 64,
    maxWidth: 280,
    defaultValue: 240,
    collapsedWidth: 64,
  });

  const isExpanded = !isCollapsed;

  // Получаем инициалы из профиля или используем заглушку
  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const userRole = profile?.role || '—';
  const userName = profile?.full_name || 'Загрузка...';

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border-soft bg-bg-sidebar transition-all duration-300',
        isExpanded ? 'items-stretch' : 'items-center'
      )}
      style={{ width }}
    >
      {/* Header with Toggle */}
      <div className={cn(
        'flex h-14 items-center border-b border-border-soft transition-all duration-300',
        isExpanded ? 'px-4' : 'justify-center px-2'
      )}>
        <div className={cn(
          'flex items-center gap-3 flex-1 overflow-hidden',
          !isExpanded && 'justify-center'
        )}>
          <motion.div
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="shrink-0"
          >
            <Car className="h-7 w-7 text-text-muted" strokeWidth={1.5} />
          </motion.div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-hidden"
              >
                <div>
                  <h1 className="text-sm font-semibold text-text-primary whitespace-nowrap">Мессенджер</h1>
                  <p className="text-xs text-text-muted whitespace-nowrap">Парк Онлайн</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Toggle - inside header */}
        {isExpanded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={toggleCollapse}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            aria-label="Свернуть"
            title="Свернуть панель"
          >
            <PanelLeftClose className="h-4 w-4" />
          </motion.button>
        )}

        {/* Expand Toggle - shown only when collapsed */}
        {!isExpanded && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={toggleCollapse}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            aria-label="Развернуть"
            title="Развернуть панель"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </motion.button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navigation.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isExpanded
                  ? isActive
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  : 'justify-center'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Route-line active indicator */}
                {isActive && isExpanded && (
                  <motion.div
                    layoutId="route-line"
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-accent-yellow"
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}

                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-accent-yellow' : 'text-text-secondary group-hover:text-text-primary'
                  )}
                  strokeWidth={1.5}
                />

                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Secondary Navigation */}
      <nav className={cn(
        'border-t border-border-soft px-2 py-3',
        !isExpanded && 'flex justify-center'
      )}>
        {secondaryNavigation.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isExpanded
                  ? isActive
                    ? 'text-text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  : 'justify-center'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && isExpanded && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-accent-yellow" />
                )}
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-accent-yellow' : 'text-text-secondary group-hover:text-text-primary'
                  )}
                  strokeWidth={1.5}
                />
                {isExpanded && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className={cn(
        'border-t border-border-soft p-3 transition-all duration-300',
        !isExpanded && 'px-2'
      )}>
        <div className={cn(
          'flex items-center gap-3 rounded-lg p-2',
          !isExpanded && 'justify-center p-2'
        )}>
          <Avatar
            size="sm"
            fallback={userInitials}
            status={profile?.status === 'dnd' ? 'busy' : profile?.status || 'offline'}
            showStatus
          />
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-hidden text-left"
              >
                <p className="truncate text-sm font-medium text-text-primary">{userName}</p>
                <p className="truncate text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                    {userRole}
                  </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
