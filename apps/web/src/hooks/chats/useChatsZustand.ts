/**
 * Hooks for chats and messages - Zustand-based
 */

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, initChatSubscriptions } from '@/stores/useChatStore';

// =====================================================
// USE CHATS
// =====================================================

export function useChats() {
  const { profile } = useAuth();
  
  // Используем точечные селекторы для стабильности ссылок
  const chats = useChatStore(state => state.chats);
  const loading = useChatStore(state => state.loading);
  const error = useChatStore(state => state.error);
  const fetchChats = useChatStore(state => state.fetchChats);

  // Debug log
  console.log('[useChats] Profile:', profile?.id, 'Loading:', loading);

  // Initialize realtime subscriptions AFTER profile loads
  React.useEffect(() => {
    if (profile?.id) {
      console.log('[useChats] Initializing subscriptions for user:', profile.id);
      initChatSubscriptions();
    }
  }, [profile?.id]);

  // Fetch chats AFTER profile loads
  React.useEffect(() => {
    if (profile?.id) {
      console.log('[useChats] Fetching chats for user:', profile.id);
      fetchChats();
    } else {
      // Если профиль пропал (logout), ставим loading в false, чтобы не крутился вечно
      useChatStore.setState({ loading: false });
    }
  }, [profile?.id, fetchChats]);

  return {
    chats,
    loading,
    error,
    refresh: fetchChats,
  };
}

// =====================================================
// USE MESSAGES
// =====================================================

interface UseMessagesOptions {
  chatId: string | null;
}

export function useMessages({ chatId }: UseMessagesOptions) {
  // Use stable empty array to prevent Zustand getSnapshot infinite loop
  const EMPTY_ARRAY: any[] = React.useMemo(() => [], []);
  
  const messages = useChatStore(React.useCallback((state) => {
    if (!chatId) return EMPTY_ARRAY;
    return state.messages[chatId] || EMPTY_ARRAY;
  }, [chatId, EMPTY_ARRAY]));
  
  const addMessage = useChatStore(state => state.addMessage);
  const clearMessages = useChatStore(state => state.clearMessages);
  const fetchMessages = useChatStore(state => state.fetchMessages);

  const markAsRead = React.useCallback(async (chatId: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    await supabase.from('chat_reads').upsert({
      chat_id: chatId,
      user_id: auth.user.id,
      last_read_at: new Date().toISOString()
    });
  }, []);

  // Fetch messages and mark read when chatId changes
  React.useEffect(() => {
    if (!chatId) {
      clearMessages('');
    } else {
      fetchMessages(chatId);
    }
  }, [chatId, fetchMessages, clearMessages]);

  // Отдельный эффект для прочтения, чтобы не зацикливать рендер
  React.useEffect(() => {
    if (chatId) {
      markAsRead(chatId);
    }
  }, [chatId, markAsRead]);

  // Send message with optimistic update
  const sendMessage = React.useCallback(async (content: string, type: string = 'text') => {
    if (!chatId || !content.trim()) return null;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        console.error('[sendMessage] No user authenticated');
        return null;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: userId,
          content,
          message_type: type,
        })
        .select()
        .single();

      if (error) {
        console.error('[sendMessage] Supabase error:', error);
        alert(`Ошибка отправки сообщения: ${error.message}`);
        throw error;
      }

      // Optimistic: add to global store immediately
      if (data) {
        addMessage({
          ...data,
          isOwn: true,
        });
      }

      return data;
    } catch (err: any) {
      console.error('Error sending message:', err);
      return null;
    }
  }, [chatId, addMessage]);

  return {
    messages,
    loading: false,
    error: null,
    sendMessage,
    refresh: () => {},
  };
}

// =====================================================
// USE CHAT ACTIONS
// =====================================================

import { useAuth } from '@/hooks/auth/useAuth';

export function useChatActions() {
  const { profile } = useAuth();

  // Create direct chat
  const createDirectChat = React.useCallback(async (otherUserId: string) => {
    if (!profile) {
      console.error('[createDirectChat] No profile');
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('create_direct_chat', {
        p_org_id: profile.organization_id,
        p_user1_id: profile.id,
        p_user2_id: otherUserId,
      });

      if (error) {
        console.error('[createDirectChat] RPC error:', error);
        alert(`Ошибка создания чата: ${error.message}`);
        throw error;
      }

      if (!data) {
        alert('Чат не был создан: база данных вернула пустой результат.');
      } else {
        // Успешно создали — принудительно обновляем список чатов в интерфейсе!
        useChatStore.getState().fetchChats();
      }

      return data;
    } catch (err: any) {
      console.error('Error creating direct chat:', err);
      return null;
    }
  }, [profile]);

  return {
    createDirectChat,
  };
}

// Re-export useAuth for compatibility
export { useAuth } from '@/hooks/auth/useAuth';
