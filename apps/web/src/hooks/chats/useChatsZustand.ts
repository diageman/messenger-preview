/**
 * Hooks for chats and messages — Zustand-based
 * Используют authStore для currentUserId (НИКАКИХ supabase.auth.getUser())
 */

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, getTotalUnread } from '@/stores/useChatStore';
import { useAuthStore } from '@/store/authStore';

// =====================================================
// USE CHATS — инициализирует загрузку и realtime
// =====================================================

export function useChats() {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const authReady = useAuthStore((s) => s.authReady);
  const chats = useChatStore((s) => s.chats);
  const loading = useChatStore((s) => s.loading);
  const error = useChatStore((s) => s.error);
  const fetchChats = useChatStore((s) => s.fetchChats);
  const initRealtime = useChatStore((s) => s.initRealtime);

  // Инициализируем realtime один раз при старте
  React.useEffect(() => {
    if (authReady && currentUserId) {
      initRealtime();
    }
  }, [authReady, currentUserId, initRealtime]);

  // Загружаем чаты когда пользователь готов
  React.useEffect(() => {
    if (authReady && currentUserId) {
      fetchChats();
    } else if (authReady && !currentUserId) {
      useChatStore.setState({ loading: false, chats: [] });
    }
  }, [authReady, currentUserId, fetchChats]);

  return {
    chats,
    loading,
    error,
    refresh: fetchChats,
    totalUnread: getTotalUnread(),
  };
}

// =====================================================
// USE MESSAGES
// =====================================================

interface UseMessagesOptions {
  chatId: string | null;
}

const STABLE_EMPTY_ARRAY: any[] = [];

export function useMessages({ chatId }: UseMessagesOptions) {
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const messages = useChatStore(
    React.useCallback(
      (state) => {
        if (!chatId) return STABLE_EMPTY_ARRAY;
        return state.messages[chatId] || STABLE_EMPTY_ARRAY;
      },
      [chatId]
    )
  );
  const clearMessages = useChatStore((s) => s.clearMessages);
  const fetchMessages = useChatStore((s) => s.fetchMessages);

  const markAsRead = React.useCallback(
    async (chatId: string) => {
      if (!chatId || chatId.length < 20) return;
      await useChatStore.getState().markChatRead(chatId, new Date().toISOString());
    },
    []
  );

  // Fetch messages when chatId changes
  React.useEffect(() => {
    if (!chatId || String(chatId).length < 30) {
      if (chatId === '') clearMessages('');
      return;
    }
    fetchMessages(chatId);
  }, [chatId, fetchMessages, clearMessages]);

  // Mark as read when chatId changes
  React.useEffect(() => {
    if (chatId) {
      markAsRead(chatId);
    }
  }, [chatId, markAsRead]);

  // Send message
  const sendMessage = React.useCallback(
    async (content: string, type: string = 'text') => {
      if (!chatId || !content.trim() || !currentUserId) return null;

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            sender_id: currentUserId,
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

        if (data) {
          useChatStore.getState().addMessage({
            ...data,
            isOwn: true,
          });
        }

        return data;
      } catch (err: any) {
        console.error('Error sending message:', err);
        return null;
      }
    },
    [chatId, currentUserId]
  );

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

  const createDirectChat = React.useCallback(
    async (otherUserId: string) => {
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
          useChatStore.getState().fetchChats();
        }

        return data;
      } catch (err: any) {
        console.error('Error creating direct chat:', err);
        return null;
      }
    },
    [profile]
  );

  return {
    createDirectChat,
  };
}

// Re-export useAuth for compatibility
export { useAuth } from '@/hooks/auth/useAuth';
