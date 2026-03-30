/**
 * Основные типы мессенджера
 */

// ===== ПОЛЬЗОВАТЕЛЬ =====
export interface User {
  id: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  role: UserRole;
  segment?: TaxiSegment;
  lastSeen?: Date;
}

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export type UserRole = 'driver' | 'dispatcher' | 'admin' | 'manager';

export type TaxiSegment = 'economy' | 'comfort' | 'business' | 'premium' | 'courier' | 'cargo';

// ===== ЧАТ =====
export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  avatar?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  metadata?: ChatMetadata;
}

export type ChatType = 'direct' | 'group' | 'shift' | 'dispatch';

export interface ChatMetadata {
  shiftId?: string;
  routeId?: string;
  orderId?: string;
  tags?: string[];
}

// ===== СООБЩЕНИЕ =====
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  status: MessageStatus;
  isEdited: boolean;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'location' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

// ===== СМЕНА (SHIFT) =====
export interface Shift {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: ShiftStatus;
  participants: User[];
  chatId: string;
}

export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

// ===== УВЕДОМЛЕНИЯ (SIGNALS) =====
export interface Signal {
  id: string;
  type: SignalType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: SignalPriority;
  action?: SignalAction;
}

export type SignalType = 'message' | 'system' | 'alert' | 'shift' | 'order';

export type SignalPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SignalAction {
  label: string;
  action: string;
}

// ===== НАВИГАЦИЯ =====
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  disabled?: boolean;
}

// ===== UI ТИПЫ =====
export interface SizeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface VariantProps {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'outline';
}

export interface ColorProps {
  color?: 'default' | 'brand' | 'success' | 'warning' | 'error' | 'info';
}

// ===== КОМПОНЕНТЫ ТАКСИ =====
export interface VehicleAnimation {
  type: 'taxi' | 'courier' | 'bike' | 'cargo' | 'premium';
  trigger: 'page-load' | 'section-enter' | 'action' | 'hover';
  duration?: number;
  enabled?: boolean;
}
