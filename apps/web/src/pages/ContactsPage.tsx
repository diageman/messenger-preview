import * as React from 'react';
import { cn } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { Badge } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import { ScrollArea } from '@messenger/ui';
import { motion } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  X,
  Trash2,
  Shield,
} from 'lucide-react';
import { useContacts } from '@/hooks/contacts/useContacts';
import { useNavigate } from 'react-router-dom';
import { useChatActions } from '@/hooks/chats/useChatsZustand';

const statusLabels = {
  online: 'В сети',
  busy: 'Занят',
  away: 'Отошёл',
  offline: 'Не в сети',
  dnd: 'Не беспокоить',
};

export function ContactsPage() {
  const navigate = useNavigate();
  const { createDirectChat } = useChatActions();
  const { loading, isAdmin, searchContacts, deleteContact } = useContacts();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [creatingChat, setCreatingChat] = React.useState<string | null>(null);
  const [deletingContact, setDeletingContact] = React.useState<string | null>(null);

  // Используем searchContacts - возвращает [] при пустом запросе
  const filteredContacts = searchContacts(searchQuery);

  const onlineCount = filteredContacts.filter((c) => c.status === 'online').length;
  const total = filteredContacts.length;
  const handleStartChat = async (contactId: string) => {
    try {
      setCreatingChat(contactId);
      const chatId = await createDirectChat(contactId);
      if (chatId) {
        navigate('/chats');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setCreatingChat(null);
    }
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Удалить контакт "${contactName}"?\
\
Это действие необратимо. Пользователь будет удалён из системы.`)) {
      return;
    }

    try {
      setDeletingContact(contactId);
      await deleteContact(contactId);
    } catch (error: any) {
      alert('Ошибка при удалении: ' + error.message);
    } finally {
      setDeletingContact(null);
    }
  };
  return (
    <div className="flex h-full flex-col bg-bg-app">
      {/* Page Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border-soft bg-bg-panel px-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-text-primary">Контакты</h1>
            {(searchQuery.trim().length > 0 || isAdmin) && (
              <Badge variant="secondary" className="text-xs">
                {searchQuery.trim().length > 0 ? `${total} найдено` : `${total} всего`}
              </Badge>
            )}
            {isAdmin && (
              <Badge variant="secondary" className="text-xs bg-accent-yellow/10 text-accent-yellow">
                <Shield className="mr-1 h-3 w-3" />
                Админ
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-muted">
            {searchQuery.trim().length === 0 
              ? (isAdmin ? `Все контакты организации (${total})` : 'Введите запрос для поиска сотрудников') 
              : 'Результаты поиска'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-4 border-b border-border-soft bg-bg-panel px-6">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Поиск по ФИО, email, телефону..."
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

        {(searchQuery.trim().length > 0 || isAdmin) && (
          <div className="ml-auto flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success"></span>
              {onlineCount} онлайн
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-text-muted"></span>
              {total - onlineCount} оффлайн
            </span>
          </div>
        )}
      </div>
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-8 w-8 animate-spin items-center justify-center rounded-full border-2 border-accent-yellow border-t-transparent" />
                <p className="text-sm text-text-muted">Загрузка...</p>
              </div>
            ) : searchQuery.trim().length === 0 && !isAdmin ? (
              /* Пустое состояние - подсказка для поиска */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-bg-elevated">
                  <Search className="h-8 w-8 text-text-muted" />
                </div>
                <p className="text-base font-medium text-text-primary">Поиск сотрудников</p>
                <p className="mt-2 max-w-sm text-sm text-text-muted">
                  Введите ФИО, email или телефон для поиска.
                  <br />Контакты отображаются только при поиске.
                </p>
              </motion.div>
            ) : filteredContacts.length === 0 ? (
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
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSearchQuery('')}
                >
                  Сбросить поиск
                </Button>
              </motion.div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredContacts.map((contact, index) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <ContactCard 
                      contact={contact} 
                      onStartChat={handleStartChat} 
                      isCreating={creatingChat === contact.id}
                      isAdmin={isAdmin}
                      isDeleting={deletingContact === contact.id}
                      onDelete={handleDeleteContact}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ===== CONTACT CARD =====
interface ContactCardProps {
  contact: import('@/hooks/contacts/useContacts').Contact;
  onStartChat: (contactId: string) => void;
  isCreating: boolean;
  isAdmin: boolean;
  isDeleting: boolean;
  onDelete: (contactId: string, contactName: string) => void;
}
function ContactCard({ contact, onStartChat, isCreating, isAdmin, isDeleting, onDelete }: ContactCardProps) {
  const avatarFallback = contact.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        'group overflow-hidden rounded-xl border border-border-soft bg-bg-elevated p-4 transition-all duration-200 hover:border-border-subtle hover:bg-bg-hover'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar size="lg" fallback={avatarFallback} status={contact.status === 'dnd' ? 'busy' : contact.status} showStatus />
        <div className="flex-1 overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-text-primary">
                  {contact.full_name}
                </h3>
                {contact.is_admin && (
                  <Shield className="h-3.5 w-3.5 text-accent-yellow shrink-0" />
                )}
              </div>
              <p className="truncate text-xs text-text-secondary">{contact.role}</p>
            </div>
            <span className={cn(
              'flex items-center gap-1.5 text-xs shrink-0 ml-2',
              contact.status === 'online' && 'text-success',
              contact.status === 'busy' && 'text-error',
              contact.status === 'away' && 'text-warning',
              contact.status === 'offline' && 'text-muted',
              contact.status === 'dnd' && 'text-error'
            )}>
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              {statusLabels[contact.status as keyof typeof statusLabels]}
            </span>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-text-muted">
                <Mail className="h-3 w-3" />
                Email
              </span>
              <span className="truncate font-medium text-text-secondary">{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-text-muted">
                  <Phone className="h-3 w-3" />
                  Телефон
                </span>
                <span className="font-medium text-text-secondary">{contact.phone}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Button 
              variant="primary" 
              size="sm" 
              className="flex-1"
              onClick={() => onStartChat(contact.id)}
              disabled={isCreating}
            >
              {isCreating ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Создание...
                </div>
              ) : (
                <>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Чат
                </>
              )}
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-error hover:text-error hover:bg-error/10"
                onClick={() => onDelete(contact.id, contact.full_name)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}