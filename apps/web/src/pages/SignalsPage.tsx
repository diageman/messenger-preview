import * as React from 'react';
import { cn } from '@messenger/ui';
import { Badge } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import { ScrollArea } from '@messenger/ui';
import { Separator } from '@messenger/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Clock,
  Target,
  Filter,
  CheckCheck,
} from 'lucide-react';

const signals = [
  {
    id: '1',
    type: 'alert' as const,
    title: 'Срочно: изменение в графике',
    message: 'Завтра, 29 марта, офис работает до 18:00 в связи с техническими работами.',
    time: '14:32',
    date: 'Сегодня',
    isRead: false,
    priority: 'urgent' as const,
    action: 'Подтвердить',
    source: 'Администрация',
  },
  {
    id: '2',
    type: 'task' as const,
    title: 'Новая задача',
    message: 'Вам назначена задача: подготовить отчёт по клиентской базе за Q1. Срок: 5 апреля.',
    time: '14:28',
    date: 'Сегодня',
    isRead: false,
    priority: 'high' as const,
    action: 'Принять',
    source: 'Руководство',
  },
  {
    id: '3',
    type: 'system' as const,
    title: 'Обучение завершено',
    message: 'Вы успешно прошли курс «Информационная безопасность». Сертификат доступен в профиле.',
    time: '11:15',
    date: 'Сегодня',
    isRead: true,
    priority: 'normal' as const,
    action: 'Открыть',
    source: 'HR-отдел',
  },
  {
    id: '4',
    type: 'info' as const,
    title: 'Новый сотрудник в команде',
    message: 'Познакомьтесь с новым коллегой — Анна Новикова присоединилась к отделу маркетинга.',
    time: '10:00',
    date: 'Вчера',
    isRead: true,
    priority: 'low' as const,
    action: null,
    source: 'HR-отдел',
  },
  {
    id: '5',
    type: 'alert' as const,
    title: 'Требует внимания',
    message: 'У вас 3 незавершённых задачи с истекающим сроком.',
    time: '08:00',
    date: '26 марта',
    isRead: true,
    priority: 'high' as const,
    action: 'Проверить',
    source: 'Система',
  },
  {
    id: '6',
    type: 'system' as const,
    title: 'Встреча подтверждена',
    message: 'Встреча с HR-отделом 28 марта в 16:00 подтверждена всеми участниками.',
    time: '18:45',
    date: '25 марта',
    isRead: true,
    priority: 'normal' as const,
    action: null,
    source: 'Календарь',
  },
];

const typeConfig = {
  alert: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  task: {
    icon: Target,
    color: 'text-accent-yellow',
    bg: 'bg-accent-yellow/10',
  },
  system: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  info: {
    icon: Info,
    color: 'text-info',
    bg: 'bg-info/10',
  },
};

const priorityConfig = {
  urgent: {
    badge: 'Срочно',
    color: 'bg-error text-white',
    dot: 'bg-error',
  },
  high: {
    badge: 'Важно',
    color: 'bg-warning/10 text-warning',
    dot: 'bg-warning',
  },
  normal: {
    badge: null,
    color: null,
    dot: 'bg-border-default',
  },
  low: {
    badge: null,
    color: null,
    dot: 'bg-border-default',
  },
};

export function SignalsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'unread' | 'alerts'>('all');
  const [selectedSignals, setSelectedSignals] = React.useState<Set<string>>(new Set());
  const [signalStates, setSignalStates] = React.useState<Record<string, 'pending' | 'acknowledged' | 'dismissed'>>({});

  const filteredSignals = signals.filter((signal) => {
    const matchesSearch = signal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      signal.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ? true :
      filter === 'unread' ? !signal.isRead :
      ['alert', 'high', 'urgent'].includes(signal.type) || ['high', 'urgent'].includes(signal.priority);
    return matchesSearch && matchesFilter;
  });

  const unreadCount = signals.filter((s) => !s.isRead).length;
  const urgentCount = signals.filter((s) => s.priority === 'urgent' || s.priority === 'high').length;

  const handleSignalAction = (id: string, action: 'acknowledge' | 'dismiss') => {
    setSignalStates((prev) => ({
      ...prev,
      [id]: action === 'acknowledge' ? 'acknowledged' : 'dismissed',
    }));
  };

  const toggleSelection = (id: string) => {
    setSelectedSignals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const markAllAsRead = () => {
    // В реальности здесь был бы API call
    console.log('Mark all as read');
  };

  return (
    <div className="flex h-full flex-col bg-bg-app">
      {/* Page Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-soft bg-bg-panel px-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-text-primary">Сигналы</h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadCount} непрочитанных
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-muted">Уведомления и задачи</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedSignals.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedSignals(new Set())}>
              <X className="mr-2 h-4 w-4" />
              Снять выделение
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-border-soft bg-bg-panel px-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 bg-bg-elevated border-border-soft pl-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="h-6 bg-border-soft" />

        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            Все
          </Button>
          <Button
            variant={filter === 'unread' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="text-xs"
          >
            Непрочитанные
          </Button>
          <Button
            variant={filter === 'alerts' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('alerts')}
            className="text-xs"
          >
            Важные
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            {signals.length} всего
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {urgentCount} важных
          </span>
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-xs">
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Отметить все
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mx-auto max-w-4xl space-y-3">
            {filteredSignals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
                  <Bell className="h-6 w-6 text-text-muted" />
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {filter === 'unread' ? 'Все прочитано' : 'Нет сигналов'}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {filter === 'unread'
                    ? 'Новые уведомления появятся здесь'
                    : 'Попробуйте изменить фильтр'}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence>
                {filteredSignals.map((signal, index) => {
                  const type = typeConfig[signal.type as keyof typeof typeConfig];
                  const priority = priorityConfig[signal.priority as keyof typeof priorityConfig];
                  const TypeIcon = type.icon;
                  const isSelected = selectedSignals.has(signal.id);

                  return (
                    <motion.div
                      key={signal.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <SignalCard
                        signal={signal}
                        type={type}
                        TypeIcon={TypeIcon}
                        priority={priority}
                        isSelected={isSelected}
                        onSelect={() => toggleSelection(signal.id)}
                        onAction={(action) => handleSignalAction(signal.id, action)}
                        state={signalStates[signal.id]}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===== SIGNAL CARD =====
interface SignalCardProps {
  signal: typeof signals[0];
  type: typeof typeConfig[keyof typeof typeConfig];
  TypeIcon: React.ElementType;
  priority: typeof priorityConfig[keyof typeof priorityConfig];
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: 'acknowledge' | 'dismiss') => void;
  state?: 'pending' | 'acknowledged' | 'dismissed';
}

function SignalCard({ signal, type, TypeIcon, priority, isSelected, onSelect, onAction, state = 'pending' }: SignalCardProps) {
  const isProcessed = state !== 'pending';

  return (
    <div
      className={cn(
        'group flex items-start gap-4 overflow-hidden rounded-xl border bg-bg-elevated p-4 transition-all duration-200 hover:bg-bg-hover',
        isSelected && 'border-accent-yellow/30',
        !signal.isRead && 'border-l-2 border-l-accent-yellow',
        isProcessed && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onSelect}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
          isSelected
            ? 'border-accent-yellow bg-accent-yellow text-black'
            : 'border-border-soft text-transparent hover:border-border-subtle'
        )}
      >
        <CheckCheck className="h-3.5 w-3.5" />
      </button>

      {/* Icon */}
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', type.bg)}>
        <TypeIcon className={cn('h-5 w-5', type.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                'text-sm font-semibold',
                signal.isRead ? 'text-text-primary' : 'text-text-primary'
              )}>
                {signal.title}
              </h3>
              {priority.badge && (
                <Badge className={cn('text-xs', priority.color)}>
                  {priority.badge}
                </Badge>
              )}
              {!signal.isRead && (
                <span className="h-2 w-2 rounded-full bg-accent-yellow" />
              )}
            </div>
            <p className="mt-1.5 text-sm text-text-secondary">
              {signal.message}
            </p>
          </div>
          <button className="opacity-0 transition-opacity group-hover:opacity-100">
            <X className="h-4 w-4 text-text-muted hover:text-text-primary" />
          </button>
        </div>

        {/* Meta & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {signal.time} • {signal.date}
            </span>
            <span className="flex items-center gap-1">
              <Bell className="h-3.5 w-3.5" />
              {signal.source}
            </span>
          </div>

          {signal.action && !isProcessed && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onAction('acknowledge')}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                {signal.action}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-text-muted"
                onClick={() => onAction('dismiss')}
              >
                <X className="mr-1 h-3 w-3" />
                Отклонить
              </Button>
            </div>
          )}
          {isProcessed && (
            <Badge
              variant={state === 'acknowledged' ? 'success' : 'secondary'}
              size="sm"
              className="text-xs"
            >
              {state === 'acknowledged' ? '✓ Выполнено' : '○ Отклонено'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
