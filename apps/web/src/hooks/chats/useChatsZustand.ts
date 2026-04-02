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
  const { chats = [], loading, error, fetchChats } = useChatStore();

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
    }
    // Если profile = null или undefined - просто не делаем fetch
    // Стор сам очистится при logout через auth state change
  }, [profile?.id]);

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
  
  const messages = useChatStore((state) => {
    if (!chatId) return EMPTY_ARRAY;
    return state.messages[chatId] || EMPTY_ARRAY;
  });
  
  const addMessage = useChatStore((state) => state.addMessage);
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Clear messages when chatId changes (safe - only clears, doesn't trigger re-fetch)
  React.useEffect(() => {
    if (!chatId) {
      clearMessages('');
    } else {
      clearMessages(chatId);
    }
  }, [chatId]);  // ← УБРАЛ clearMessages из deps!

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

      if (error) throw error;

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

      if (error) throw error;

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
