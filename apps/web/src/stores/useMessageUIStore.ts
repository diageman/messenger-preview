/**
 * useMessageUIStore — UI-состояния для MessageBubble
 * Реакции, свайп, контекстное меню, reply
 *
 * ИСПРАВЛЕНИЯ v2:
 * - Debounce 300мс: только финальное действие уходит на сервер
 * - SSE dedup: myRecentToggles предотвращает дублирование от SSE
 * - Rollback при ошибке: откат optimistic update
 * - Идемпотентность: toggle-логика (поставил/снял)
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export interface ReactionItem {
  emoji: string;
  count: number;
  myReaction: boolean;
}

interface PendingToggle {
  emoji: string;
  willAdd: boolean;
  timer: ReturnType<typeof setTimeout>;
  // Для rollback при ошибке
  previousState: ReactionItem[];
  // Emoji самой старой реакции, которую нужно удалить при замене (лимит 2)
  replacedEmoji?: string;
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
  // Debounce: messageId -> pending toggle
  pendingToggles: Record<string, PendingToggle | null>;
  // SSE dedup: Set<"messageId:emoji"> для подавления своих же SSE-событий
  myRecentToggles: Set<string>;

  openReactions: (messageId: string) => void;
  closeReactions: () => void;
  setSwipeOffset: (messageId: string, offset: number) => void;
  resetSwipeOffset: (messageId: string) => void;
  openContextMenu: (messageId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
  setReplyTo: (messageId: string | null) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  /** Вызывается из useChatStore при получении SSE-события */
  applySseReaction: (messageId: string, userId: string, emoji: string, event: 'INSERT' | 'DELETE') => void;
  /** Внутренний: отправка на сервер после debounce */
  _flushToggle: (messageId: string, emoji: string, willAdd: boolean, previousState: ReactionItem[], replacedEmoji?: string) => Promise<void>;
}

const DEBOUNCE_MS = 300;
const SSE_DEDUP_TTL_MS = 2000;

export const useMessageUIStore = create<MessageUIState>((set, get) => ({
  activeReactionMessageId: null,
  swipeOffsets: {},
  contextMenuMessageId: null,
  contextMenuPosition: null,
  replyToMessageId: null,
  reactions: {},
  pendingToggles: {},
  myRecentToggles: new Set(),

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

  /**
   * ОСНОВНОЙ МЕТОД: Toggle реакции с debounce
   *
   * Логика:
   * 1. Определяем willAdd и replacedEmoji из ТЕКУЩЕГО состояния
   * 2. Отменяем предыдущий debounce-таймер для этого messageId
   * 3. Мгновенно применяем optimistic update
   * 4. Через DEBOUNCE_MS отправляем на сервер (включая DELETE для replacedEmoji)
   */
  toggleReaction: (messageId: string, emoji: string) => {
    const currentUserId = useAuthStore.getState().currentUserId;
    if (!currentUserId) return;

    const state = get();
    const current = state.reactions[messageId] ?? [];
    const existing = current.find((r) => r.emoji === emoji);

    // Если есть pending toggle для этого messageId — отменяем его
    const existingPending = state.pendingToggles[messageId];
    if (existingPending) {
      clearTimeout(existingPending.timer);
    }

    // Определяем действие
    const willAdd = !(existing?.myReaction ?? false);

    // Если добавляем новую реакцию и лимит уже исчерпан — находим oldest для замены
    let replacedEmoji: string | undefined;
    if (willAdd && !existing) {
      const myReactions = current.filter((r) => r.myReaction);
      if (myReactions.length >= 2) {
        replacedEmoji = myReactions[0].emoji;
      }
    }

    // Сохраняем предыдущее состояние для rollback
    const previousState = [...current];

    // Оптимистичное обновление UI
    set((s) => {
      const next = computeNextReaction(current, emoji, willAdd);
      return { reactions: { ...s.reactions, [messageId]: next } };
    });

    // Ставим debounce-таймер
    const timer = setTimeout(() => {
      // Очищаем pending
      set((s) => {
        const newPending = { ...s.pendingToggles };
        delete newPending[messageId];
        return { pendingToggles: newPending };
      });

      // Отправляем на сервер
      get()._flushToggle(messageId, emoji, willAdd, previousState, replacedEmoji);
    }, DEBOUNCE_MS);

    // Регистрируем pending
    set((s) => ({
      pendingToggles: {
        ...s.pendingToggles,
        [messageId]: { emoji, willAdd, timer, previousState, replacedEmoji },
      },
    }));
  },

  /**
   * Отправка реакции на сервер (после debounce)
   * При замене (replacedEmoji) — сначала DELETE oldest, затем UPSERT new.
   * При ошибке — rollback к предыдущему состоянию
   */
  _flushToggle: async (messageId: string, emoji: string, willAdd: boolean, previousState: ReactionItem[], replacedEmoji?: string) => {
    const currentUserId = useAuthStore.getState().currentUserId;
    if (!currentUserId) return;

    const toggleKey = `${messageId}:${emoji}`;

    // Добавляем в myRecentToggles для SSE dedup (новый emoji)
    get().myRecentToggles.add(toggleKey);
    setTimeout(() => {
      get().myRecentToggles.delete(toggleKey);
    }, SSE_DEDUP_TTL_MS);

    // Если есть replacedEmoji — тоже добавляем в dedup и отправляем DELETE
    if (replacedEmoji) {
      const replaceKey = `${messageId}:${replacedEmoji}`;
      get().myRecentToggles.add(replaceKey);
      setTimeout(() => {
        get().myRecentToggles.delete(replaceKey);
      }, SSE_DEDUP_TTL_MS);
    }

    try {
      if (willAdd) {
        let oldestDeleted = false;

        // Если заменяем реакцию — сначала удаляем oldest
        if (replacedEmoji) {
          const { error: deleteErr } = await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', currentUserId)
            .eq('emoji', replacedEmoji);
          if (deleteErr) throw deleteErr;
          oldestDeleted = true;
        }

        // Затем ставим новую
        const { error: upsertErr } = await supabase
          .from('message_reactions')
          .upsert(
            { message_id: messageId, user_id: currentUserId, emoji },
            { onConflict: 'message_id,user_id,emoji' }
          );
        if (upsertErr) {
          // Если DELETE прошёл но upsert упал — откатываем DELETE
          if (oldestDeleted && replacedEmoji) {
            await supabase
              .from('message_reactions')
              .upsert(
                { message_id: messageId, user_id: currentUserId, emoji: replacedEmoji },
                { onConflict: 'message_id,user_id,emoji' }
              );
          }
          throw upsertErr;
        }
      } else {
        // Снимаем реакцию
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', currentUserId)
          .eq('emoji', emoji);
        if (error) throw error;
      }
    } catch (error) {
      // Rollback к предыдущему состоянию
      set((s) => ({
        reactions: { ...s.reactions, [messageId]: previousState },
      }));
    }
  },

  /**
   * Обработка SSE-события реакции из useChatStore
   * 
   * Ключевая логика SSE dedup:
   * - Если это наше событие (userId === currentUserId И есть в myRecentToggles) → IGNORE
   * - Если чужое → применяем к reactions
   */
  applySseReaction: (messageId: string, userId: string, emoji: string, event: 'INSERT' | 'DELETE') => {
    const currentUserId = useAuthStore.getState().currentUserId;
    if (!currentUserId) return;
    if (!messageId || !emoji || !userId) return; // Guard: Supabase иногда шлёт события без полей

    const toggleKey = `${messageId}:${emoji}`;
    const myRecentToggles = get().myRecentToggles;
    const isMyEvent = userId === currentUserId && myRecentToggles.has(toggleKey);

    // Если это наше optimistc-событие — игнорируем SSE (мы уже применили локально)
    if (isMyEvent) return;

    // Если действие текущего пользователя, но НЕ в dedup — TTL истёк, тоже игнорируем
    if (userId === currentUserId) return;

    // Чужое событие — применяем
    set((s) => {
      const current = s.reactions[messageId] ?? [];
      let next: ReactionItem[];

      if (event === 'INSERT') {
        const existing = current.find((r) => r.emoji === emoji);
        if (existing) {
          next = current.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1 } : r
          );
        } else {
          next = [...current, { emoji, count: 1, myReaction: false }];
        }
      } else {
        // DELETE
        const existing = current.find((r) => r.emoji === emoji);
        if (!existing) return s; // ничего не делаем
        if (existing.count <= 1) {
          next = current.filter((r) => r.emoji !== emoji);
        } else {
          next = current.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count - 1 } : r
          );
        }
      }

      return { reactions: { ...s.reactions, [messageId]: next } };
    });
  },
}));

/**
 * Pure helper: вычисляет следующее состояние реакций
 * Ограничение: максимум 2 реакции от одного пользователя на сообщение.
 * Если уже 2 myReaction и пользователь ставит новую — oldest заменяется.
 */
function computeNextReaction(
  current: ReactionItem[],
  emoji: string,
  willAdd: boolean,
): ReactionItem[] {
  const existing = current.find((r) => r.emoji === emoji);
  const myReactions = current.filter((r) => r.myReaction);
  const MAX_REACTIONS = 2;

  if (willAdd) {
    if (existing) {
      // Переключаем на другую реакцию: убираем старую myReaction, ставим новую
      return current.map((r) => {
        if (r.myReaction) {
          return r.count <= 1
            ? null
            : { ...r, count: r.count - 1, myReaction: false };
        }
        if (r.emoji === emoji) {
          return { ...r, count: r.count + 1, myReaction: true };
        }
        return r;
      }).filter(Boolean) as ReactionItem[];
    }

    // Новая реакция (не existing)
    if (myReactions.length >= MAX_REACTIONS) {
      // Лимит достигнут — заменяем oldest (первую) myReaction
      const oldestEmoji = myReactions[0].emoji;
      return current.map((r) => {
        if (r.emoji === oldestEmoji) {
          // Снимаем oldest
          return r.count <= 1 ? null : { ...r, count: r.count - 1, myReaction: false };
        }
        if (r.emoji === emoji) {
          // Ставим новую
          return { ...r, count: r.count + 1, myReaction: true };
        }
        return r;
      }).filter(Boolean) as ReactionItem[];
    }

    // Лимит не достигнут — просто добавляем
    return [...current, { emoji, count: 1, myReaction: true }];
  } else {
    // Снимаем реакцию
    if (!existing) return current;
    return existing.count <= 1
      ? current.filter((r) => r.emoji !== emoji)
      : current.map((r) =>
          r.emoji === emoji ? { ...r, count: r.count - 1, myReaction: false } : r
        );
  }
}
