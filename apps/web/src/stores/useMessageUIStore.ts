/**
 * useMessageUIStore — UI-состояния для MessageBubble
 * Реакции, свайп, контекстное меню, reply
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export interface ReactionItem {
  emoji: string;
  count: number;
  myReaction: boolean;
}

interface MessageUIState {
  // Открытый пикер реакций (ID сообщения)
  activeReactionMessageId: string | null;
  // Смещение свайпа по X: messageId -> px
  swipeOffsets: Record<string, number>;
  // Контекстное меню
  contextMenuMessageId: string | null;
  contextMenuPosition: { x: number; y: number } | null;
  // Ответ на сообщение
  replyToMessageId: string | null;
  // Локальные реакции: messageId -> ReactionItem[]
  reactions: Record<string, ReactionItem[]>;

  openReactions: (messageId: string) => void;
  closeReactions: () => void;
  setSwipeOffset: (messageId: string, offset: number) => void;
  resetSwipeOffset: (messageId: string) => void;
  openContextMenu: (messageId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
  setReplyTo: (messageId: string | null) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
}

export const useMessageUIStore = create<MessageUIState>((set) => ({
  activeReactionMessageId: null,
  swipeOffsets: {},
  contextMenuMessageId: null,
  contextMenuPosition: null,
  replyToMessageId: null,
  reactions: {},

  openReactions: (messageId) => set({ activeReactionMessageId: messageId }),
  closeReactions: () => set({ activeReactionMessageId: null }),

  setSwipeOffset: (messageId, offset) =>
    set((state) => ({
      swipeOffsets: { ...state.swipeOffsets, [messageId]: offset },
    })),

  resetSwipeOffset: (messageId) =>
    set((state) => {
      const { [messageId]: _removed, ...rest } = state.swipeOffsets;
      return { swipeOffsets: rest };
    }),

  openContextMenu: (messageId, x, y) =>
    set({ contextMenuMessageId: messageId, contextMenuPosition: { x, y } }),

  closeContextMenu: () =>
    set({ contextMenuMessageId: null, contextMenuPosition: null }),

  setReplyTo: (messageId) => set({ replyToMessageId: messageId }),

  toggleReaction: (messageId: string, emoji: string) => {
    const currentUserId = useAuthStore.getState().currentUserId;
    if (!currentUserId) return;

    const currentState = useMessageUIStore.getState();
    const current: ReactionItem[] = currentState.reactions[messageId] ?? [];
    const existing = current.find((r) => r.emoji === emoji);
    const isRemoving = existing?.myReaction ?? false;

    // Оптимистичное локальное обновление
    set((s) => {
      let next: ReactionItem[];
      if (!existing) {
        next = [...current, { emoji, count: 1, myReaction: true }];
      } else if (isRemoving) {
        next = existing.count <= 1
          ? current.filter((r) => r.emoji !== emoji)
          : current.map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, myReaction: false } : r);
      } else {
        next = current.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, myReaction: true } : r);
      }
      return { reactions: { ...s.reactions, [messageId]: next } };
    });

    // Асинхронная запись в БД
    if (isRemoving) {
      supabase.from('message_reactions')
        .delete().eq('message_id', messageId).eq('user_id', currentUserId).eq('emoji', emoji)
        .then(({ error }) => { if (error) console.error('[Reactions] Delete failed:', error); });
    } else {
      supabase.from('message_reactions')
        .upsert({ message_id: messageId, user_id: currentUserId, emoji }, { onConflict: 'message_id,user_id,emoji' })
        .then(({ error }) => { if (error) console.error('[Reactions] Upsert failed:', error); });
    }
  },
}));
