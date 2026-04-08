/**
 * Hooks for chats and messages — Zustand-based
 * Используют useAuth() как источник userId, синхронизируют authStore
 */

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, getTotalUnread } from '@/stores/useChatStore';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/auth/useAuth';

// =====================================================
// USE CHATS — инициализирует загрузку и realtime
// =====================================================

export function useChats() {
  // Используем useAuth() как единственный источник истины
  const { profile, authLoading, profileLoading } = useAuth();
  const currentUserId = profile?.id ?? null;
  // authReady = сессия восстановлена И профиль загружен (или нет профиля)
  const authReady = !authLoading && !profileLoading;

  const chats = useChatStore((s) => s.chats);
  const loading = useChatStore((s) => s.loading);
  const error = useChatStore((s) => s.error);
  const isRealtimeInitialized = useChatStore((s) => s.isRealtimeInitialized);
  const isChatsLoading = useChatStore((s) => s.isChatsLoading);
  const isChatsLoaded = useChatStore((s) => s.isChatsLoaded);
  const fetchChats = useChatStore((s) => s.fetchChats);
  const initRealtime = useChatStore((s) => s.initRealtime);

  // Синхронизируем userId в authStore чтобы useChatStore.getState() работал
  React.useEffect(() => {
    useAuthStore.setState({ currentUserId, authReady });
  }, [currentUserId, authReady]);

  // Инициализируем realtime один раз при старте
  React.useEffect(() => {
    if (authReady && currentUserId && !isRealtimeInitialized) {
      initRealtime();
    }
  }, [authReady, currentUserId, isRealtimeInitialized, initRealtime]);

  // Загружаем чаты когда пользователь готов
  React.useEffect(() => {
    if (authReady && currentUserId && !isChatsLoading && !isChatsLoaded) {
      fetchChats();
    } else if (authReady && !currentUserId) {
      useChatStore.setState({
        loading: false,
        chats: [],
        isChatsLoading: false,
        isChatsLoaded: false,
        isDataLoaded: false,
      });
    }
  }, [authReady, currentUserId, isChatsLoading, isChatsLoaded, fetchChats]);

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
  const { profile } = useAuth();
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

  // Fetch messages when chatId changes — always refetch to get sender info
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
    async (content: string, type: string = 'text', replyToMessageId?: string | null) => {
      if (!chatId || !content.trim() || !currentUserId) return null;

      try {
        const insertData: Record<string, unknown> = {
          chat_id: chatId,
          sender_id: currentUserId,
          content,
          message_type: type,
        };
        if (replyToMessageId) {
          insertData.reply_to_message_id = replyToMessageId;
        }

        const { data, error } = await supabase
          .from('messages')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('[sendMessage] Supabase error:', error);
          alert(`Ошибка отправки сообщения: ${error.message}`);
          throw error;
        }

        if (data) {
          // Загружаем reply info из локальных сообщений
          let replyToInfo: { id: string; senderName: string; content: string } | undefined;
          if (replyToMessageId) {
            const allMsgs = useChatStore.getState().messages[chatId] || [];
            const origMsg = allMsgs.find((m: any) => m.id === replyToMessageId);
            if (origMsg) {
              replyToInfo = {
                id: origMsg.id,
                senderName: origMsg.sender?.full_name || 'Пользователь',
                content: origMsg.content || '📎 Вложение',
              };
            }
          }

          useChatStore.getState().addMessage({
            ...data,
            isOwn: true,
            sender: profile ? {
              id: currentUserId,
              full_name: profile.full_name || 'Вы',
              avatar_url: profile.avatar_url || null,
            } : undefined,
            replyTo: replyToInfo,
          });
        }

        return data;
      } catch (err: any) {
        console.error('Error sending message:', err);
        return null;
      }
    },
    [chatId, currentUserId, profile]
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
          // Бесшовное добавление чата без полной перезагрузки списка
          await useChatStore.getState().fetchAndAddChat(data);
        }

        return data;
      } catch (err: any) {
        console.error('Error creating direct chat:', err);
        return null;
      }
    },
    [profile]
  );

  const deleteChatForMe = React.useCallback(
    async (chatId: string) => {
      await useChatStore.getState().deleteChatForMe(chatId);
    },
    []
  );

  const deleteChatForAll = React.useCallback(
    async (chatId: string) => {
      await useChatStore.getState().deleteChatForAll(chatId);
    },
    []
  );

  return {
    createDirectChat,
    deleteChatForMe,
    deleteChatForAll,
  };
}

// Re-export useAuth for compatibility
export { useAuth } from '@/hooks/auth/useAuth';
