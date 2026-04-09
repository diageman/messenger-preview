import * as React from 'react';
import { useRef } from 'react';
import { cn } from '@messenger/ui';
import { Avatar } from '@messenger/ui';
import { Button } from '@messenger/ui';
import { ScrollArea } from '@messenger/ui';
import { motion } from 'framer-motion';
import { Send, Paperclip, Smile, MessageSquare, Trash2, X, MoreVertical } from 'lucide-react';
import type { EmojiClickData } from 'emoji-picker-react';
import type { Message } from '../types/chat';
import { getChatAvatarData } from '../lib/chatAvatar';
import { useChatStore } from '../stores/useChatStore';
import { useMessageUIStore } from '../stores/useMessageUIStore';
import { MessageBubble } from './MessageBubble';
import { ReactionContextMenu } from './ReactionContextMenu';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useAuth } from '../hooks/chats/useChatsZustand';
import { useSettings } from '../hooks/useSettings';
import { useShallow } from 'zustand/react/shallow';

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

// ReadReceipt moved into MessageBubble

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
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [cursorPosition, setCursorPosition] = React.useState<number | null>(null);
  const { profile } = useAuth();
  const { chats: chatSettings } = useSettings();
  const sendTypingStatus = useChatStore(state => state.sendTypingStatus);
  const deleteMessageForMe = useChatStore(state => state.deleteMessageForMe);
  const deleteMessageForEveryone = useChatStore(state => state.deleteMessageForEveryone);
  const deleteChatForMe = useChatStore(state => state.deleteChatForMe);
  const deleteChatForAll = useChatStore(state => state.deleteChatForAll);

  const [showChatMenu, setShowChatMenu] = React.useState(false);

  const openContextMenu = useMessageUIStore((s) => s.openContextMenu);
  const closeContextMenu = useMessageUIStore((s) => s.closeContextMenu);

  const typingUsers = useChatStore(state => state.typingUsers[chatId || ''] || EMPTY_TYPING_USERS);
  const lastTypingTime = React.useRef<number>(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Outside click для emoji picker инпута
  React.useEffect(() => {
    if (!isEmojiPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isEmojiPickerOpen]);

  // Закрытие emoji picker по Escape
  React.useEffect(() => {
    if (!isEmojiPickerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEmojiPickerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isEmojiPickerOpen]);

  // Оптимизированные селекторы с useShallow для предотвращения лишних рендеров
  const { replyToMessageId, setReplyTo, reactionsMap, toggleReaction } = useMessageUIStore(
    useShallow((s) => ({
      replyToMessageId: s.replyToMessageId,
      setReplyTo: s.setReplyTo,
      reactionsMap: s.reactions,
      toggleReaction: s.toggleReaction,
    }))
  );
  const replyToMessage = React.useMemo(
    () => replyToMessageId ? messages.find((m) => m.id === replyToMessageId) : null,
    [replyToMessageId, messages]
  );

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [messageText]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, messages[messages.length - 1]?.id]);

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

  // Отслеживаем позицию курсора для вставки эмодзи
  const handleSelectInput = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget as HTMLTextAreaElement;
    setCursorPosition(target.selectionStart);
  };

  // Вставка эмодзи из пикера в textarea
  const handleInputEmojiClick = (emojiData: EmojiClickData) => {
    const pos = cursorPosition ?? messageText.length;
    const before = messageText.slice(0, pos);
    const after = messageText.slice(pos);
    const newText = before + emojiData.emoji + after;
    setMessageText(newText);
    setCursorPosition(pos + emojiData.emoji.length);
    // Закрываем пикер и восстанавливаем фокус
    setIsEmojiPickerOpen(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = pos + emojiData.emoji.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        setCursorPosition(newPos);
      }
    }, 0);
  };

  // Обработчики действий из контекстного меню
  const handleContextMenuReply = React.useCallback((messageId: string) => {
    setReplyTo(messageId);
  }, [setReplyTo]);

  const handleContextMenuCopy = React.useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleContextMenuDelete = React.useCallback(async (messageId: string) => {
    closeContextMenu();
    const msg = messages.find((m) => m.id === messageId);
    if (msg?.isOwn) {
      await deleteMessageForEveryone?.(messageId);
    } else {
      await deleteMessageForMe?.(messageId);
    }
  }, [messages, deleteMessageForEveryone, deleteMessageForMe, closeContextMenu]);

  // Обёртка для открытия контекстного меню
  const handleContextMenuOpen = React.useCallback((messageId: string, x: number, y: number, content: string, senderName: string, isOwn: boolean) => {
    openContextMenu(messageId, x, y, content, senderName, isOwn);
  }, [openContextMenu]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && chatSettings.enterToSend) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend, chatSettings.enterToSend]);

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

          {/* Меню управления чатом */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="text-text-muted hover:text-text-primary"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>

            {showChatMenu && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-bg-sidebar border border-border-soft rounded-lg shadow-2xl p-2 min-w-[200px] animate-in fade-in zoom-in-95">
                <div className="px-2 py-1.5 border-b border-border-soft mb-1">
                  <span className="text-[10px] font-bold uppercase text-text-muted tracking-widest">Управление диалогом</span>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Удалить диалог для себя? Собеседник продолжит его видеть.')) {
                      await deleteChatForMe(chatId);
                      setShowChatMenu(false);
                    }
                  }}
                  className="w-full text-left px-2 py-2 text-sm hover:bg-bg-elevated rounded flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-text-muted" />
                  Удалить для себя
                </button>
                <button
                  onClick={async () => {
                    if (confirm('ВНИМАНИЕ: Это полностью удалит диалог и все сообщения для ВСЕХ участников. Отменить это действие нельзя.')) {
                      await deleteChatForAll(chatId);
                      setShowChatMenu(false);
                    }
                  }}
                  className="w-full text-left px-2 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить для всех
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {messages.map((message, index) => {
              const prevDate = index > 0 ? messages[index - 1].date : null;
              const showDateSeparator = message.date !== prevDate;

              // === Группировка аватарок ===
              // Аватар показываем только если:
              // 1. Это чужое сообщение (!isOwn)
              // 2. Первое сообщение в списке ИЛИ предыдущее от другого автора
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showAvatar =
                !message.isOwn &&
                (!prevMsg || prevMsg.sender_id !== message.sender_id);

              return (
                <React.Fragment key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center py-3">
                      <span className="rounded-full bg-bg-elevated px-3 py-1 text-xs font-medium text-text-muted">
                        {formatDateSeparator(message.date)}
                      </span>
                    </div>
                  )}
                  <div data-message-id={message.id}>
                  <MessageBubble
                    id={message.id}
                    content={message.content || ''}
                    isOwn={message.isOwn ?? false}
                    senderName={message.sender?.full_name || 'Пользователь'}
                    avatarUrl={message.sender?.avatar_url ?? null}
                    timestamp={message.timestamp}
                    status={message.status}
                    isDeleted={!!message.deleted_at}
                    isEdited={!!message.edited_at}
                    showAvatar={showAvatar}
                    replyTo={message.replyTo || null}
                    reactions={reactionsMap[message.id] ?? []}
                    onReact={(msgId, emoji) => toggleReaction(msgId, emoji)}
                    onReply={(msgId) => setReplyTo(msgId)}
                    onContextMenuActions={handleContextMenuOpen}
                  />
                  </div>
                </React.Fragment>
              );
            })}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Reply bar */}
        {replyToMessage && (
          <div className="shrink-0 flex items-center gap-2 border-t border-border-soft bg-bg-sidebar px-4 py-2">
            <div className="w-0.5 h-8 rounded-full bg-accent-yellow shrink-0" />
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-semibold text-accent-yellow truncate">
                {replyToMessage.sender?.full_name ?? 'Сообщение'}
              </div>
              <div className="text-xs text-text-muted truncate">{replyToMessage.content}</div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="p-1 rounded-full hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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
              onSelect={handleSelectInput}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              className="message-input flex-1 w-full resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden py-2.5 bg-transparent border-none focus:outline-none focus:ring-0 outline-none"
              aria-label="Поле ввода сообщения"
            />
            <div className="relative shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsEmojiPickerOpen((v) => !v)}
                className={cn(
                  'h-10 w-10 text-text-muted transition-colors',
                  isEmojiPickerOpen ? 'text-accent-yellow' : 'hover:text-text-primary'
                )}
                title="Эмодзи"
              >
                <Smile className="h-5 w-5" />
              </Button>

              {/* Emoji Picker для поля ввода */}
              {isEmojiPickerOpen && (
                <div ref={emojiPickerRef} className="absolute right-0 bottom-full mb-2 z-50">
                  <EmojiPicker
                    onEmojiClick={handleInputEmojiClick}
                    width={330}
                    height={400}
                    theme={Theme.DARK}
                    lazyLoadEmojis
                    searchDisabled={false}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
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

      {/* Глобальное контекстное меню с эмодзи-реакциями */}
      <ReactionContextMenu
        onReply={handleContextMenuReply}
        onCopy={handleContextMenuCopy}
        onDelete={handleContextMenuDelete}
      />
    </div>
  );
}
