/**
 * React hook для управления состоянием чатов
 * Включает: выбор чата, отправку сообщений, поиск, pinned state
 */

import * as React from 'react';
import type { Chat, Message, Employee, Attachment } from '../types/chat';
import { initialChats, initialMessages, currentUser } from '../data/mockChats';
import {
  getFromStorage,
  setToStorage,
  getFromSessionStorage,
  setToSessionStorage,
} from '../lib/chatStorage';
import type { ChatCategory, EmployeeStatus } from '../types/chat';

interface UseChatStateReturn {
  // Chats
  chats: Chat[];
  selectedChatId: string | null;
  messages: Message[];
  
  // Actions
  selectChat: (chatId: string) => void;
  sendMessage: (content: string, attachments?: Attachment[]) => void;
  togglePin: (chatId: string) => void;
  markAsRead: (chatId: string) => void;
  
  // UI State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: ChatCategory;
  setActiveCategory: (category: ChatCategory) => void;
  showInfoPanel: boolean;
  setShowInfoPanel: (show: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  
  // Employee
  employeeStatus: EmployeeStatus;
  setEmployeeStatus: (status: EmployeeStatus) => void;
  currentUser: Employee;
  
  // Filtered
  filteredChats: Chat[];
  unreadTotal: number;
}

export function useChatState(): UseChatStateReturn {
  // ===== STATE =====
  const [chats, setChats] = React.useState<Chat[]>(() =>
    getFromStorage('messenger_chats', initialChats)
  );
  
  const [messagesMap, setMessagesMap] = React.useState<Record<string, Message[]>>(() =>
    getFromStorage('messenger_messages', initialMessages)
  );
  
  const [selectedChatId, setSelectedChatId] = React.useState<string | null>(() =>
    getFromStorage('messenger_selected_chat', null)
  );
  
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<ChatCategory>('all');
  const [showInfoPanel, setShowInfoPanel] = React.useState(() =>
    getFromSessionStorage('messenger_show_info_panel', false)
  );
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [employeeStatus, setEmployeeStatus] = React.useState<EmployeeStatus>(() =>
    getFromStorage('messenger_employee_status', 'online' as EmployeeStatus)
  );

  // ===== PERSISTENCE =====
  React.useEffect(() => {
    setToStorage('messenger_chats', chats);
  }, [chats]);

  React.useEffect(() => {
    setToStorage('messenger_messages', messagesMap);
  }, [messagesMap]);

  React.useEffect(() => {
    if (selectedChatId) {
      setToStorage('messenger_selected_chat', selectedChatId);
    }
  }, [selectedChatId]);

  React.useEffect(() => {
    setToStorage('messenger_employee_status', employeeStatus);
  }, [employeeStatus]);

  React.useEffect(() => {
    setToSessionStorage('messenger_show_info_panel', showInfoPanel);
  }, [showInfoPanel]);

  // ===== ACTIONS =====
  const selectChat = React.useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    // Mark as read
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ));
  }, []);

  const sendMessage = React.useCallback((content: string, attachments?: Attachment[]) => {
    if (!selectedChatId || !content.trim()) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const dateString = 'Сегодня';

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      type: attachments ? 'attachment' : 'text',
      content,
      timestamp: timeString,
      date: dateString,
      isOwn: true,
      status: 'sent',
      attachments,
    };

    // Add message to current chat
    setMessagesMap(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMessage],
    }));

    // Update last message in chat list
    setChats(prev => prev.map(chat =>
      chat.id === selectedChatId
        ? { ...chat, lastMessage: content, timestamp: timeString }
        : chat
    ).sort((a, b) => {
      // Move current chat to top
      if (a.id === selectedChatId) return -1;
      if (b.id === selectedChatId) return 1;
      return 0;
    }));

    // Simulate status change: sent -> delivered -> read
    setTimeout(() => {
      setMessagesMap(prev => {
        const chatMessages = prev[selectedChatId] || [];
        return {
          ...prev,
          [selectedChatId]: chatMessages.map(msg =>
            msg.id === newMessage.id ? { ...msg, status: 'delivered' as const } : msg
          ),
        };
      });
    }, 1000);

    setTimeout(() => {
      setMessagesMap(prev => {
        const chatMessages = prev[selectedChatId] || [];
        return {
          ...prev,
          [selectedChatId]: chatMessages.map(msg =>
            msg.id === newMessage.id ? { ...msg, status: 'read' as const } : msg
          ),
        };
      });
    }, 2000);
  }, [selectedChatId]);

  const togglePin = React.useCallback((chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, isPinned: !chat.isPinned } : chat
    ).sort((a, b) => {
      // Pinned chats first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    }));
  }, []);

  const markAsRead = React.useCallback((chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ));
  }, []);

  // ===== FILTERED CHATS =====
  const filteredChats = React.useMemo(() => {
    return chats.filter((chat) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          chat.name.toLowerCase().includes(query) ||
          chat.lastMessage.toLowerCase().includes(query) ||
          chat.participants.some((p) => p.name.toLowerCase().includes(query))
        );
      }
      
      // Category filter
      if (activeCategory === 'direct') return chat.type === 'direct';
      if (activeCategory === 'groups') return chat.type === 'group' || chat.type === 'channel';
      if (activeCategory === 'unread') return chat.unreadCount > 0;
      if (activeCategory === 'important') return chat.isPinned || chat.isImportant;
      return true;
    });
  }, [chats, searchQuery, activeCategory]);

  const unreadTotal = React.useMemo(() =>
    chats.reduce((acc, chat) => acc + chat.unreadCount, 0),
    [chats]
  );

  const messages = selectedChatId ? (messagesMap[selectedChatId] || []) : [];

  // ===== KEYBOARD SHORTCUTS =====
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Escape: Close panels/search
      if (e.key === 'Escape') {
        if (isSearchOpen) setIsSearchOpen(false);
        if (showInfoPanel) setShowInfoPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, showInfoPanel]);

  return {
    // Chats
    chats,
    selectedChatId,
    messages,
    
    // Actions
    selectChat,
    sendMessage,
    togglePin,
    markAsRead,
    
    // UI State
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    showInfoPanel,
    setShowInfoPanel,
    isSearchOpen,
    setIsSearchOpen,
    
    // Employee
    employeeStatus,
    setEmployeeStatus,
    currentUser,
    
    // Filtered
    filteredChats,
    unreadTotal,
  };
}
