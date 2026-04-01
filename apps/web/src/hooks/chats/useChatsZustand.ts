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
  const { chats, loading, error, fetchChats } = useChatStore();

  // Initialize realtime subscriptions once
  React.useEffect(() => {
    initChatSubscriptions();
  }, []);

  // Fetch chats on mount
  React.useEffect(() => {
    fetchChats();
  }, [fetchChats]);

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
  const messages = useChatStore((state) => 
    chatId ? state.messages[chatId] || [] : []
  );
  const addMessage = useChatStore((state) => state.addMessage);
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Clear messages when chatId changes
  React.useEffect(() => {
    if (!chatId) {
      clearMessages('');
    } else {
      clearMessages(chatId);
    }
  }, [chatId, clearMessages]);

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
