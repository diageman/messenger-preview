import * as React from 'react';
import { cn } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { Badge } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import { ScrollArea } from '@messenger/ui';
import { Separator } from '@messenger/ui';
import { motion } from 'framer-motion';
import {
  Search,
  Megaphone,
  Info,
  Calendar,
  Clock,
  MessageSquare,
  Eye,
  Pin,
  X,
  Filter,
} from 'lucide-react';

const announcements = [
  {
    id: '1',
    type: 'important' as const,
    title: 'Изменение графика работы в праздники',
    summary: 'Офис работает по изменённому графику в связи с предстоящими праздниками.',
    author: 'HR-отдел',
    authorAvatar: 'HR',
    time: '14:30',
    date: 'Сегодня',
    isPinned: true,
    views: 142,
    comments: 12,
    department: 'HR-отдел',
  },
  {
    id: '2',
    type: 'info' as const,
    title: 'Обновление корпоративного портала',
    summary: 'Запущена новая версия внутреннего портала с разделами: база знаний, обучение, мероприятия.',
    author: 'IT-отдел',
    authorAvatar: 'IT',
    time: '11:00',
    date: 'Сегодня',
    isPinned: false,
    views: 89,
    comments: 5,
    department: 'IT-отдел',
  },
  {
    id: '3',
    type: 'event' as const,
    title: 'Корпоративное мероприятие — летний пикник',
    summary: 'Приглашаем всех сотрудников на ежегодный летний пикник! 15 июля, парк Горького.',
    author: 'Отдел культуры',
    authorAvatar: 'ОК',
    time: '16:45',
    date: 'Вчера',
    isPinned: false,
    views: 234,
    comments: 28,
    department: 'Маркетинг',
  },
  {
    id: '4',
    type: 'important' as const,
    title: 'Новые правила бронирования переговорок',
    summary: 'Бронь более чем на 2 часа требует согласования с руководителем.',
    author: 'Администрация',
    authorAvatar: 'АД',
    time: '09:15',
    date: '26 марта',
    isPinned: true,
    views: 312,
    comments: 18,
    department: 'Администрация',
  },
  {
    id: '5',
    type: 'info' as const,
    title: 'Обучение по информационной безопасности',
    summary: 'Все сотрудники должны пройти ежегодное обучение по ИБ до 30 апреля.',
    author: 'Отдел безопасности',
    authorAvatar: 'ИБ',
    time: '10:30',
    date: '25 марта',
    isPinned: false,
    views: 178,
    comments: 7,
    department: 'IT-отдел',
  },
];

const typeConfig = {
  important: {
    icon: Megaphone,
    color: 'text-warning',
    bg: 'bg-warning/10',
    badge: 'Важное',
    badgeColor: 'warning',
  },
  info: {
    icon: Info,
    color: 'text-info',
    bg: 'bg-info/10',
    badge: 'Инфо',
    badgeColor: 'info',
  },
  event: {
    icon: Calendar,
    color: 'text-accent-yellow',
    bg: 'bg-accent-yellow/10',
    badge: 'Событие',
    badgeColor: 'default',
  },
};

export function AnnouncementsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('all');

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || announcement.type === selectedType;
    return matchesSearch && matchesType;
  });

  const pinned = filteredAnnouncements.filter((a) => a.isPinned);
  const regular = filteredAnnouncements.filter((a) => !a.isPinned);

  return (
    <div className="flex h-full flex-col bg-bg-app">
      {/* Page Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-soft bg-bg-panel px-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-text-primary">Объявления</h1>
            <Badge variant="secondary" className="text-xs">
              {announcements.length}
            </Badge>
          </div>
          <p className="text-sm text-text-muted">Новости и объявления компании</p>
        </div>
        <div className="flex items-center gap-2">
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
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 rounded-lg border border-border-soft bg-bg-elevated px-3 text-sm text-text-secondary focus:border-accent-yellow focus:outline-none"
          >
            <option value="all">Все типы</option>
            <option value="important">Важные</option>
            <option value="info">Инфо</option>
            <option value="event">События</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {announcements.reduce((acc, a) => acc + a.views, 0)} просмотров
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {announcements.reduce((acc, a) => acc + a.comments, 0)} комментариев
          </span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mx-auto max-w-4xl space-y-4">
            {filteredAnnouncements.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-elevated">
                  <Search className="h-6 w-6 text-text-muted" />
                </div>
                <p className="text-sm font-medium text-text-primary">Ничего не найдено</p>
                <p className="mt-1 text-sm text-text-muted">
                  Попробуйте изменить параметры поиска
                </p>
              </motion.div>
            ) : (
              <>
                {/* Pinned Announcements */}
                {pinned.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      <Pin className="h-3.5 w-3.5 text-accent-yellow" />
                      Закреплённые
                    </div>
                    {pinned.map((announcement, index) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        delay={index * 0.05}
                        isPinned
                      />
                    ))}
                    {regular.length > 0 && <Separator className="bg-border-soft" />}
                  </div>
                )}

                {/* Regular Announcements */}
                {regular.length > 0 && (
                  <div className="space-y-3">
                    {regular.map((announcement, index) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        delay={index * 0.05}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===== ANNOUNCEMENT CARD =====
interface AnnouncementCardProps {
  announcement: typeof announcements[0];
  delay?: number;
  isPinned?: boolean;
}

function AnnouncementCard({ announcement, delay = 0, isPinned = false }: AnnouncementCardProps) {
  const type = typeConfig[announcement.type];
  const TypeIcon = type.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'group overflow-hidden rounded-xl border bg-bg-elevated p-4 transition-all duration-200 hover:bg-bg-hover',
        isPinned && 'border-accent-yellow/20'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          type.bg
        )}>
          <TypeIcon className={cn('h-5 w-5', type.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">
                  {announcement.title}
                </h3>
                <Badge variant={type.badgeColor as any} size="sm">
                  {type.badge}
                </Badge>
                {isPinned && (
                  <Pin className="h-3.5 w-3.5 text-accent-yellow" />
                )}
              </div>
              <p className="mt-1.5 text-sm text-text-secondary">
                {announcement.summary}
              </p>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar size="xs" fallback={announcement.authorAvatar} />
              <span className="text-xs text-text-secondary">{announcement.author}</span>
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="h-3 w-3" />
                {announcement.time} • {announcement.date}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {announcement.views}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {announcement.comments}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-text-secondary hover:text-text-primary"
              >
                Обсудить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
