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
  selectedChatId: null,

  // ====== ACTIONS ======

  setChats: (chats) => set({ chats }),

  setSelectedChatId: (chatId) => {
    set({ selectedChatId: chatId });
    // При выборе чата — обнуляем unread
    if (chatId) {
      const { chats } = get();
      const updated = chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      );
      set({ chats: updated });
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
    const { chats, selectedChatId } = get();
    const { currentUserId } = useAuthStore.getState();

    const own = isOwnMessage(message.sender_id, currentUserId);
    const isOpenChat = selectedChatId === message.chat_id;
    const isVisible =
      typeof document !== 'undefined' && document.visibilityState === 'visible';

    const nextChats = chats.map((chat) => {
      if (chat.id !== message.chat_id) return chat;

      let nextUnread = chat.unreadCount;

      if (!own) {
        if (isOpenChat && isVisible) {
          // Сообщение в открытом чате — не считаем unread
          nextUnread = 0;
          // Пометим как прочитанное
          void get().markChatRead(message.chat_id, message.created_at);
        } else {
          // Сообщение в другом чате — увеличиваем unread
          nextUnread = safeUnread(chat.unreadCount) + 1;
        }
      }

      return {
        ...chat,
        lastMessageId: message.id,
        lastMessageText: message.content,
        lastMessageAt: message.created_at,
        updated_at: message.created_at,
        unreadCount: nextUnread,
      };
    });

    set({ chats: nextChats });

    // Добавляем в messages
    const { messages } = get();
    const chatMessages = messages[message.chat_id] || [];
    if (!chatMessages.some((m) => m.id === message.id)) {
      set({
        messages: {
          ...messages,
          [message.chat_id]: [...chatMessages, message],
        },
      });
    }

    // Уведомление
    if (!own && !isOpenChat) {
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
    const chat = { ...updated[idx] };

    // Двигаем чат вверх, обновляем превью (НО НЕ unreadCount!)
    chat.lastMessageId = message.id;
    chat.lastMessageText = message.content;
    chat.lastMessageAt = message.created_at;
    chat.updated_at = message.created_at;

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
    updated.unshift(chat);
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

    // Оптимистично обнуляем unread
    const { chats } = get();
    const updated = chats.map((c) =>
      c.id === chatId ? { ...c, unreadCount: 0 } : c
    );
    set({ chats: updated });

    // Пишем в БД
    try {
      await supabase.from('chat_reads').upsert(
        {
          chat_id: chatId,
          user_id: currentUserId,
          last_read_at: lastReadAt,
        },
        { onConflict: 'chat_id,user_id' }
      );
    } catch (err) {
      console.error('[ChatStore] markChatRead error:', err);
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
          ),
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

        // Считаем unread из snapshot: сообщения НЕ от меня, ПОСЛЕ last_read_at
        const initialUnread = myRead
          ? messages.filter(
              (m: any) =>
                m.sender_id !== currentUserId &&
                new Date(m.created_at) > new Date(myRead.last_read_at)
            ).length
          : messages.filter((m: any) => m.sender_id !== currentUserId).length;

        return {
          ...chat,
          unreadCount: safeUnread(initialUnread),
          lastMessageId: lastMsg?.id ?? null,
          lastMessageText: lastMsg?.content ?? null,
          lastMessageAt: lastMsg?.created_at ?? null,
        };
      });

      set({ chats: formattedChats, loading: false });
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
        .order('created_at', { ascending: true })
        .limit(50);

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
