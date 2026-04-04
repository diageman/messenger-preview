import { Card, CardContent, CardFooter } from '@messenger/ui';
import { Badge } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { motion } from 'framer-motion';
import {
  Users,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@messenger/ui';

const teams = [
  {
    id: '1',
    name: 'Операторы',
    department: 'Диспетчерская служба',
    members: 24,
    online: 18,
    avatar: 'ОП',
    accent: 'border-accent-yellow',
    bgAccent: 'bg-accent-yellow/10',
    textAccent: 'text-accent-yellow',
    description: 'Приём и обработка заказов, координация водителей',
    lead: 'Мария Иванова',
  },
  {
    id: '2',
    name: 'Поддержка',
    department: 'Клиентский сервис',
    members: 12,
    online: 8,
    avatar: 'ПП',
    accent: 'border-info',
    bgAccent: 'bg-info/10',
    textAccent: 'text-info',
    description: 'Работа с обращениями клиентов, решение проблем',
    lead: 'Алексей Петров',
  },
  {
    id: '3',
    name: 'HR-отдел',
    department: 'Управление персоналом',
    members: 6,
    online: 4,
    avatar: 'HR',
    accent: 'border-success',
    bgAccent: 'bg-success/10',
    textAccent: 'text-success',
    description: 'Подбор, адаптация, обучение сотрудников',
    lead: 'Елена Волкова',
  },
  {
    id: '4',
    name: 'IT-отдел',
    department: 'Технологии',
    members: 15,
    online: 12,
    avatar: 'IT',
    accent: 'border-error',
    bgAccent: 'bg-error/10',
    textAccent: 'text-error',
    description: 'Разработка, поддержка инфраструктуры, безопасность',
    lead: 'Дмитрий Соколов',
  },
  {
    id: '5',
    name: 'Бухгалтерия',
    department: 'Финансы',
    members: 8,
    online: 5,
    avatar: 'БХ',
    accent: 'border-taxi-business',
    bgAccent: 'bg-taxi-business/10',
    textAccent: 'text-taxi-business',
    description: 'Финансовый учёт, расчёты, отчётность',
    lead: 'Ольга Смирнова',
  },
  {
    id: '6',
    name: 'Маркетинг',
    department: 'Маркетинг и PR',
    members: 10,
    online: 7,
    avatar: 'МК',
    accent: 'border-taxi-premium',
    bgAccent: 'bg-taxi-premium/10',
    textAccent: 'text-taxi-premium',
    description: 'Продвижение, реклама, коммуникации',
    lead: 'Анна Новикова',
  },
];

export function TeamsPage() {
  const totalMembers = teams.reduce((acc, t) => acc + t.members, 0);
  const totalOnline = teams.reduce((acc, t) => acc + t.online, 0);

  return (
    <div className="flex h-full flex-col bg-bg-app">
      {/* Page Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-soft bg-bg-panel px-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-text-primary">Команды</h1>
            <Badge variant="secondary" className="text-xs">
              {teams.length} отделов
            </Badge>
          </div>
          <p className="text-sm text-text-muted">Отделы и сотрудники компании</p>
        </div>
        <Button variant="primary" size="sm">
          <Users className="mr-1.5 h-3.5 w-3.5" />
          Создать отдел
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-border-soft bg-bg-panel px-6">
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {totalMembers} сотрудников
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {totalOnline} онлайн
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Все отделы</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <TeamCard team={team} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== TEAM CARD =====
interface TeamCardProps {
  team: typeof teams[0];
}

function TeamCard({ team }: TeamCardProps) {
  return (
    <Card className="group overflow-hidden border-border-soft bg-bg-elevated transition-all duration-200 hover:border-border-subtle hover:bg-bg-hover hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Department Avatar */}
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 bg-bg-panel transition-colors',
            team.accent
          )}>
            <span className={cn('text-sm font-bold', team.textAccent)}>
              {team.avatar}
            </span>
          </div>

          {/* Title Block */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="truncate text-sm font-semibold text-text-primary">
                {team.name}
              </h3>
              <Badge variant="secondary" size="sm" className="shrink-0">
                {team.online}/{team.members}
              </Badge>
            </div>
            <p className="truncate text-xs text-text-muted">{team.department}</p>
          </div>
        </div>

        {/* Description (2 lines max) */}
        <p className="mt-3 line-clamp-2 text-sm text-text-secondary">
          {team.description}
        </p>

        {/* Lead Row */}
        <div className="mt-3 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Руководитель:</span>
          <span className="text-xs font-medium text-text-primary">{team.lead}</span>
        </div>
      </CardContent>

      {/* Footer Actions */}
      <CardFooter className="flex gap-2 border-t border-border-soft bg-bg-panel p-4 pt-3">
        <Button variant="primary" size="sm" className="flex-1">
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Канал
        </Button>
        <Button variant="secondary" size="sm" className="flex-1">
          <Users className="mr-1.5 h-3.5 w-3.5" />
          Состав
        </Button>
      </CardFooter>
    </Card>
  );
}
