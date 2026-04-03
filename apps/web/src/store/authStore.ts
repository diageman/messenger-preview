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
    // supabase.auth.getUser() — сетевой запрос, авторитетный источник identity
    const { data, error } = await supabase.auth.getUser();

    set({
      currentUserId: error ? null : data.user?.id ?? null,
      authReady: true,
    });

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
