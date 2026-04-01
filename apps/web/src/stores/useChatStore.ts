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

  // Actions
  setChats: (chats: Chat[]) => void;
  addMessage: (message: Message) => void;
  updateChatPreview: (chatId: string, message: Message) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clearMessages: (chatId: string) => void;
  fetchChats: () => Promise<void>;

  // Realtime subscription management
  subscribeToChats: () => void;
  subscribeToMessages: () => void;
  unsubscribe: () => void;
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

  // Actions
  setChats: (chats) => set({ chats }),

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
    const updatedChat = {
      ...updatedChats[chatIndex],
      lastMessage: message.content || '',
      updated_at: message.created_at,
    };

    // Move to top (recent first)
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

  subscribeToMessages: () => {
    const channel = supabase
      .channel('messages:global')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMessage = payload.new as Message;
        
        // Add to global messages store
        get().addMessage(newMessage);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  unsubscribe: () => {
    supabase.removeAllChannels();
  },

  // Fetch chats from DB
  fetchChats: async () => {
    const { setLoading, setChats, setError } = get();
    
    try {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        console.log('[fetchChats] No user authenticated, skipping');
        setLoading(false);
        return;
      }

      // Get chat_ids where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      const chatIds = memberData?.map(m => m.chat_id) || [];

      if (chatIds.length === 0) {
        setChats([]);
        setLoading(false);
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

      setChats(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching chats:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  },
}));

// =====================================================
// INIT REALTIME SUBSCRIPTIONS (call once on app start)
// =====================================================

let isSubscribed = false;

export const initChatSubscriptions = () => {
  if (isSubscribed) return;
  
  const store = useChatStore.getState();
  store.subscribeToChats();
  store.subscribeToMessages();
  
  isSubscribed = true;
  console.log('[ChatStore] Realtime subscriptions initialized');
};
