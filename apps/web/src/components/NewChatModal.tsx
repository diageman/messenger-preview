import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { X, Search, Users, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContacts } from '@/hooks/contacts/useContacts';
import { useChatActions } from '@/hooks/chats/useChatsZustand';

interface Contact {
  id: string;
  full_name: string;
  role: string;
  email: string;
  avatar_url: string | null;
  type: 'person';
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const navigate = useNavigate();
  const { contacts, loading } = useContacts();
  const { createDirectChat } = useChatActions();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedContact, setSelectedContact] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const filteredContacts: Contact[] = contacts
    .map(c => ({
      id: c.id,
      full_name: c.full_name,
      role: c.role,
      email: c.email,
      avatar_url: c.avatar_url,
      type: 'person' as const,
    }))
    .filter((contact) =>
      contact.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleCreateChat = async () => {
    if (!selectedContact) return;
    
    try {
      setCreating(true);
      const chatId = await createDirectChat(selectedContact);
      
      if (chatId) {
        navigate('/chats');
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      alert('Произошла ошибка при выполнении: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-bg-app/80"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border-soft bg-bg-elevated shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-soft bg-bg-panel p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-accent-yellow" />
              <h2 className="text-base font-semibold text-text-primary">Новый чат</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-text-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="border-b border-border-soft p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Поиск сотрудников и команд..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 bg-bg-panel border-border-soft pl-10 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="max-h-[400px] overflow-auto p-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-6 w-6 animate-spin items-center justify-center rounded-full border-2 border-accent-yellow border-t-transparent" />
                <p className="text-sm text-text-secondary">Загрузка контактов...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="mb-3 h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-secondary">
                  {searchQuery ? 'Ничего не найдено' : 'Нет доступных контактов'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                      selectedContact === contact.id
                        ? 'bg-accent-yellow/10 border border-accent-yellow/30'
                        : 'hover:bg-bg-hover border border-transparent'
                    )}
                  >
                    <Avatar 
                      size="md" 
                      fallback={contact.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)} 
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {contact.full_name}
                        </span>
                      </div>
                      <p className="truncate text-xs text-text-muted">
                        {contact.role}
                      </p>
                    </div>
                    {selectedContact === contact.id && (
                      <div className="h-4 w-4 rounded-full border-2 border-accent-yellow bg-accent-yellow" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border-soft bg-bg-panel p-4">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={creating}>
              Отмена
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateChat}
              disabled={!selectedContact || creating}
            >
              {creating ? (
                <>
                  <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Создание...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Создать чат
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
