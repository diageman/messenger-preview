import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { X, Search, Users, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContacts } from '@/hooks/contacts/useContacts';
import { useChatActions } from '@/hooks/chats/useChatsZustand';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const navigate = useNavigate();
  const { createDirectChat } = useChatActions();
  const { searchContacts } = useContacts();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [creatingChat, setCreatingChat] = React.useState<string | null>(null);

  const filteredContacts = searchContacts(searchQuery);

  const handleCreateChat = async (contactId: string) => {
    try {
      setCreatingChat(contactId);
      const chatId = await createDirectChat(contactId);
      if (chatId) {
        onClose();
        navigate('/chats');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setCreatingChat(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-bg-panel shadow-2xl border border-border-soft"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border-soft px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated">
                    <MessageSquare className="h-5 w-5 text-text-muted" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">Новый чат</h2>
                    <p className="text-sm text-text-muted">Выберите сотрудника для начала диалога</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-text-muted hover:text-text-primary"
                  onClick={onClose}
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Search */}
              <div className="border-b border-border-soft px-6 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <Input
                    placeholder="Поиск по ФИО, email, телефону..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 bg-bg-elevated border-border-soft pl-9 text-sm"
                    autoFocus
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
              </div>

              {/* Contacts List */}
              <div className="max-h-96 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated">
                      <Search className="h-5 w-5 text-text-muted" />
                    </div>
                    <p className="text-sm font-medium text-text-primary">
                      {searchQuery ? 'Ничего не найдено' : 'Начните поиск'}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {searchQuery
                        ? 'Попробуйте изменить параметры поиска'
                        : 'Введите имя, email или телефон сотрудника'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-soft">
                    {filteredContacts.map((contact) => (
                      <motion.button
                        key={contact.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => handleCreateChat(contact.id)}
                        disabled={creatingChat === contact.id}
                        className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-bg-hover disabled:opacity-50"
                      >
                        <Avatar
                          size="md"
                          fallback={contact.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                          status={contact.status === 'dnd' ? 'busy' : contact.status}
                          showStatus
                        />
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-text-primary">
                              {contact.full_name}
                            </span>
                            {contact.is_admin && (
                              <Users className="h-3.5 w-3.5 text-accent-yellow shrink-0" />
                            )}
                          </div>
                          <p className="truncate text-xs text-text-muted">{contact.role}</p>
                        </div>
                        {creatingChat === contact.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-text-muted" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}