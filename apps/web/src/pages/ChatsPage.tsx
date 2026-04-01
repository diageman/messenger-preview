import { cn } from '@messenger/ui';
import { TopBar } from '../components/TopBar';
import { ChatList } from '../components/ChatList';
import { ChatWindow } from '../components/ChatWindow';
import { useMessages, useAuth } from '../hooks/chats/useChatsZustand';
import { useResizable } from '../hooks/useResizable';
import { useState, useEffect } from 'react';
import { getChatAvatarData } from '@/lib/chatAvatar';
import { useChatStore } from '@/stores/useChatStore';

export function ChatsPage() {
  // =====================================================
  // 1. ALL HOOKS AT THE TOP (NO CONDITIONS)
  // =====================================================
  const { profile } = useAuth();
  const chats = useChatStore((state) => state.chats);  // ← Селектор вместо деструктуризации
  const loading = useChatStore((state) => state.loading);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { messages = [], sendMessage } = useMessages({ chatId: selectedChatId }) as any;
  const chatListResizer = useResizable({
    key: 'messenger_chatlist_width',
    minWidth: 72,
    maxWidth: 420,
    defaultValue: 320,
    collapsedWidth: 72,
  });

  // =====================================================
  // 2. EFFECTS ONLY (no state updates in render)
  // =====================================================
  
  // Auto-select first chat when chats load (safe - only when length changes)
  useEffect(() => {
    if (!loading && chats.length > 0 && selectedChatId === null) {
      setSelectedChatId(chats[0].id);
    }
  }, [loading, chats.length, selectedChatId]);  // ← chats.length это примитив, OK

  // =====================================================
  // 3. COMPUTED VALUES (pure, no side effects)
  // =====================================================
  const selectedChat: any = chats.find((c: any) => c.id === selectedChatId);

  const selectedPeerMember = selectedChat?.type === 'direct' && selectedChat?.chat_members && profile?.id
    ? selectedChat.chat_members.find((m: any) => m.user_id !== profile.id && m.profiles)
    : null;

  const selectedParticipants = selectedChat?.chat_members?.map((m: any) => ({
    id: m.user_id,
    name: m.profiles?.full_name || 'Unknown',
    avatar: m.profiles?.full_name?.[0] || '?',
  })) || [];

  const selectedAvatarData = getChatAvatarData(
    selectedChat?.type || 'direct',
    selectedPeerMember?.profiles?.full_name || selectedChat?.name,
    selectedParticipants,
    profile?.id,
    selectedPeerMember
  );

  const selectedChatName = selectedAvatarData.title;
  const selectedChatDescription = selectedPeerMember?.profiles?.role || selectedChat?.description || '';
  const selectedChatParticipants = selectedChat?.chat_members?.map((m: any) => ({
    id: m.user_id,
    name: m.profiles?.full_name || 'Unknown',
    avatar: m.profiles?.avatar_url || m.profiles?.full_name?.[0] || '?',
    status: m.profiles?.status || 'offline',
  })) || [];

  // Transform chats for ChatList component (pure function)
  const chatListData = (chats as any[]).map((chat: any) => {
    const messagesArray = chat.messages || [];
    const lastMessage = messagesArray.length > 0
      ? messagesArray[messagesArray.length - 1]
      : null;

    const myRead = chat.chat_reads?.find((r: any) => r.user_id === profile?.id);
    const unreadCount = lastMessage && myRead
      ? messagesArray.filter((m: any) =>
          m.sender_id !== profile?.id &&
          new Date(m.created_at) > new Date(myRead.last_read_at)
        ).length
      : 0;

    let peerMember = null;
    if (chat.type === 'direct' && chat.chat_members && profile?.id) {
      peerMember = chat.chat_members.find(
        (m: any) => m.user_id !== profile.id && m.profiles
      );
    }

    const participants = chat.chat_members?.map((m: any) => ({
      id: m.user_id,
      name: m.profiles?.full_name || 'Unknown',
      avatar: m.profiles?.avatar_url || m.profiles?.full_name?.[0] || '?',
      status: m.profiles?.status || 'offline',
    })) || [];

    const avatarData = getChatAvatarData(
      chat.type,
      peerMember?.profiles?.full_name || chat.name,
      participants,
      profile?.id,
      peerMember
    );

    return {
      id: chat.id,
      type: chat.type as 'direct' | 'group' | 'channel',
      name: avatarData.title,
      description: peerMember?.profiles?.role || chat.description || '',
      peerAvatar: peerMember?.profiles?.avatar_url || peerMember?.profiles?.full_name?.[0] || '?',
      peerStatus: peerMember?.profiles?.status || 'offline',
      participants: chat.chat_members?.map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.full_name || 'Unknown',
        avatar: m.profiles?.avatar_url || m.profiles?.full_name?.[0] || '?',
        status: m.profiles?.status || 'offline',
      })) || [],
      lastMessage: lastMessage?.content || '',
      timestamp: lastMessage?.created_at
        ? new Date(lastMessage.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        : '',
      unreadCount,
      isPinned: false,
      isImportant: false,
    };
  });

  const unreadTotal = chatListData.reduce((sum, chat) => sum + chat.unreadCount, 0);

  // =====================================================
  // 4. EVENT HANDLERS (state updates OK here)
  // =====================================================
  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  // =====================================================
  // 5. EARLY RETURNS (AFTER ALL HOOKS)
  // =====================================================
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-app">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" />
          <p className="text-sm text-text-muted">Загрузка чатов...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // 6. MAIN RENDER
  // =====================================================
  return (
    <div className="flex h-full flex-col bg-bg-app">
      <TopBar
        title="Чаты"
        subtitle="Внутренние коммуникации"
        showSearch={false}
      />

      <main className="flex flex-1 overflow-hidden">
        <div
          className="relative flex shrink-0 flex-col"
          style={{ width: chatListResizer.width }}
        >
          <ChatList
            chats={chatListData}
            selectedChatId={selectedChatId}
            onSelectChat={handleSelectChat}
            searchQuery=""
            onSearchChange={() => {}}
            activeCategory="all"
            onCategoryChange={() => {}}
            isSearchOpen={false}
            onSearchOpenChange={() => {}}
            unreadTotal={unreadTotal}
          />

          {!chatListResizer.isCollapsed && (
            <div
              className={cn(
                'absolute right-0 top-0 h-full w-1 cursor-col-resize z-20 transition-colors',
                chatListResizer.isResizing && 'bg-accent-yellow'
              )}
              onMouseDown={chatListResizer.startResize}
            />
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatWindow
            chatId={selectedChatId}
            messages={messages}
            onSendMessage={handleSendMessage}
            chatName={selectedChatName}
            chatDescription={selectedChatDescription}
            chatType={selectedChat?.type}
            chatParticipants={selectedChatParticipants}
            peerMember={selectedPeerMember}
            loading={false}
          />
        </div>
      </main>
    </div>
  );
}
