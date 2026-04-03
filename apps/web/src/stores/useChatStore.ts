/**
 * Global chat store using Zustand
 * Single source of truth for chats and messages
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// =====================================================
// TYPES
// =====================================================

export interface Chat {
  id: string;
  type: 'direct' | 'group' | 'channel';
  organization_id: string;
  name: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  direct_chat_key: string | null;
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
  messages?: Message[];
  chat_reads?: Array<{
    user_id: string;
    last_read_at: string;
    last_read_message_id: string | null;
  }>;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isPinned?: boolean;
  isImportant?: boolean;
}

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

// =====================================================
// STORE STATE
// =====================================================

interface ChatState {
  // Data
  chats: Chat[];
  messages: Record<string, Message[]>; // chatId -> messages
  loading: boolean;
  error: Error | null;
  typingUsers: Record<string, string[]>; // chatId -> userNames[]
  isInitialized: boolean;
  selectedChatId: string | null;

  // Actions
  setChats: (chats: Chat[]) => void;
  setSelectedChatId: (chatId: string | null) => void;
  addMessage: (message: Message) => void;
  updateChatPreview: (chatId: string, message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clearMessages: (chatId: string) => void;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendTypingStatus: (chatId: string, userName: string) => void;

  // Realtime subscription management
  subscribeToChats: () => void;
  subscribeToMessages: () => void;
  unsubscribe: () => void;
}

// =====================================================
// HELPER FUNCTIONS (defined outside store for stability)
// =====================================================

async function fetchChatsImpl(set: any, get: any) {
  // Предотвращаем повторные вызовы во время загрузки
  if (get().loading && get().chats.length > 0) return;

  console.log('[ChatStore] fetchChats called');

  // Set loading TRUE в начале
  set({ loading: true, error: null });

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    console.log('[ChatStore] User ID:', userId);

    if (!userId) {
      console.log('[ChatStore] No user authenticated, waiting for session...');
      set({ loading: false }); // Просто останавливаем лоадер, не очищая массив
      return;
    }

    // Get chat_ids where user is a member
    const { data: memberData, error: memberError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId);

    if (memberError) throw memberError;

    const chatIds = memberData?.map(m => m.chat_id) || [];

    console.log('[ChatStore] Found chatIds:', chatIds.length);

    if (chatIds.length === 0) {
      console.log('[ChatStore] No chats found');
      set({ chats: [], loading: false });
      return;
    }

    const { data, error } = await supabase
      .from('chats')
      .select(`
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
        `)
      .in('id', chatIds)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    console.log('[ChatStore] Fetched chats:', data.length);

    const formattedChats = (data || []).map(chat => {
      const messages = chat.messages || [];
      const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
      const dateString = lastMsg ? lastMsg.created_at : chat.updated_at;
      
      const existingChat = get().chats.find((c: any) => c.id === chat.id);
      const myRead = chat.chat_reads?.find((r: any) => r.user_id === userId);
      
      // Если есть данные о прочтении, считаем сообщения после этой даты
      const initialUnread = myRead 
        ? chat.messages?.filter((m: any) => m.sender_id !== userId && new Date(m.created_at) > new Date(myRead.last_read_at)).length 
        : 0;

      return {
        ...chat,
        lastMessage: lastMsg ? lastMsg.content : (chat.description || 'Нет сообщений'),
        timestamp: dateString,
        unreadCount: existingChat ? existingChat.unreadCount : initialUnread
      };
    });

    // Проверка на глубокое равенство перед установкой (простой JSON check для производительности)
    const currentChatsJson = JSON.stringify(get().chats);
    const newChatsJson = JSON.stringify(formattedChats);

    if (currentChatsJson !== newChatsJson) {
      set({ chats: formattedChats });
    }
  } catch (err: any) {
    console.error('[ChatStore] Error fetching chats:', err);
    set({ error: err });
  } finally {
    set({ loading: false });
  }
}

async function fetchMessagesImpl(set: any, chatId: string) {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    
    // 🚨 ЛОГ ДЛЯ ПРОВЕРКИ ДЕПЛОЯ
    console.log('🚀 [ChatStore] Attempting to fetch messages for:', chatId);

    if (!chatId || typeof chatId !== 'string' || chatId.length < 30) {
      console.error('❌ [ChatStore] BLOCKED! Invalid UUID format:', `"${chatId}"`);
      return;
    }

    if (!userId) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
          *,
          sender:sender_id (
            id,
            full_name,
            avatar_url
          )
        `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;

    const messagesWithOwn = (data || []).map((msg: any) => ({
      ...msg,
      isOwn: msg.sender_id === userId,
    }));

    set((state: any) => ({
      messages: {
        ...state.messages,
        [chatId]: messagesWithOwn,
      }
    }));
  } catch (err) {
    console.error('[ChatStore] Error fetching messages:', err);
  }
}

// =====================================================
// CREATE STORE
// =====================================================

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state - loading TRUE для предотвращения мигания пустого списка при F5
  chats: [],
  messages: {},
  loading: true,
  error: null,
  typingUsers: {},
  isInitialized: false,
  selectedChatId: null,

  // Actions
  setChats: (chats) => set({ chats }),

  setSelectedChatId: (chatId) => {
    set({ selectedChatId: chatId });
    if (chatId) {
      // При выборе чата обнуляем его счетчик
      const { chats } = get();
      const updated = chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c);
      set({ chats: updated });
    }
  },

  addMessage: (message) => {
    const { messages } = get();
    const chatMessages = messages[message.chat_id] || [];

    // Dedupe by message ID
    const exists = chatMessages.some(m => m.id === message.id);
    if (exists) return;

    set({
      messages: {
        ...messages,
        [message.chat_id]: [...chatMessages, message],
      },
    });

    // Update chat preview
    get().updateChatPreview(message.chat_id, message);
  },

  updateChatPreview: (chatId, message) => {
    const { chats } = get();
    const chatIndex = chats.findIndex(c => c.id === chatId);

    if (chatIndex === -1) return;

    const updatedChats = [...chats];
    const oldChat = updatedChats[chatIndex];
    
    // Создаем обновленный объект чата
    const { selectedChatId } = get();
    const isNotActive = chatId !== selectedChatId;

    const updatedChat = {
      ...oldChat,
      messages: [...(oldChat.messages || []), message],
      unreadCount: (oldChat.unreadCount || 0) + (!message.isOwn && isNotActive ? 1 : 0),
      lastMessage: message.content || '',
      updated_at: message.created_at,
    };

    // Перемещаем чат в самое начало списка (сортировка по новизне)
    updatedChats.splice(chatIndex, 1);
    updatedChats.unshift(updatedChat);

    set({ chats: updatedChats });
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

  // Fetch chats from DB - stable reference
  fetchChats: () => fetchChatsImpl(set, get),

  // Fetch messages - stable reference
  fetchMessages: (chatId: string) => fetchMessagesImpl(set, chatId),

  // Realtime subscriptions
  subscribeToChats: () => {
    const channel = supabase
      .channel('chats')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chats',
      }, () => {
        // Refetch chats on change
        get().fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

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

  subscribeToMessages: () => {
    // Используем более уникальное имя канала и слушаем все изменения (включая UPDATE для статусов)
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        const newMessage = payload.new as any;
        console.log('[Realtime] New message arrived:', newMessage.id);
        
        // Получаем свежий ID пользователя
        const { data } = await supabase.auth.getUser();
        const currentUserId = data.user?.id;
        
        const messageWithSender = {
          ...newMessage,
          isOwn: newMessage.sender_id === currentUserId,
          sender: newMessage.sender || { 
            full_name: 'Пользователь...', 
            avatar_url: null 
          }
        };
        
        // addMessage сам внутри вызывает updateChatPreview, второй вызов не нужен
        get().addMessage(messageWithSender);

        // Показываем уведомление, если сообщение не наше и окно не в фокусе
        if (!messageWithSender.isOwn && document.visibilityState !== 'visible') {
          if (Notification.permission === 'granted') {
            new Notification(`Новое сообщение: ${messageWithSender.sender?.full_name || 'Чат'}` , {
              body: messageWithSender.content || '',
              icon: '/logo192.png'
            });
          }
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userName } = payload.payload;
        const chatId = channel.topic.replace('realtime:', '');

        // Добавляем пользователя в список печатающих
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [chatId]: [...new Set([...(state.typingUsers[chatId] || []), userName])]
          }
        }));

        // Убираем его через 3 секунды (таймаут печати)
        setTimeout(() => {
          set((state) => ({
            typingUsers: {
              ...state.typingUsers,
              [chatId]: (state.typingUsers[chatId] || []).filter(name => name !== userName)
            }
          }));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  unsubscribe: () => {
    supabase.removeAllChannels();
  },
}));

// =====================================================
// INIT REALTIME SUBSCRIPTIONS (call once on app start)
// =====================================================

export const initChatSubscriptions = () => {
  const state = useChatStore.getState();
  if (state.isInitialized) return;

  useChatStore.setState({ isInitialized: true });
  
  state.subscribeToChats();
  state.subscribeToMessages();
  
  console.log('[ChatStore] Realtime subscriptions initialized');
};
