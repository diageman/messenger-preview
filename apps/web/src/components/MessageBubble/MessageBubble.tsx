import React, { useRef, useCallback, useEffect } from 'react';
import { useMessageUIStore } from '@/stores/useMessageUIStore';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  id: string;
  content: string;
  isOwn: boolean;
  senderName?: string;
  avatarUrl?: string | null;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: { id: string; senderName: string; content: string } | null;
  reactions?: Array<{ emoji: string; count: number; myReaction: boolean }>;
  isDeleted?: boolean;
  isEdited?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const SWIPE_REPLY_TRIGGER = 52;
const SWIPE_MAX = 80;

function useSwipeToReply(
  messageId: string,
  isOwn: boolean,
  onReply?: (id: string) => void
) {
  const setSwipeOffset = useMessageUIStore((s) => s.setSwipeOffset);
  const resetSwipeOffset = useMessageUIStore((s) => s.resetSwipeOffset);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const triggered = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    triggered.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dy) > Math.abs(dx)) return;
    // own — свайп влево (отрицательный), чужой — вправо (положительный)
    const dir = isOwn ? -1 : 1;
    const raw = dx * dir;
    if (raw < 0) return;
    const clamped = Math.min(raw, SWIPE_MAX);
    setSwipeOffset(messageId, clamped * dir);
    if (raw >= SWIPE_REPLY_TRIGGER && !triggered.current) {
      triggered.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [messageId, isOwn, setSwipeOffset]);

  const onTouchEnd = useCallback(() => {
    const { swipeOffsets } = useMessageUIStore.getState();
    const offset = swipeOffsets[messageId] ?? 0;
    const raw = Math.abs(offset);
    if (raw >= SWIPE_REPLY_TRIGGER && onReply) onReply(messageId);
    resetSwipeOffset(messageId);
  }, [messageId, onReply, resetSwipeOffset]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  id, content, isOwn, senderName, avatarUrl, timestamp,
  status = 'sent', replyTo, reactions, isDeleted, isEdited,
  onReact, onReply, onDelete, onCopy,
}) => {
  const activeReactionMessageId = useMessageUIStore((s) => s.activeReactionMessageId);
  const swipeOffsets = useMessageUIStore((s) => s.swipeOffsets);
  const contextMenuMessageId = useMessageUIStore((s) => s.contextMenuMessageId);
  const openReactions = useMessageUIStore((s) => s.openReactions);
  const closeReactions = useMessageUIStore((s) => s.closeReactions);
  const openContextMenu = useMessageUIStore((s) => s.openContextMenu);
  const closeContextMenu = useMessageUIStore((s) => s.closeContextMenu);
  const setReplyTo = useMessageUIStore((s) => s.setReplyTo);

  const isReactionOpen = activeReactionMessageId === id;
  const isContextOpen = contextMenuMessageId === id;
  const swipeOffset = swipeOffsets[id] ?? 0;

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeToReply(id, isOwn, (msgId) => {
    setReplyTo(msgId);
    onReply?.(msgId);
  });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(id, e.clientX, e.clientY);
  }, [id, openContextMenu]);

  const handleLongPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    handleLongPress.current = setTimeout(() => openContextMenu(id, e.clientX, e.clientY), 500);
  }, [id, openContextMenu]);
  const onPointerUp = useCallback(() => {
    if (handleLongPress.current) clearTimeout(handleLongPress.current);
  }, []);

  // Закрываем меню при клике вне
  useEffect(() => {
    if (!isContextOpen && !isReactionOpen) return;
    const handler = () => { closeContextMenu(); closeReactions(); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [isContextOpen, isReactionOpen, closeContextMenu, closeReactions]);

  const statusIcon = {
    sending: '🕐', sent: '✓', delivered: '✓✓', read: '✓✓',
  }[status];

  return (
    <div
      className={`${styles.wrapper} ${isOwn ? styles.own : styles.other} ${(isReactionOpen || isContextOpen) ? styles.wrapperActive : ''}`}
      style={{ '--swipe-offset': `${swipeOffset}px` } as React.CSSProperties}
    >
      {/* Иконка reply-свайпа */}
      <div className={`${styles.replyIcon} ${Math.abs(swipeOffset) > 20 ? styles.replyIconVisible : ''}`}>
        ↩
      </div>

      {/* Аватар (только для чужих) */}
      {!isOwn && (
        <div className={styles.avatar}>
          {avatarUrl
            ? <img src={avatarUrl} alt={senderName} />
            : <span>{senderName?.[0] ?? '?'}</span>}
        </div>
      )}

      {/* Баббл + реакции в единой колонке */}
      <div className={styles.bubbleGroup}>
        {/* Сам бабл */}
        <div
          className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther} ${isDeleted ? styles.deleted : ''}`}
          onContextMenu={handleContextMenu}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Имя отправителя в групповом чате */}
          {!isOwn && senderName && <div className={styles.senderName}>{senderName}</div>}

          {/* Reply-превью */}
          {replyTo && (
            <div className={styles.replyPreview}>
              <div className={styles.replyBar} />
              <div>
                <div className={styles.replySender}>{replyTo.senderName}</div>
                <div className={styles.replyContent}>{replyTo.content}</div>
              </div>
            </div>
          )}

          {/* Контент */}
          {isDeleted
            ? <span className={styles.deletedText}>🚫 Сообщение удалено</span>
            : <span className={styles.text}>{content}</span>}

          {/* Время + статус */}
          <div className={styles.meta}>
            {isEdited && <span className={styles.edited}>ред.</span>}
            <span className={styles.time}>{timestamp}</span>
            {isOwn && (
              <span className={`${styles.status} ${status === 'read' ? styles.statusRead : ''}`}>
                {statusIcon}
              </span>
            )}
          </div>
        </div>

        {/* Реакции под баблом (внутри bubbleGroup) */}
        {reactions && reactions.length > 0 && (
          <div className={`${styles.reactions} ${isOwn ? styles.reactionsOwn : ''}`}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                className={`${styles.reactionPill} ${r.myReaction ? styles.reactionPillActive : ''}`}
                onClick={() => onReact?.(id, r.emoji)}
              >
                {r.emoji} <span>{r.count}</span>
              </button>
            ))}
            <button className={styles.addReactionBtn} onClick={() => openReactions(id)}>+</button>
          </div>
        )}
      </div>

      {/* Пикер реакций */}
      {isReactionOpen && (
        <div
          className={`${styles.reactionPicker} ${isOwn ? styles.reactionPickerOwn : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={styles.reactionPickerEmoji}
              onClick={() => { onReact?.(id, emoji); closeReactions(); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Контекстное меню */}
      {isContextOpen && (
        <div
          className={`${styles.contextMenu} ${isOwn ? styles.contextMenuOwn : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button onClick={() => { onCopy?.(content); closeContextMenu(); }}>📋 Копировать</button>
          <button onClick={() => { setReplyTo(id); onReply?.(id); closeContextMenu(); }}>↩ Ответить</button>
          <button onClick={() => { openReactions(id); closeContextMenu(); }}>😊 Реакция</button>
          {isOwn && (
            <button className={styles.contextMenuDelete}
              onClick={() => { onDelete?.(id); closeContextMenu(); }}>🗑 Удалить</button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
