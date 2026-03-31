import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { Badge } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import { ScrollArea } from '@messenger/ui';
import { Separator } from '@messenger/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Star,
  Pin,
  Search,
  X,
  Plus,
  Archive,
  Users,
} from 'lucide-react';
import type { Chat } from '../types/chat';
import type { ChatCategory } from '../types/chat';
import { NewChatModal } from './NewChatModal';

// Extended Chat type for direct chat peer data
interface ChatWithPeer extends Chat {
  peerAvatar?: string;
  peerStatus?: string;
}

const categoryLabels = {
  all: 'Все',
  direct: 'Личные',
  groups: 'Команды',
  unread: 'Непрочитанные',
  important: 'Важные',
};

export interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory: ChatCategory;
  onCategoryChange: (category: ChatCategory) => void;
  isSearchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  unreadTotal: number;
}

export function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  isSearchOpen,
  onSearchOpenChange,
  unreadTotal,
}: ChatListProps) {
  const navigate = useNavigate();
  const [isNewChatModalOpen, setIsNewChatModalOpen] = React.useState(false);

  // Разделяем чаты на секции
  const chatListWithPeer = chats as ChatWithPeer[];
  const pinnedChats = chatListWithPeer.filter((c) => c.isPinned);
  const recentChats = chatListWithPeer.filter((c) => !c.isPinned && c.timestamp.includes(':')).slice(0, 5);
  const otherChats = chatListWithPeer.filter((c) => !c.isPinned && !recentChats.includes(c));

  return (
    <div className="flex h-full flex-col bg-bg-panel">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border-soft px-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <MessageSquare className="h-4 w-4 text-text-muted" />
          Диалоги
        </h2>
        <div className="flex items-center gap-2">
          {unreadTotal > 0 && (
            <Badge className="bg-accent-yellow-muted text-accent-yellow text-xs font-semibold">
              {unreadTotal}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-text-muted hover:text-text-primary"
            onClick={() => onSearchOpenChange(!isSearchOpen)}
            aria-label={isSearchOpen ? 'Закрыть поиск' : 'Открыть поиск'}
          >
            {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border-soft px-4 py-2"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 bg-bg-elevated border-border-soft text-text-primary placeholder:text-text-muted pl-9 focus:border-accent-yellow"
                autoFocus
                aria-label="Поиск по чатам"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 h-7 w-7 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  onClick={() => onSearchChange('')}
                  aria-label="Сбросить поиск"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <div className="border-b border-border-soft px-2 py-2">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {(Object.keys(categoryLabels) as ChatCategory[]).map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? 'ghost' : 'ghost'}
              size="sm"
              onClick={() => onCategoryChange(category)}
              className={cn(
                'whitespace-nowrap text-xs transition-colors',
                activeCategory === category
                  ? 'bg-bg-elevated text-text-primary font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              )}
              role="tab"
              aria-selected={activeCategory === category}
            >
              {category === 'important' && <Star className="mr-1 h-3 w-3" />}
              {categoryLabels[category]}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat List Content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {/* Pinned Section */}
          {pinnedChats.length > 0 && (
            <div className="mb-3">
              <div className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Pin className="h-3.5 w-3.5 text-accent-yellow" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Закреплённые
                  </span>
                </div>
              </div>
              <div className="space-y-0.5">
                {pinnedChats.map((chat, index) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isSelected={selectedChatId === chat.id}
                    onSelect={() => onSelectChat(chat.id)}
                    delay={index * 0.03}
                  />
                ))}
              </div>
              <Separator className="my-2 bg-border-soft" />
            </div>
          )}

          {/* Recent Section */}
          {recentChats.length > 0 && (
            <div className="mb-3">
              <div className="px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Недавние
                </span>
              </div>
              <div className="space-y-0.5">
                {recentChats.map((chat, index) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isSelected={selectedChatId === chat.id}
                    onSelect={() => onSelectChat(chat.id)}
                    delay={index * 0.03}
                  />
                ))}
              </div>
              {otherChats.length > 0 && <Separator className="my-2 bg-border-soft" />}
            </div>
          )}

          {/* All Chats Section */}
          {otherChats.length > 0 && (
            <div className="mb-3">
              <div className="px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Все чаты
                </span>
              </div>
              <div className="space-y-0.5">
                {otherChats.map((chat, index) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isSelected={selectedChatId === chat.id}
                    onSelect={() => onSelectChat(chat.id)}
                    delay={index * 0.03}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {chats.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
              role="status"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated">
                <Search className="h-5 w-5 text-text-muted" />
              </div>
              <p className="text-sm font-medium text-text-primary">
                {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
              </p>
              <p className="mt-1 max-w-[200px] text-xs text-text-muted">
                {searchQuery
                  ? `По запросу "${searchQuery}" нет результатов`
                  : 'В этой категории пока пусто'}
              </p>
              {searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 text-text-link hover:text-text-primary"
                  onClick={() => onSearchChange('')}
                >
                  Сбросить поиск
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Utility Block */}
      <div className="border-t border-border-soft bg-bg-elevated p-3">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            onClick={() => setIsNewChatModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Новый чат
          </Button>
          <Button
            variant="ghost"
            disabled
            className="w-full justify-start text-text-muted opacity-50 cursor-not-allowed"
            title="В разработке"
          >
            <Archive className="mr-2 h-4 w-4" />
            Архив
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            onClick={() => navigate('/contacts')}
          >
            <Users className="mr-2 h-4 w-4" />
            Все контакты
          </Button>
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
      />
    </div>
  );
}

// ===== CHAT LIST ITEM COMPONENT =====
interface ChatListItemProps {
  chat: ChatWithPeer;
  isSelected: boolean;
  onSelect: () => void;
  delay?: number;
}

function ChatListItem({ chat, isSelected, onSelect, delay = 0 }: ChatListItemProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onSelect}
      className={cn(
        'group relative flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors duration-200',
        isSelected
          ? 'bg-bg-elevated'
          : 'hover:bg-bg-hover'
      )}
      aria-label={`Чат с ${chat.name}`}
      aria-current={isSelected ? 'true' : undefined}
    >
      {/* Active indicator line */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-yellow" />
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        {chat.type === 'direct' ? (
          <Avatar
            size="md"
            fallback={chat.peerAvatar || '?'}
            status={chat.peerStatus as 'online' | 'busy' | 'away' | 'offline' | undefined}
            showStatus
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated text-sm font-bold text-text-secondary">
            {chat.participants.slice(0, 2).map((p: any) => p.avatar[0]).join('')}
          </div>
        )}
        {chat.isPinned && (
          <Pin
            className="absolute -right-0.5 -top-0.5 h-3 w-3 text-accent-yellow"
            aria-label="Закреплённый чат"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium text-text-primary">
            {chat.name}
          </span>
          <span className="shrink-0 text-xs text-text-muted">{chat.timestamp}</span>
        </div>
        {chat.description && (
          <p className="mt-0.5 truncate text-xs text-text-muted">{chat.description}</p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="truncate text-sm text-text-secondary">
            {chat.lastMessage}
          </span>
          {chat.unreadCount > 0 && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-yellow px-1.5 text-xs font-bold text-black"
              aria-label={`${chat.unreadCount} непрочитанных сообщений`}
            >
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
