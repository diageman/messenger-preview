/**
 * useSettingsStore — персистентные настройки интерфейса
 * Сохраняется в localStorage через zustand persist middleware
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';
export type TextSize = 'small' | 'medium' | 'large';

interface SettingsState {
  theme: ThemeMode;
  textSize: TextSize;
  showAvatars: boolean;
  sendOnEnter: boolean;

  setTheme: (theme: ThemeMode) => void;
  setTextSize: (textSize: TextSize) => void;
  setShowAvatars: (show: boolean) => void;
  setSendOnEnter: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      textSize: 'medium',
      showAvatars: true,
      sendOnEnter: true,

      setTheme: (theme) => set({ theme }),
      setTextSize: (textSize) => set({ textSize }),
      setShowAvatars: (showAvatars) => set({ showAvatars }),
      setSendOnEnter: (sendOnEnter) => set({ sendOnEnter }),
    }),
    {
      name: 'messenger-settings',
    }
  )
);
