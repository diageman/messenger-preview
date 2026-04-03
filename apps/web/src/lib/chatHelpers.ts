/**
 * Хелперы для работы с сообщениями и unread
 */

/**
 * Своё ли это сообщение?
 */
export const isOwnMessage = (
  senderId: string | null | undefined,
  currentUserId: string | null
): boolean => {
  return !!senderId && !!currentUserId && senderId === currentUserId;
};

/**
 * Безопасное значение unread — всегда >= 0
 */
export const safeUnread = (value: number | null | undefined): number => {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
};
