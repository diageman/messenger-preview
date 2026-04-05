/**
 * Auth store — единый источник currentUserId
 * Инициализируется ОДИН раз через supabase.auth.getUser() (сетевой запрос)
 * onAuthStateChange — только синхронное обновление (без async!)
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

type AuthStore = {
  currentUserId: string | null;
  authReady: boolean;
  setCurrentUserId: (id: string | null) => void;
  initAuth: () => Promise<void>;
};

let authSubscribed = false;

export const useAuthStore = create<AuthStore>((set) => ({
  currentUserId: null,
  authReady: false,

  setCurrentUserId: (id) => set({ currentUserId: id }),

  initAuth: async () => {
    try {
      // Быстро восстанавливаем локальную сессию без критической блокировки UI
      const { data, error } = await supabase.auth.getSession();

      set({
        currentUserId: error ? null : data.session?.user?.id ?? null,
        authReady: true,
      });
    } catch (err: any) {
      console.error('[authStore] initAuth failed:', err?.message || err);
      set({
        currentUserId: null,
        authReady: true,
      });
    }

    // Подписываемся ТОЛЬКО один раз — без async вызовов!
    if (authSubscribed) return;
    authSubscribed = true;

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        currentUserId: session?.user?.id ?? null,
        authReady: true,
      });
    });
  },
}));
