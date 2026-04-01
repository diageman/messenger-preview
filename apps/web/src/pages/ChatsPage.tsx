import { cn } from '@messenger/ui';
import { TopBar } from '../components/TopBar';
import { ChatList } from '../components/ChatList';
import { ChatWindow } from '../components/ChatWindow';
import { useChats, useMessages } from '../hooks/chats/useChatsZustand';
import { useResizable } from '../hooks/useResizable';
import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { getChatAvatarData } from '@/lib/chatAvatar';

export function ChatsPage() {
  const { profile } = useAuth();
  const { chats = [], loading } = useChats();  // ← Default to empty array
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const { messages = [], sendMessage, loading: messagesLoading } = useMessages({ chatId: selectedChatId }) as any;

  // Show loading state
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

  // Find selected chat data
  const selectedChat: any = chats.find((c: any) => c.id === selectedChatId);
  
  // Get peer member for direct chat
  const selectedPeerMember = selectedChat?.type === 'direct' && selectedChat?.chat_members && profile?.id
    ? selectedChat.chat_members.find((m: any) => m.user_id !== profile.id && m.profiles)
    : null;

  // Get avatar data using unified helper
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
  
  const chatListResizer = useResizable({
    key: 'messenger_chatlist_width',
    minWidth: 72,
    maxWidth: 420,
    defaultValue: 320,
    collapsedWidth: 72,
  });

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    // Mark as read when opening chat
    // This will be handled by useMessages automatically
  };

  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  // Transform chats for ChatList component
  const chatListData = (chats as any[]).map((chat: any) => {
    // Get last message (LAST in array, not first!)
    const messagesArray = chat.messages || [];
    const lastMessage = messagesArray.length > 0
      ? messagesArray[messagesArray.length - 1]
      : null;

    // Calculate unread count
    const myRead = chat.chat_reads?.find((r: any) => r.user_id === profile?.id);
    const unreadCount = lastMessage && myRead
      ? messagesArray.filter((m: any) =>
          m.sender_id !== profile?.id &&
          new Date(m.created_at) > new Date(myRead.last_read_at)
        ).length
      : 0;

    // Get peer member for direct chat - UNIFIED SOURCE OF TRUTH
    let peerMember = null;
    let peerFullName = '';
    let peerRole = '';
    let peerAvatar = '?';
    let peerStatus = 'offline';
    
    if (chat.type === 'direct' && chat.chat_members && profile?.id) {
      // Find the OTHER participant (not current user)
      peerMember = chat.chat_members.find(
        (m: any) => m.user_id !== profile.id && m.profiles
      );
      
      if (peerMember?.profiles) {
        peerFullName = peerMember.profiles.full_name;
        peerRole = peerMember.profiles.role || '';
        peerAvatar = peerMember.profiles.avatar_url || peerMember.profiles.full_name?.[0] || '?';
        peerStatus = peerMember.profiles.status || 'offline';
      }
    }

    // Get avatar data using unified helper
    const participants = chat.chat_members?.map((m: any) => ({
      id: m.user_id,
      name: m.profiles?.full_name || 'Unknown',
      avatar: m.profiles?.avatar_url || m.profiles?.full_name?.[0] || '?',
      status: m.profiles?.status || 'offline',
    })) || [];

    const avatarData = getChatAvatarData(
      chat.type,
      peerFullName || chat.name,
      participants,
      profile?.id,
      peerMember
    );

    return {
      id: chat.id,
      type: chat.type as 'direct' | 'group' | 'channel',
      name: avatarData.title,
      description: peerRole || chat.description || '',
      // Pass peer data directly for ChatList to use
      peerAvatar,
      peerStatus,
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

  return (
    <div className="flex h-full flex-col bg-bg-app">
      <TopBar
        title="Чаты"
        subtitle="Внутренние коммуникации"
        showSearch={false}
      />

      <main className="flex flex-1 overflow-hidden">
        {/* Chat List Panel */}
        <div
          className="relative flex shrink-0 flex-col"
          style={{ width: chatListResizer.width }}
        >
          <ChatList
            chats={loading ? [] : chatListData}
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

          {/* Resize Handle */}
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

        {/* Chat Window Panel */}
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
            loading={messagesLoading}
          />
        </div>
      </main>
    </div>
  );
}
