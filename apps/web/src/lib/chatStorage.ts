/**
 * LocalStorage persistence для чатов
 * Ключи и утилиты для сохранения состояния
 */

const STORAGE_KEYS = {
  CHATS: 'messenger_chats',
  MESSAGES: 'messenger_messages',
  SELECTED_CHAT: 'messenger_selected_chat',
  EMPLOYEE_STATUS: 'messenger_employee_status',
  PINNED_CHATS: 'messenger_pinned_chats',
  SHOW_INFO_PANEL: 'messenger_show_info_panel',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export function getFromStorage<T>(key: StorageKey, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function removeFromStorage(key: StorageKey): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

// Session storage для временных данных
export function getFromSessionStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = sessionStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function setToSessionStorage<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to sessionStorage:', error);
  }
}
