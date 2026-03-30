/**
 * Константы мессенджера
 */

// ===== НАВИГАЦИЯ =====
export const NAVIGATION = {
  MAIN: [
    { id: 'line', label: 'Линия', icon: 'radio' },
    { id: 'chats', label: 'Чаты', icon: 'messages' },
    { id: 'shifts', label: 'Смены', icon: 'briefcase' },
    { id: 'crew', label: 'Экипаж', icon: 'users' },
    { id: 'signals', label: 'Сигналы', icon: 'bell' },
  ],
  SECONDARY: [
    { id: 'settings', label: 'Панель парка', icon: 'settings' },
    { id: 'profile', label: 'Профиль', icon: 'user' },
  ],
} as const;

// ===== СТАТУСЫ ПОЛЬЗОВАТЕЛЯ =====
export const USER_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

// ===== РОЛИ =====
export const USER_ROLE = {
  DRIVER: 'driver',
  DISPATCHER: 'dispatcher',
  ADMIN: 'admin',
  MANAGER: 'manager',
} as const;

// ===== СЕГМЕНТЫ ТАКСИ =====
export const TAXI_SEGMENT = {
  ECONOMY: 'economy',
  COMFORT: 'comfort',
  BUSINESS: 'business',
  PREMIUM: 'premium',
  COURIER: 'courier',
  CARGO: 'cargo',
} as const;

// ===== ТИПЫ ЧАТОВ =====
export const CHAT_TYPE = {
  DIRECT: 'direct',
  GROUP: 'group',
  SHIFT: 'shift',
  DISPATCH: 'dispatch',
} as const;

// ===== ТИПЫ СООБЩЕНИЙ =====
export const MESSAGE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  LOCATION: 'location',
  SYSTEM: 'system',
} as const;

// ===== СТАТУСЫ СООБЩЕНИЙ =====
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

// ===== СТАТУСЫ СМЕНЫ =====
export const SHIFT_STATUS = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// ===== ПРИОРИТЕТЫ СИГНАЛОВ =====
export const SIGNAL_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// ===== ТИПЫ СИГНАЛОВ =====
export const SIGNAL_TYPE = {
  MESSAGE: 'message',
  SYSTEM: 'system',
  ALERT: 'alert',
  SHIFT: 'shift',
  ORDER: 'order',
} as const;

// ===== НАСТРОЙКИ ПО УМОЛЧАНИЮ =====
export const DEFAULTS = {
  AVATAR_SIZE: 40,
  MESSAGE_LIMIT: 50,
  CHAT_LIMIT: 100,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  ANIMATION_DURATION: 200,
} as const;

// ===== ЛИМИТЫ =====
export const LIMITS = {
  MESSAGE_LENGTH: 4000,
  USERNAME_MIN: 2,
  USERNAME_MAX: 32,
  AVATAR_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  FILE_MAX_SIZE: 25 * 1024 * 1024,  // 25MB
} as const;

// ===== КЛАВИШИ =====
export const KEYS = {
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
} as const;

// ===== МАРШРУТЫ =====
export const ROUTES = {
  HOME: '/',
  LINE: '/line',
  CHATS: '/chats',
  CHAT: '/chats/:id',
  SHIFTS: '/shifts',
  SHIFT: '/shifts/:id',
  CREW: '/crew',
  SIGNALS: '/signals',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;
