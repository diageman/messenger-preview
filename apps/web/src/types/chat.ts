/**
 * Типы для чатов
 * Вынесены отдельно для избежания циклических зависимостей
 */

export type ChatType = 'direct' | 'group' | 'channel';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'system' | 'pinned' | 'attachment';
export type FileType = 'image' | 'pdf' | 'doc' | 'xlsx' | 'other';
export type EmployeeStatus = 'online' | 'busy' | 'away' | 'offline';
export type ChatCategory = 'all' | 'direct' | 'groups' | 'unread' | 'important';

export interface Employee {
  id: string;
  name: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  department: string;
  avatar: string;
  status?: EmployeeStatus;
}

export interface Attachment {
  id: string;
  name: string;
  type: FileType;
  size: string;
  url: string;
}

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  sender?: Employee;
  timestamp: string;
  date: string;
  isOwn: boolean;
  status?: MessageStatus;
  isPinned?: boolean;
  attachments?: Attachment[];
  reactions?: { emoji: string; count: number; users: string[] }[];
  deleted_at?: string | null;
  edited_at?: string | null;
  sender_id?: string;
  replyTo?: { id: string; senderName: string; content: string } | null;
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  description?: string;
  participants: Employee[];
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isPinned: boolean;
  isImportant: boolean;
  department?: string;
}

export interface ChatDetails {
  id: string;
  name: string;
  description: string;
  type: ChatType;
  participants: Employee[];
  status?: EmployeeStatus;
  pinnedMessages?: Message[];
  files?: Attachment[];
}
