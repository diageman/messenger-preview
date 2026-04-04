/**
 * Global chat store using Zustand
 * ЕДИНЫЙ источник для chats, messages, unreadCount
 *
 * КЛЮЧЕВЫЕ ПРАВИЛА:
 * 1. currentUserId берётся ТОЛЬКО из authStore (НИКАКИХ await supabase.auth.getUser())
 * 2. unreadCount меняется только в 3 местах:
 *    - начальная загрузка snapshot из БД
 *    - realtime INSERT нового сообщения
 *    - явное mark as read
 * 3. Событие UPDATE по чату НЕ затирает unreadCount
 * 4. Цифра в заголовке считается из этого же массива chats
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { isOwnMessage, safeUnread } from '@/lib/chatHelpers';

// =====================================================
// TYPES
// =====================================================

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'system' | 'pinned' | 'service';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  isOwn?: boolean;
}

export interface ChatItem {
  id: string;
  type: 'direct' | 'group' | 'channel';
  organization_id: string;
  name: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  direct_chat_key: string | null;
  messages?: Message[];

  // Unread — единственное поле для списка и бейджа
  unreadCount: number;

  // Last message preview
  lastMessageId: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;

  // Дополнительные данные для UI
  chat_members?: Array<{
    user_id: string;
    role: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
      avatar_url: string | null;
      status: string;
      role: string;
    };
  }>;
  chat_reads?: Array<{
    user_id: string;
    last_read_at: string;
    last_read_message_id: string | null;
  }>;
}

// =====================================================
// STORE STATE
// =====================================================

interface ChatState {
  // Data
  chats: ChatItem[];
  messages: Record<string, Message[]>; // chatId -> messages
  loading: boolean;
  error: Error | null;
  typingUsers: Record<string, string[]>; // chatId -> userNames[]
  isInitialized: boolean;
  isDataLoaded: boolean; // Флаг завершения fetchChats
  appStartTime: number;
  initialMessageIds: Set<string>; // ID сообщений, загруженных при старте
  selectedChatId: string | null;

  // Actions
  setChats: (chats: ChatItem[]) => void;
  setSelectedChatId: (chatId: string | null) => void;
  addMessage: (message: Message) => void;
  _updateChatPreview: (chatId: string, message: Message) => void;
  applyIncomingMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clearMessages: (chatId: string) => void;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  markChatRead: (chatId: string, lastReadAt: string) => Promise<void>;
  sendTypingStatus: (chatId: string, userName: string) => void;

  // Realtime subscription management
  initRealtime: () => void;
}

// =====================================================
// CREATE STORE
// =====================================================

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  chats: [],
  messages: {},
  loading: true,
  error: null,
  typingUsers: {},
  isInitialized: false,
  isDataLoaded: false,
  appStartTime: Date.now(),
  initialMessageIds: new Set(),
  selectedChatId: null,

  // ====== ACTIONS ======

  setChats: (chats) => set({ chats }),

  setSelectedChatId: (chatId) => {
    const { chats } = get();
    set({ selectedChatId: chatId });

    if (chatId) {
      // 1. Локальное обновление для мгновенного отклика UI
      const updated = chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      );
      set({ chats: updated });

      // 2. Отправка в БД самого свежего времени сообщения из этого чата
      const currentChat = chats.find(c => c.id === chatId);
      const lastMsgAt = currentChat?.lastMessageAt || new Date().toISOString();
      void get().markChatRead(chatId, lastMsgAt);
    }
  },

  /**
   * Optimistic add при отправке СВОЕГО сообщения
   */
  addMessage: (message) => {
    const { messages } = get();
    const chatMessages = messages[message.chat_id] || [];

    // Dedupe
    if (chatMessages.some((m) => m.id === message.id)) return;

    set({
      messages: {
        ...messages,
        [message.chat_id]: [...chatMessages, message],
      },
    });

    // Обновляем превью чата (НЕ трогаем unread для своих сообщений)
    get()._updateChatPreview(message.chat_id, message);
  },

  /**
   * Realtime INSERT чужого сообщения — ЗДЕСЬ меняется unreadCount
   */
  applyIncomingMessage: (message) => {
    const { chats, selectedChatId, messages: allMessages } = get();
    const { currentUserId } = useAuthStore.getState();

    // 1. Проверяем, кто прислал. Сравниваем напрямую IDs.
    const isOwn = message.sender_id === currentUserId;
    const isChatActive = selectedChatId === message.chat_id;
    const isTabVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';

    // Лог для отладки конкретного аккаунта
    if (currentUserId === 'd0ced572-9909-428f-8d70-6266bf3e0d1f' || message.sender_id === 'd0ced572-9909-428f-8d70-6266bf3e0d1f') {
      console.log(`[DEBUG-CHEREVKO] Msg: ${message.id}, Sender: ${message.sender_id}, Me: ${currentUserId}, isOwn: ${isOwn}, Active: ${isChatActive}`);
    }

    const chatIndex = chats.findIndex((c) => c.id === message.chat_id);
    
    // 2. Если чата нет — тянем заново из БД
    if (chatIndex === -1) {
      get().fetchChats();
      return;
    }

    // 3. Подготавливаем обновленный список чатов
    const updatedChats = [...chats];
    const oldChat = updatedChats[chatIndex];

    // 4. Логика счетчика
    let newUnread = oldChat.unreadCount || 0;
    if (isOwn || (isChatActive && isTabVisible)) {
      newUnread = 0;
      if (isChatActive && !isOwn) {
        void get().markChatRead(message.chat_id, message.created_at);
      }
    } else {
      newUnread = newUnread + 1;
    }

    const updatedChat = {
      ...oldChat,
      unreadCount: newUnread,
      lastMessageId: message.id,
      lastMessageText: message.content,
      lastMessageAt: message.created_at,
      updated_at: message.created_at,
      // Сохраняем сообщение внутри чата для триггера useMemo на странице
      messages: [...(oldChat.messages || []), message]
    };

    // 5. Перемещаем чат в начало списка
    updatedChats.splice(chatIndex, 1);
    updatedChats.unshift(updatedChat);

    // 6. Обновляем и чаты, и сообщения одним махом
    const currentMsgs = allMessages[message.chat_id] || [];
    const nextMessages = currentMsgs.some((m: Message) => m.id === message.id) 
      ? allMessages 
      : { ...allMessages, [message.chat_id]: [...currentMsgs, message] };

    set({ 
      chats: updatedChats, 
      messages: nextMessages 
    });

    // Уведомление: только если сообщение создано ПОСЛЕ входа пользователя на страницу
    const { isDataLoaded, appStartTime, initialMessageIds } = get();
    const messageTime = new Date(message.created_at).getTime();
    
    // ЖЕСТКИЙ БЛОК: Молчим первые 10 секунд сессии в любом случае
    const isAfterGracePeriod = (now - appStartTime) > 10000; 
    const isCreatedLive = messageTime > appStartTime;
    const isTrulyNew = !initialMessageIds.has(message.id);

    if (!isOwn && !isChatActive && isDataLoaded && isAfterGracePeriod && isCreatedLive && isTrulyNew) {
      const senderName = message.sender?.full_name || 'Чат';
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification(`Новое сообщение: ${senderName}`, {
          body: message.content || '',
          icon: '/logo192.png',
        });
      }
    }
  },

  /**
   * Внутренний метод обновления превью чата (НЕ меняет unreadCount)
   */
  _updateChatPreview: (chatId: string, message: Message) => {
    const { chats } = get();
    const idx = chats.findIndex((c) => c.id === chatId);
    if (idx === -1) return;

    const updated = [...chats];
    const oldChat = updated[idx];

    const updatedChatData = {
      ...oldChat,
      lastMessageId: message.id,
      lastMessageText: message.content,
      lastMessageAt: message.created_at,
      updated_at: message.created_at,
    };

    // Добавляем в messages если ещё нет
    const msgList = get().messages[chatId] || [];
    if (!msgList.some((m) => m.id === message.id)) {
      set({
        messages: {
          ...get().messages,
          [chatId]: [...msgList, message],
        },
      });
    }

    updated.splice(idx, 1);
    updated.unshift(updatedChatData);
    set({ chats: updated });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  clearMessages: (chatId) => {
    const { messages } = get();
    set({
      messages: {
        ...messages,
        [chatId]: [],
      },
    });
  },

  // ====== MARK AS READ ======

  markChatRead: async (chatId: string, lastReadAt: string) => {
    const { currentUserId } = useAuthStore.getState();
    if (!currentUserId || !chatId) return;

    // Оптимистично обнуляем unread в списке
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    }));

    // Пишем в БД
    try {
      const { error } = await supabase.from('chat_reads').upsert(
        {
          chat_id: chatId,
          user_id: currentUserId,
          last_read_at: lastReadAt,
        },
        { onConflict: 'chat_id,user_id' }
      );
      
      if (error) {
        console.error('❌ ОШИБКА БАЗЫ: Не удалось сохранить прочтение!', {
          chatId,
          userId: currentUserId,
          error: error.message,
          details: error.details
        });
      } else {
        console.log('✅ СИНХРОНИЗАЦИЯ: Статус прочтения сохранен в БД для чата', chatId);
      }
    } catch (err) {
      console.error('[ChatStore] markChatRead Exception:', err);
    }
  },

  // ====== FETCH CHATS (initial snapshot) ======

  fetchChats: async () => {
    const { currentUserId } = useAuthStore.getState();

    if (!currentUserId) {
      set({ loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Получаем chat_ids пользователя
      const { data: memberData, error: memberError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', currentUserId);

      if (memberError) throw memberError;

      const chatIds = memberData?.map((m) => m.chat_id) || [];

      if (chatIds.length === 0) {
        set({ chats: [], loading: false });
        return;
      }

      // Загружаем чаты с последними сообщениями и данными о прочтении
      const { data, error } = await supabase
        .from('chats')
        .select(
          `
          *,
          chat_members!inner (
            user_id,
            role,
            profiles:user_id (
              id,
              full_name,
              email,
              avatar_url,
              status,
              role
            )
          ),
          messages (
            id,
            content,
            sender_id,
            created_at
          ).order('created_at', { ascending: false }).limit(200),
          chat_reads (
            user_id,
            last_read_at
          )
        `
        )
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Формируем snapshot с unreadCount для ТЕКУЩЕГО пользователя
      const formattedChats: ChatItem[] = (data || []).map((chat: any) => {
        const messages = chat.messages || [];
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        const myRead = chat.chat_reads?.find(
          (r: any) => r.user_id === currentUserId
        );

        // Считаем непрочитанные: строго сообщения других пользователей после даты прочтения
        const lastReadTime = myRead ? new Date(myRead.last_read_at).getTime() : 0;
        
        const unreadMsgs = messages.filter((m: any) => {
          const isNotMe = m.sender_id !== currentUserId;
          const isNewer = new Date(m.created_at).getTime() > lastReadTime;
          return isNotMe && isNewer;
        });

        const initialUnread = unreadMsgs.length;

        // Лог для диагностики аккаунта Dmitry Cherevko
        if (currentUserId === 'd0ced572-9909-428f-8d70-6266bf3e0d1f') {
          console.log(`[INIT-DEBUG] Chat: ${chat.name || chat.id}, LastRead: ${new Date(lastReadTime).toISOString()}, FoundUnread: ${initialUnread}`);
        }

        return {
          ...chat,
          unreadCount: safeUnread(initialUnread),
          lastMessageId: lastMsg?.id ?? null,
          lastMessageText: lastMsg?.content ?? null,
          lastMessageAt: lastMsg?.created_at ?? null,
        };
      });

      // Собираем все ID сообщений из снимка базы для дедупликации уведомлений
      const allInitialIds = new Set<string>();
      formattedChats.forEach(chat => {
        chat.messages?.forEach(m => allInitialIds.add(m.id));
      });

      set({ 
        chats: formattedChats, 
        loading: false, 
        isInitialized: true,
        isDataLoaded: true, // Теперь уведомления разрешены
        initialMessageIds: allInitialIds
      });
    } catch (err: any) {
      console.error('[ChatStore] Error fetching chats:', err);
      set({ error: err, loading: false });
    }
  },

  // ====== FETCH MESSAGES ======

  fetchMessages: async (chatId: string) => {
    const { currentUserId } = useAuthStore.getState();
    if (!currentUserId || !chatId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:sender_id (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true }); // Убираем лимит для теста, чтобы видеть всё

      if (error) throw error;

      const messagesWithOwn = (data || []).map((msg: any) => ({
        ...msg,
        isOwn: msg.sender_id === currentUserId,
      }));

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: messagesWithOwn,
        },
      }));
    } catch (err) {
      console.error('[ChatStore] Error fetching messages:', err);
    }
  },

  // ====== TYPING STATUS ======

  sendTypingStatus: (chatId: string, userName: string) => {
    const channel = supabase.channel(`typing:${chatId}`);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userName },
        });
      }
    });
  },

  // ====== REALTIME SUBSCRIPTIONS ======

  initRealtime: () => {
    const state = get();
    if (state.isInitialized) return;
    set({ isInitialized: true });

    // Подписка на INSERT сообщений
    const msgChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          const { currentUserId } = useAuthStore.getState();

          const messageWithSender: Message = {
            ...newMessage,
            isOwn: isOwnMessage(newMessage.sender_id, currentUserId),
            sender: newMessage.sender || {
              full_name: 'Пользователь...',
              avatar_url: null,
            },
          };

          get().applyIncomingMessage(messageWithSender);
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userName } = payload.payload;
        const chatId = msgChannel.topic.replace('realtime:', '');

        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [chatId]: [
              ...new Set([...(state.typingUsers[chatId] || []), userName]),
            ],
          },
        }));

        setTimeout(() => {
          set((state) => ({
            typingUsers: {
              ...state.typingUsers,
              [chatId]: (state.typingUsers[chatId] || []).filter(
                (name) => name !== userName
              ),
            },
          }));
        }, 3000);
      })
      .subscribe();

    console.log('[ChatStore] Realtime subscriptions initialized');
  },
}));

// =====================================================
// HELPER: getTotalUnread — для бейджа в Sidebar
// =====================================================

export const getTotalUnread = (): number => {
  const chats = useChatStore.getState().chats;
  return chats.reduce((sum, chat) => sum + safeUnread(chat.unreadCount), 0);
};
