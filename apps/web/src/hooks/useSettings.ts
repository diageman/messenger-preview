/**
 * Hook для управления настройками приложения
 * Сохраняет все настройки в localStorage
 */

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// ===== TYPES =====
export interface ProfileSettings {
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  status: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
}

export interface NotificationSettings {
  sound: boolean;
  push: boolean;
  email: 'all' | 'important' | 'none';
  mentions: boolean;
  systemSignals: boolean;
  doNotDisturb: boolean;
  doNotDisturbSchedule: {
    enabled: boolean;
    from: string;
    to: string;
  };
}

export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'system';
  density: 'compact' | 'default' | 'spacious';
  textSize: 'small' | 'medium' | 'large';
  animations: boolean;
  showAvatars: boolean;
}

export interface ChatSettings {
  sidebarMode: 'expanded' | 'compact';
  chatListMode: 'full' | 'compact';
  enterToSend: boolean;
  preservePanelSizes: boolean;
  showAttachmentPreview: boolean;
  autoMarkAsRead: boolean;
  showTimestamps: 'always' | 'soft';
  groupMessages: boolean;
}

export interface SecuritySettings {
  twoFactor: boolean;
  activeSessions: number;
  autoLock: boolean;
  autoLockTimeout: number;
}

export interface AppSettings {
  version: string;
  platform: string;
}

// ===== STORAGE KEYS =====
const STORAGE_KEYS = {
  PROFILE: 'messenger_settings_profile',
  NOTIFICATIONS: 'messenger_settings_notifications',
  APPEARANCE: 'messenger_settings_appearance',
  CHATS: 'messenger_settings_chats',
  SECURITY: 'messenger_settings_security',
} as const;

// ===== DEFAULT VALUES =====
// Примечание: эти значения используются ТОЛЬКО если нет auth session
// После логина profile берётся из Supabase через useAuth
const defaultProfile: ProfileSettings = {
  name: '',
  role: '',
  department: '',
  phone: '',
  email: '',
  status: 'online',
};

const defaultNotifications: NotificationSettings = {
  sound: true,
  push: true,
  email: 'important',
  mentions: true,
  systemSignals: true,
  doNotDisturb: false,
  doNotDisturbSchedule: {
    enabled: false,
    from: '22:00',
    to: '08:00',
  },
};

const defaultAppearance: AppearanceSettings = {
  theme: 'dark',
  density: 'default',
  textSize: 'medium',
  animations: true,
  showAvatars: true,
};

const defaultChats: ChatSettings = {
  sidebarMode: 'expanded',
  chatListMode: 'full',
  enterToSend: true,
  preservePanelSizes: true,
  showAttachmentPreview: true,
  autoMarkAsRead: false,
  showTimestamps: 'always',
  groupMessages: true,
};

const defaultSecurity: SecuritySettings = {
  twoFactor: false,
  activeSessions: 2,
  autoLock: false,
  autoLockTimeout: 5,
};

const defaultApp: AppSettings = {
  version: '2.4.1',
  platform: 'Web',
};

// ===== HELPERS =====
function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// ===== HOOK =====
export function useSettings() {
  // Profile
  const [profile, setProfile] = React.useState<ProfileSettings>(() =>
    getFromStorage(STORAGE_KEYS.PROFILE, defaultProfile)
  );

  // Notifications
  const [notifications, setNotifications] = React.useState<NotificationSettings>(() =>
    getFromStorage(STORAGE_KEYS.NOTIFICATIONS, defaultNotifications)
  );

  // Appearance
  const [appearance, setAppearance] = React.useState<AppearanceSettings>(() =>
    getFromStorage(STORAGE_KEYS.APPEARANCE, defaultAppearance)
  );

  // Chats
  const [chats, setChats] = React.useState<ChatSettings>(() =>
    getFromStorage(STORAGE_KEYS.CHATS, defaultChats)
  );

  // Security
  const [security, setSecurity] = React.useState<SecuritySettings>(() =>
    getFromStorage(STORAGE_KEYS.SECURITY, defaultSecurity)
  );

  // App info (read-only)
  const app: AppSettings = defaultApp;

  // ===== SUPABASE SYNC =====
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const [settingsLoaded, setSettingsLoaded] = React.useState(false);

  // Load settings from Supabase user_settings table
  React.useEffect(() => {
    if (!currentUserId) return;

    async function loadFromSupabase() {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('preferences')
          .eq('user_id', currentUserId)
          .single();

        if (!error && data?.preferences) {
          const prefs = data.preferences as Record<string, any>;
          if (prefs.notifications) setNotifications(prev => ({ ...prev, ...prefs.notifications }));
          if (prefs.appearance) setAppearance(prev => ({ ...prev, ...prefs.appearance }));
          if (prefs.chats) setChats(prev => ({ ...prev, ...prefs.chats }));
          if (prefs.security) setSecurity(prev => ({ ...prev, ...prefs.security }));
        }
      } catch (err) {
        console.error('[Settings] Failed to load from Supabase:', err);
      } finally {
        setSettingsLoaded(true);
      }
    }

    loadFromSupabase();
  }, [currentUserId]);

  // Save settings to Supabase when they change (after initial load)
  React.useEffect(() => {
    if (!currentUserId || !settingsLoaded) return;

    const preferences = {
      notifications,
      appearance,
      chats,
      security,
    };

    supabase
      .from('user_settings')
      .upsert(
        { user_id: currentUserId, preferences },
        { onConflict: 'user_id' }
      )
      .then(({ error }) => {
        if (error) console.error('[Settings] Failed to save to Supabase:', error);
      });
  }, [currentUserId, settingsLoaded, notifications, appearance, chats, security]);

  // ===== PERSISTENCE =====
  React.useEffect(() => {
    setToStorage(STORAGE_KEYS.PROFILE, profile);
  }, [profile]);

  React.useEffect(() => {
    setToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }, [notifications]);

  React.useEffect(() => {
    setToStorage(STORAGE_KEYS.APPEARANCE, appearance);
  }, [appearance]);

  React.useEffect(() => {
    setToStorage(STORAGE_KEYS.CHATS, chats);
  }, [chats]);

  React.useEffect(() => {
    setToStorage(STORAGE_KEYS.SECURITY, security);
  }, [security]);

  // ===== ACTIONS =====
  const updateProfile = React.useCallback((updates: Partial<ProfileSettings>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateNotifications = React.useCallback((updates: Partial<NotificationSettings>) => {
    setNotifications((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateAppearance = React.useCallback((updates: Partial<AppearanceSettings>) => {
    setAppearance((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateChats = React.useCallback((updates: Partial<ChatSettings>) => {
    setChats((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateSecurity = React.useCallback((updates: Partial<SecuritySettings>) => {
    setSecurity((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetAllSettings = React.useCallback(() => {
    setProfile(defaultProfile);
    setNotifications(defaultNotifications);
    setAppearance(defaultAppearance);
    setChats(defaultChats);
    setSecurity(defaultSecurity);

    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    // Reset in Supabase
    if (currentUserId) {
      const defaultPrefs = {
        notifications: defaultNotifications,
        appearance: defaultAppearance,
        chats: defaultChats,
        security: defaultSecurity,
      };
      supabase
        .from('user_settings')
        .upsert(
          { user_id: currentUserId, preferences: defaultPrefs },
          { onConflict: 'user_id' }
        )
        .then(({ error }) => {
          if (error) console.error('[Settings] Failed to reset in Supabase:', error);
        });
    }
  }, [currentUserId]);

  const clearLocalData = React.useCallback(() => {
    // Clear all messenger-related localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('messenger_')) {
        localStorage.removeItem(key);
      }
    });

    // Clear in Supabase
    if (currentUserId) {
      supabase
        .from('user_settings')
        .delete()
        .eq('user_id', currentUserId)
        .then(({ error }) => {
          if (error) console.error('[Settings] Failed to clear in Supabase:', error);
        });
    }
  }, [currentUserId]);

  return {
    // Settings
    profile,
    notifications,
    appearance,
    chats,
    security,
    app,

    // Actions
    updateProfile,
    updateNotifications,
    updateAppearance,
    updateChats,
    updateSecurity,
    resetAllSettings,
    clearLocalData,
  };
}
