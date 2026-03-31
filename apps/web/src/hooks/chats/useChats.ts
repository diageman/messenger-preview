/**
 * Hooks for chats and messages
 */

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Chat, Message } from '@/types/chat';

// =====================================================
// USE CHATS
// =====================================================

export function useChats() {
  const { profile } = useAuth();
  const [chats, setChats] = React.useState<Chat[]>([]);
  const [loading, setLoading] = React.useState(true);  // Initial load
  const [error, setError] = React.useState<Error | null>(null);

  // Fetch chats
  const fetchChats = React.useCallback(async (isRefresh = false) => {
    if (!profile) return;

    try {
      // Step 1: Get chat_ids where I'm a member
      const { data: memberData, error: memberError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', profile.id);

      if (memberError) throw memberError;

      const chatIds = memberData?.map(m => m.chat_id) || [];

      if (chatIds.length === 0) {
        if (!isRefresh) {
          setChats([]);
          setLoading(false);
        }
        return;
      }

      // Step 2: Get full chat data including ALL members for these chats
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_members (
            user_id,
            role,
            profiles:user_id (
              id,
              full_name,
              email,
              role,
              avatar_url,
              status
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

      // Always update chats (no empty state during refresh)
      setChats(data || []);
    } catch (err: any) {
      console.error('Error fetching chats:', err);
      setError(err);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [profile]);

  // Subscribe to chat changes
  React.useEffect(() => {
    if (!profile) return;

    console.log('[useChats] Creating realtime subscription for chats table');

    const channel = supabase
      .channel('chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
          fetchChats(true);  // Refresh, not initial load
        }
      )
      .subscribe();

    return () => {
      console.log('[useChats] Cleaning up realtime subscription for chats');
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]); // Removed fetchChats from deps

  // Subscribe to messages for chat list updates (REALTIME + smart patching)
  React.useEffect(() => {
    if (!profile) return;

    console.log('[useChats] Creating realtime subscription for messages (chat list)');

    const channel = supabase
      .channel('messages:chat_list')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new;
          console.log('[useChats] Message INSERT received, patching chat list');
          
          // Smart patch: update only the affected chat
          setChats((prevChats: any[]) => {
            if (!prevChats || prevChats.length === 0) return prevChats;
            
            const chatIndex = prevChats.findIndex((c) => c.id === newMessage.chat_id);
            if (chatIndex === -1) return prevChats; // Not our chat
            
            // Create updated chat object
            const updatedChat = {
              ...prevChats[chatIndex],
              messages: [...(prevChats[chatIndex].messages || []), newMessage],
              updated_at: newMessage.created_at,
            };
            
            // Move updated chat to top (recent first)
            const newChats = [...prevChats];
            newChats.splice(chatIndex, 1);
            newChats.unshift(updatedChat);
            
            console.log('[useChats] Chat list patched');
            return newChats;
          });
        }
      )
      .subscribe();

    // FALLBACK: Polling for chat list (MVP reliability) - FASTER for better UX
    // Poll every 5 seconds to keep chat list fresh
    const pollInterval = setInterval(() => {
      console.log('[useChats] Polling for chat list updates...');
      fetchChats(true);  // Pass true to indicate refresh (not initial load)
    }, 5000);

    return () => {
      console.log('[useChats] Cleaning up messages chat_list subscription and polling');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]); // Removed fetchChats from deps

  // Initial fetch
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
  const { profile } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  // Fetch messages
  const fetchMessages = React.useCallback(async () => {
    if (!chatId || !profile) return;

    try {
      setLoading(true);

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
      
      // Add isOwn flag to messages
      const messagesWithOwn = (data || []).map((msg: any) => ({
        ...msg,
        isOwn: msg.sender_id === profile.id,
      }));
      
      setMessages(messagesWithOwn);

      // Mark as read
      await supabase
        .from('chat_reads')
        .upsert({
          chat_id: chatId,
          user_id: profile.id,
          last_read_message_id: data?.[data.length - 1]?.id || null,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'chat_id,user_id',
        });

    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [chatId, profile]);

  // Send message
  const sendMessage = React.useCallback(async (content: string, type: string = 'text') => {
    if (!chatId || !profile || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: profile.id,
          content,
          message_type: type,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Optimistic: add message immediately to UI
      const messageWithOwn = {
        ...data,
        isOwn: true,
      };
      setMessages((prev) => [...prev, messageWithOwn]);
      
      return data;
    } catch (err: any) {
      console.error('Error sending message:', err);
      return null;
    }
  }, [chatId, profile]);

  // Subscribe to new messages (REALTIME + fallback polling)
  React.useEffect(() => {
    if (!chatId) {
      console.log('[useMessages] No chatId, skipping realtime subscription');
      return;
    }

    console.log('[useMessages] Creating realtime subscription for chat:', chatId);

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload: any) => {
          console.log('[useMessages] Realtime INSERT received for chat:', chatId, 'payload:', payload);
          const newMessage = payload.new;
          // Add isOwn flag for realtime message
          const messageWithOwn = {
            ...newMessage,
            isOwn: newMessage.sender_id === profile?.id,
          };
          console.log('[useMessages] Adding message, isOwn:', messageWithOwn.isOwn);
          // Dedupe: only add if not already present
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMessage.id);
            console.log('[useMessages] Message exists in state:', exists);
            if (exists) return prev;
            return [...prev, messageWithOwn];
          });
        }
      )
      .subscribe((status) => {
        console.log('[useMessages] Realtime subscription status:', status);
      });

    // FALLBACK: Polling for messages (MVP reliability) - SLOW to avoid visual jitter
    // Poll every 10 seconds only if realtime fails
    const pollInterval = setInterval(() => {
      console.log('[useMessages] Polling for new messages (fallback)...');
      fetchMessages();
    }, 10000);

    return () => {
      console.log('[useMessages] Cleaning up realtime subscription and polling for chat:', chatId);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]); // Removed profile from deps

  // Initial fetch
  React.useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    refresh: fetchMessages,
  };
}

// =====================================================
// USE CHAT ACTIONS
// =====================================================

export function useChatActions() {
  const { profile } = useAuth();

  // Create direct chat
  const createDirectChat = React.useCallback(async (otherUserId: string) => {
    if (!profile) {
      console.error('[createDirectChat] No profile');
      return null;
    }

    console.log('[createDirectChat] Starting:', {
      profileId: profile.id,
      profileOrg: profile.organization_id,
      otherUserId
    });

    try {
      const { data, error } = await supabase.rpc('create_direct_chat', {
        p_org_id: profile.organization_id,
        p_user1_id: profile.id,
        p_user2_id: otherUserId,
      });

      if (error) {
        console.error('[createDirectChat] RPC error:', error);
        throw error;
      }
      
      console.log('[createDirectChat] Success, chatId:', data);
      return data;
    } catch (err: any) {
      console.error('[createDirectChat] Exception:', err);
      return null;
    }
  }, [profile]);

  // Create group chat
  const createGroupChat = React.useCallback(async (name: string, memberIds: string[]) => {
    if (!profile) return null;

    try {
      // Create chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          organization_id: profile.organization_id,
          type: 'group',
          name,
          created_by: profile.id,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add members (including creator)
      const members = [...memberIds, profile.id].map((userId) => ({
        chat_id: chat.id,
        user_id: userId,
        role: userId === profile.id ? 'admin' as const : 'member' as const,
      }));

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(members);

      if (membersError) throw membersError;

      return chat;
    } catch (err: any) {
      console.error('Error creating group chat:', err);
      return null;
    }
  }, [profile]);

  // Archive chat
  const archiveChat = React.useCallback(async (chatId: string) => {
    if (!profile) return;

    try {
      await supabase
        .from('archived_chats')
        .insert({
          chat_id: chatId,
          user_id: profile.id,
        });
    } catch (err: any) {
      console.error('Error archiving chat:', err);
    }
  }, [profile]);

  // Unarchive chat
  const unarchiveChat = React.useCallback(async (chatId: string) => {
    if (!profile) return;

    try {
      await supabase
        .from('archived_chats')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', profile.id);
    } catch (err: any) {
      console.error('Error unarchiving chat:', err);
    }
  }, [profile]);

  // Mark chat as read
  const markAsRead = React.useCallback(async (chatId: string, lastMessageId?: string) => {
    if (!profile) return;

    try {
      await supabase
        .from('chat_reads')
        .upsert({
          chat_id: chatId,
          user_id: profile.id,
          last_read_message_id: lastMessageId || null,
          last_read_at: new Date().toISOString(),
        }, {
          onConflict: 'chat_id,user_id',
        });
    } catch (err: any) {
      console.error('Error marking as read:', err);
    }
  }, [profile]);

  return {
    createDirectChat,
    createGroupChat,
    archiveChat,
    unarchiveChat,
    markAsRead,
  };
}
