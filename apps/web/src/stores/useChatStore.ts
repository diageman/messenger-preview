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

  // Chat creation — seamless add without full reload
  fetchAndAddChat: (chatId: string) => Promise<ChatItem | null>;

  // Chat deletion
  deleteChatForMe: (chatId: string) => Promise<void>;
  deleteChatForAll: (chatId: string) => Promise<void>;

  // Message deletion
  deleteMessageForMe: (messageId: string) => Promise<void>;
  deleteMessageForEveryone: (messageId: string) => Promise<void>;

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

      // 2. Всегда помечаем как прочитанное на ТЕКУЩИЙ момент времени
      void get().markChatRead(chatId, new Date().toISOString());
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
   * Realtime INSERT чужого сообщения — здесь мы обновляем и список чатов, и сообщения
   */
  applyIncomingMessage: (message: Message) => {
    // ВАЖНО: Достаем messages прямо здесь, чтобы не было ReferenceError
    const { chats, selectedChatId, messages, markChatRead } = get();
    const { currentUserId } = useAuthStore.getState();

    const isOwn = message.sender_id === currentUserId;
    const isChatActive = selectedChatId === message.chat_id;
    const isTabVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';

    console.log(`[Realtime] Сообщение в чате ${message.chat_id}. Активен: ${isChatActive}`);

    const chatIndex = chats.findIndex((c) => c.id === message.chat_id);
    
    // Если чата нет в списке — добавляем только для НОВЫХ сообщений (после входа)
    // Старые сообщения игнорируем чтобы не создавать лишние запросы
    if (chatIndex === -1) {
      const { appStartTime } = get();
      const messageTime = new Date(message.created_at).getTime();
      const isNewMessage = messageTime > appStartTime;
      
      if (isNewMessage) {
        get().fetchAndAddChat(message.chat_id);
      }
      return;
    }

    const updatedChats = [...chats];
    const oldChat = updatedChats[chatIndex];

    // Логика счетчика непрочитанных
    let newUnread = oldChat.unreadCount || 0;
    if (isOwn || (isChatActive && isTabVisible)) {
      newUnread = 0;
      if (isChatActive && !isOwn) {
        void markChatRead(message.chat_id, message.created_at);
      }
    } else {
      newUnread = newUnread + 1;
    }

    // Обновляем данные конкретного чата для списка
    const updatedChat = {
      ...oldChat,
      unreadCount: newUnread,
      lastMessageId: message.id,
      lastMessageText: message.content,
      lastMessageAt: message.created_at,
      updated_at: message.created_at,
      // Сохраняем и внутри объекта чата (для списка)
      messages: [...(Array.isArray(oldChat.messages) ? oldChat.messages : []), message]
    };

    // Перемещаем чат наверх списка
    updatedChats.splice(chatIndex, 1);
    updatedChats.unshift({ ...updatedChat, updated_at: new Date().toISOString() });

    // Обновляем глобальный объект сообщений (Record<chatId, Message[]>)
    const currentMsgs = messages[message.chat_id] || [];
    const isDuplicate = currentMsgs.some((m) => m.id === message.id);
    
    const nextMessages = isDuplicate 
      ? messages 
      : { ...messages, [message.chat_id]: [...currentMsgs, message] };

    // Применяем изменения в стор
    set({ 
      chats: updatedChats, 
      messages: nextMessages 
    });

    // Уведомление: только если сообщение создано ПОСЛЕ входа пользователя на страницу
    const { isDataLoaded, appStartTime, initialMessageIds } = get();
    const messageTime = new Date(message.created_at).getTime();
    
    // ЖЕСТКИЙ БЛОК: Молчим первые 10 секунд сессии в любом случае
    const isAfterGracePeriod = (Date.now() - appStartTime) > 10000; 
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

      // 1. Сначала тянем чаты и сообщения
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_members!inner (
            user_id, role,
            profiles:user_id (id, full_name, email, avatar_url, status, role)
          ),
          messages (id, content, sender_id, created_at)
          .order('created_at', { ascending: false }).limit(200)
        `)
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // 2. ОТДЕЛЬНО и ПРЯМО тянем прочтения для ТЕКУЩЕГО пользователя
      const { data: allReads, error: readError } = await supabase
        .from('chat_reads')
        .select('chat_id, last_read_at')
        .eq('user_id', currentUserId);

      if (readError) console.error('[DEBUG] Ошибка загрузки прочтений:', readError);
      console.log('[DEBUG-FETCH] Всего прочтений в базе для юзера:', allReads?.length);

      // Формируем snapshot с unreadCount для ТЕКУЩЕГО пользователя
      const formattedChats: ChatItem[] = (data || []).map((chat: any) => {
        // Гарантируем, что сообщения — это массив
        const rawMessages = Array.isArray(chat.messages) ? chat.messages : [];
        
        // Сортируем: новые сверху
        const sortedMsgs = [...rawMessages].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const lastMsg = sortedMsgs.length > 0 ? sortedMsgs[0] : null;
        const myRead = allReads?.find(r => r.chat_id === chat.id);
        const lastReadTime = myRead ? new Date(myRead.last_read_at).getTime() : 0;
        
        const unreadMsgs = sortedMsgs.filter((m: any) => {
          const isNotMe = m.sender_id !== currentUserId;
          const isNewer = new Date(m.created_at).getTime() > lastReadTime;
          return isNotMe && (isNewer || lastReadTime === 0);
        });

        // Определяем имя и аватар для direct чатов
        let displayName = chat.name;
        let peerAvatar = null;
        let peerStatus = 'offline';

        if (chat.type === 'direct') {
          const peer = chat.chat_members?.find((m: any) => m.user_id !== currentUserId)?.profiles;
          if (peer) {
            displayName = peer.full_name;
            peerAvatar = peer.avatar_url;
            peerStatus = peer.status;
          }
        }

        return {
          ...chat,
          name: displayName || 'Загрузка...',
          peerAvatar,
          peerStatus,
          unreadCount: safeUnread(unreadMsgs.length),
          lastMessageId: lastMsg?.id ?? null,
          lastMessageText: lastMsg?.content ?? null,
          lastMessageAt: lastMsg?.created_at ?? null,
          messages: sortedMsgs,
          // Добавляем поле participants для совместимости с ChatList
          participants: chat.chat_members?.map((m: any) => ({
            id: m.user_id,
            name: m.profiles?.full_name,
            avatar: m.profiles?.avatar_url || (m.profiles?.full_name?.[0] ?? '?')
          })) || []
        };
      });

      // 3. Синхронизируем сообщения с глобальным хранилищем Record<chatId, Message[]>
      const messagesMap: Record<string, any[]> = {};
      const allInitialIds = new Set<string>();

      formattedChats.forEach(chat => {
        const chatMsgs = chat.messages || [];
        messagesMap[chat.id] = chatMsgs;
        chatMsgs.forEach((m: any) => allInitialIds.add(m.id));
      });

      set({ 
        chats: formattedChats, 
        messages: { ...get().messages, ...messagesMap },
        loading: false, 
        isInitialized: true,
        isDataLoaded: true,
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
      // 1. Получаем ID скрытых сообщений для текущего пользователя
      const { data: hiddenData } = await supabase
        .from('hidden_messages')
        .select('message_id')
        .eq('user_id', currentUserId);
      
      const hiddenIds = hiddenData?.map(h => h.message_id) || [];

      // 2. Загружаем сообщения, исключая те, что скрыты "для себя"
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (id, full_name, avatar_url)
        `)
        .eq('chat_id', chatId);

      if (hiddenIds.length > 0) {
        query = query.not('id', 'in', `(${hiddenIds.join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

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

  // ====== FETCH AND ADD SINGLE CHAT (seamless, no loading state) ======

  fetchAndAddChat: async (chatId: string): Promise<ChatItem | null> => {
    const { currentUserId } = useAuthStore.getState();
    if (!currentUserId || !chatId) return null;

    try {
      // Загружаем только один чат со всеми связанными данными
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_members!inner (
            user_id, role,
            profiles:user_id (id, full_name, email, avatar_url, status, role)
          )
        `)
        .eq('id', chatId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Проверяем, нет ли уже этого чата в списке
      const { chats } = get();
      if (chats.some(c => c.id === chatId)) {
        return chats.find(c => c.id === chatId) || null;
      }

      // Формируем ChatItem
      const rawMessages = Array.isArray(data.messages) ? data.messages : [];
      const lastMsg = rawMessages.length > 0 ? rawMessages[0] : null;

      let displayName = data.name;
      let peerAvatar = null;
      let peerStatus = 'offline';

      if (data.type === 'direct') {
        const peer = data.chat_members?.find((m: any) => m.user_id !== currentUserId)?.profiles;
        if (peer) {
          displayName = peer.full_name;
          peerAvatar = peer.avatar_url;
          peerStatus = peer.status;
        }
      }

      const newChat: ChatItem = {
        ...data,
        name: displayName || 'Загрузка...',
        peerAvatar,
        peerStatus,
        unreadCount: 0,
        lastMessageId: lastMsg?.id ?? null,
        lastMessageText: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.created_at ?? null,
        messages: rawMessages,
        participants: data.chat_members?.map((m: any) => ({
          id: m.user_id,
          name: m.profiles?.full_name,
          avatar: m.profiles?.avatar_url || (m.profiles?.full_name?.[0] ?? '?')
        })) || []
      };

      // Добавляем чат в НАЧАЛО списка без сброса loading
      set({ chats: [newChat, ...chats] });

      return newChat;
    } catch (err) {
      console.error('[ChatStore] fetchAndAddChat error:', err);
      return null;
    }
  },

  // ====== DELETE CHAT FOR ME ======

  deleteChatForMe: async (chatId: string) => {
    const { selectedChatId } = get();

    try {
      const { error } = await supabase.rpc('delete_chat_for_self', { p_chat_id: chatId });
      if (error) throw error;

      const { [chatId]: _, ...restMessages } = get().messages;
      set({
        chats: get().chats.filter((c) => c.id !== chatId),
        messages: restMessages,
        selectedChatId: selectedChatId === chatId ? null : selectedChatId,
      });
    } catch (err: any) {
      console.error('[ChatStore] deleteChatForMe error:', err);
      throw err;
    }
  },

  // ====== DELETE CHAT FOR ALL ======

  deleteChatForAll: async (chatId: string) => {
    const { selectedChatId } = get();

    try {
      const { error } = await supabase.rpc('delete_chat_for_all', { p_chat_id: chatId });
      if (error) throw error;

      const { [chatId]: _, ...restMessages } = get().messages;
      set({
        chats: get().chats.filter((c) => c.id !== chatId),
        messages: restMessages,
        selectedChatId: selectedChatId === chatId ? null : selectedChatId,
      });
    } catch (err: any) {
      console.error('[ChatStore] deleteChatForAll error:', err);
      throw err;
    }
  },

  // ====== MESSAGE DELETION ======

  deleteMessageForMe: async (messageId: string) => {
    const { currentUserId } = useAuthStore.getState();
    const { messages } = get();
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('hidden_messages')
        .insert({ message_id: messageId, user_id: currentUserId });

      if (error) throw error;

      // Локальное обновление: убираем сообщение из стейта
      const updatedMessages = { ...messages };
      for (const chatId in updatedMessages) {
        updatedMessages[chatId] = updatedMessages[chatId].filter(m => m.id !== messageId);
      }
      set({ messages: updatedMessages });
    } catch (err) {
      console.error('[ChatStore] deleteMessageForMe error:', err);
      throw err;
    }
  },

  deleteMessageForEveryone: async (messageId: string) => {
    const { messages } = get();
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      // Локальное обновление: убираем сообщение у всех (через realtime прилетит всем остальным)
      const updatedMessages = { ...messages };
      for (const chatId in updatedMessages) {
        updatedMessages[chatId] = updatedMessages[chatId].filter(m => m.id !== messageId);
      }
      set({ messages: updatedMessages });
    } catch (err) {
      console.error('[ChatStore] deleteMessageForEveryone error:', err);
      throw err;
    }
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
        async (payload) => {
          const newMessage = payload.new as any;
          const { currentUserId } = useAuthStore.getState();

          // Если данных отправителя нет (обычно в Realtime Payload), пробуем их достать
          let senderInfo = newMessage.sender;
          
          if (!senderInfo) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', newMessage.sender_id)
              .single();
            
            if (profile) senderInfo = profile;
          }

          const messageWithSender: Message = {
            ...newMessage,
            isOwn: isOwnMessage(newMessage.sender_id, currentUserId),
            sender: {
              id: newMessage.sender_id,
              full_name: senderInfo?.full_name || 'Сотрудник',
              avatar: senderInfo?.avatar_url || null,
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

    // Подписка на удаление чатов (когда другой пользователь удаляет для всех)
    supabase
      .channel('public:chats-deleted')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chats',
        },
        (payload: any) => {
          const deletedChatId = payload.old?.id;
          if (!deletedChatId) return;

          const state = get();
          console.log('[ChatStore] Chat deleted via realtime:', deletedChatId);

          // Remove chat from list and clear selection
          const { [deletedChatId]: _, ...restMessages } = state.messages;
          set({
            chats: state.chats.filter((c) => c.id !== deletedChatId),
            messages: restMessages,
            selectedChatId: state.selectedChatId === deletedChatId ? null : state.selectedChatId,
          });
        }
      )
      .subscribe();

    // Подписка на удаление из chat_members (синхронизация между вкладками при удалении для себя)
    supabase
      .channel('public:chat-members-deleted')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_members',
        },
        (payload: any) => {
          const deletedMemberUserId = payload.old?.user_id;
          const deletedChatId = payload.old?.chat_id;
          if (!deletedChatId || !deletedMemberUserId) return;

          // Обновляем только если это текущий пользователь (синхронизация между вкладками)
          const { currentUserId } = useAuthStore.getState();
          if (deletedMemberUserId !== currentUserId) return;

          console.log('[ChatStore] User removed from chat via realtime:', deletedChatId);

          const state = get();
          const { [deletedChatId]: _, ...restMessages } = state.messages;
          set({
            chats: state.chats.filter((c) => c.id !== deletedChatId),
            messages: restMessages,
            selectedChatId: state.selectedChatId === deletedChatId ? null : state.selectedChatId,
          });
        }
      )
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
