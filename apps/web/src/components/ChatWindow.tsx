import * as React from 'react';
import { cn } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { ScrollArea } from '@messenger/ui';
import { motion } from 'framer-motion';
import { Send, Paperclip, Smile, MessageSquare, Check, CheckCheck } from 'lucide-react';
import type { Message, MessageStatus } from '../types/chat';
import { getChatAvatarData } from '../lib/chatAvatar';
import { useChatStore } from '../stores/useChatStore';
import { useAuth } from '../hooks/chats/useChatsZustand';

// ===== MAIN COMPONENT =====
export interface ChatWindowProps {
  chatId: string | null;
  messages?: Message[];
  onSendMessage?: (content: string) => void;
  chatName?: string;
  chatDescription?: string;
  chatType?: 'direct' | 'group' | 'channel';
  chatParticipants?: Array<{
    id: string;
    name: string;
    avatar: string;
    status?: string;
  }>;
  loading?: boolean;
  peerMember?: any;  // For direct chat peer identity
}

const EMPTY_TYPING_USERS: string[] = [];

// ===== HELPERS =====
function formatDateSeparator(dateStr: string): string {
  const today = new Date();
  const date = new Date(dateStr);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  const dateOnly = date.toISOString().slice(0, 10);
  if (dateOnly === todayStr) return 'Сегодня';
  if (dateOnly === yesterdayStr) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function ReadReceipt({ status }: { status?: MessageStatus }) {
  if (!status || status === 'sending') return null;
  if (status === 'sent') return <Check className="h-3.5 w-3.5 text-text-muted" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-text-muted" />;
  return <CheckCheck className="h-3.5 w-3.5 text-text-link" />;
}

export function ChatWindow({
  chatId,
  messages = [],
  onSendMessage,
  chatName,
  chatDescription,
  chatType = 'direct',
  chatParticipants = [],
  loading = false,
  peerMember,
}: ChatWindowProps) {
  const [messageText, setMessageText] = React.useState('');
  const { profile } = useAuth();
  const sendTypingStatus = useChatStore(state => state.sendTypingStatus);
  const typingUsers = useChatStore(state => state.typingUsers[chatId || ''] || EMPTY_TYPING_USERS);
  const lastTypingTime = React.useRef<number>(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = React.useState(true);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [messageText]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (autoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScrollEnabled]);

  // Track scroll position to determine if we should auto-scroll
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // Enable auto-scroll if user is near bottom (within 100px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScrollEnabled(isNearBottom);
  };

  const handleSend = React.useCallback((e?: React.FormEvent) => {
    // Предотвращаем перезагрузку страницы
    if (e) e.preventDefault();
    
    if (messageText.trim() && onSendMessage) {
      onSendMessage(messageText.trim());
      setMessageText('');
      lastTypingTime.current = 0;
      textareaRef.current?.focus();
    }
  }, [messageText, onSendMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageText(value);

    const now = Date.now();
    if (chatId && profile?.full_name && now - lastTypingTime.current > 2000) {
      sendTypingStatus(chatId, profile.full_name);
      lastTypingTime.current = now;
    }
  };

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Compute chat display data from props using unified helper
  const avatarData = getChatAvatarData(
    chatType,
    chatName,
    chatParticipants,
    undefined,  // currentUserId not needed when peerMember is provided
    peerMember  // ✅ PASS PEER MEMBER DIRECTLY
  );
  
  const isDirectChat = chatType === 'direct';
  const displayName = avatarData.title;
  const displayAvatar = avatarData.initials;
  const displayDescription = chatDescription || '';
  const displayStatus = isDirectChat && chatParticipants.length > 0
    ? chatParticipants[0].status
    : undefined;

  // No chat selected
  if (!chatId) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-bg-app">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-panel">
            <MessageSquare className="h-8 w-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Выберите чат</h3>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">
            Выберите диалог из списка слева или начните новый чат
          </p>
        </motion.div>
      </div>
    );
  }

  // Chat is loading
  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-bg-app">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-8 w-8 animate-spin items-center justify-center rounded-full border-2 border-accent-yellow border-t-transparent" />
          <h3 className="text-lg font-semibold text-text-primary">Загрузка чата...</h3>
          <p className="mt-2 text-sm text-text-muted">
            Получаем историю сообщений
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-bg-app">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-soft bg-bg-sidebar px-4">
          <div className="flex items-center gap-3">
            {isDirectChat ? (
              <Avatar
                size="md"
                fallback={displayAvatar}
                status={displayStatus === 'dnd' ? 'busy' : (displayStatus as any)}
                showStatus
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-elevated text-sm font-bold text-text-secondary">
                {displayAvatar}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary truncate">
                  {displayName}
                </h3>
                {!isDirectChat && chatParticipants.length > 0 && (
                  <span className="text-xs text-text-muted">
                    {chatParticipants.length}
                  </span>
                )}
              </div>
              <p className="text-xs truncate">
                {typingUsers.length > 0 ? (
                  <span className="text-accent-yellow animate-pulse font-medium">
                    {typingUsers.join(', ')} {typingUsers.length > 1 ? 'печатают' : 'печатает'}...
                  </span>
                ) : (
                  <span className="text-text-muted">{displayDescription}</span>
                )}
              </p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3" onScroll={handleScroll}>
          <div className="space-y-2">
            {messages.map((message, index) => {
              const prevDate = index > 0 ? messages[index - 1].date : null;
              const showDateSeparator = message.date !== prevDate;
              return (
                <React.Fragment key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center py-3">
                      <span className="rounded-full bg-bg-elevated px-3 py-1 text-xs font-medium text-text-muted">
                        {formatDateSeparator(message.date)}
                      </span>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex',
                      message.isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {!message.isOwn && message.sender && (
                      <Avatar
                        size="sm"
                        fallback={message.sender.avatar}
                        className="mr-2"
                      />
                    )}
                    <div
                      className={cn(
                        'max-w-[65%] rounded-xl px-3 py-2',
                        message.isOwn
                          ? 'bubble-outgoing'
                          : 'bubble-incoming'
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={cn(
                        'mt-1 flex items-center gap-1',
                        message.isOwn ? 'justify-end' : ''
                      )}>
                        <span className="text-xs text-text-muted">{message.timestamp}</span>
                        {message.isOwn && <ReadReceipt status={message.status} />}
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <form onSubmit={handleSend} className="shrink-0 border-t border-border-soft bg-bg-sidebar p-3">
          <div className="flex items-end gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-text-muted hover:text-text-primary shrink-0" title="Прикрепить файл">
              <Paperclip className="h-5 w-5" />
            </Button>
            <textarea
              ref={textareaRef}
              placeholder="Напишите сообщение..."
              value={messageText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              className="message-input flex-1 w-full resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden py-2.5 bg-transparent border-none focus:outline-none focus:ring-0 outline-none"
              aria-label="Поле ввода сообщения"
            />
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-text-muted hover:text-text-primary shrink-0" title="Эмодзи">
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10 shrink-0 transition-colors',
                messageText.trim()
                  ? 'text-text-primary hover:text-accent-yellow'
                  : 'text-text-muted hover:text-text-secondary'
              )}
              disabled={!messageText.trim()}
              title="Отправить"
              aria-label="Отправить сообщение"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
