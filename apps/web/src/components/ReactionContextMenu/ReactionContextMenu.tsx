import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMessageUIStore } from '@/stores/useMessageUIStore';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import styles from './ReactionContextMenu.module.css';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '😡', '👏', '🎉', '💯', '🤔', '💔', '😍', '🤮', '💩', '👎'];

const COLLAPSED_HEIGHT = 172; // quick reactions + actions
const EXPANDED_HEIGHT = 460;  // quick reactions + emoji picker

export const ReactionContextMenu: React.FC<{
  onReply?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onDelete?: (messageId: string) => void;
}> = ({ onReply, onCopy, onDelete }) => {
  const contextMenuData = useMessageUIStore((s) => s.contextMenuData);
  const closeContextMenu = useMessageUIStore((s) => s.closeContextMenu);
  const toggleReaction = useMessageUIStore((s) => s.toggleReaction);
  const openReactions = useMessageUIStore((s) => s.openReactions);

  const menuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isEmojiExpanded, setIsEmojiExpanded] = useState(false);

  // Сброс состояния при закрытии меню
  useEffect(() => {
    if (!contextMenuData) {
      setIsEmojiExpanded(false);
    }
  }, [contextMenuData]);

  // Закрытие по outside click
  useEffect(() => {
    if (!contextMenuData) return;

    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenuData, closeContextMenu]);

  // Закрытие по Escape
  useEffect(() => {
    if (!contextMenuData) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEmojiExpanded) {
          setIsEmojiExpanded(false);
        } else {
          closeContextMenu();
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [contextMenuData, isEmojiExpanded, closeContextMenu]);

  // Закрытие при скролле (только свёрнутая версия — развёрнутая имеет свой скролл)
  useEffect(() => {
    if (!contextMenuData || isEmojiExpanded) return;

    const handler = () => closeContextMenu();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [contextMenuData, isEmojiExpanded, closeContextMenu]);

  // Позиционирование с учётом состояния развёрнутости
  const getPosition = useCallback(() => {
    if (!contextMenuData) return { top: 0, left: 0 };

    let { x, y } = contextMenuData;
    const menuWidth = 350;
    const menuHeight = isEmojiExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;

    // Сдвиг влево если выходит за правый край
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8;
    }

    // Если развёрнуто — проверяем нижний край, иначе — обычный
    if (y + menuHeight > window.innerHeight) {
      // Открываем меню НАД точкой клика
      y = y - menuHeight;
      // Если всё ещё выходит за верхний край — ставим к верху с отступом
      if (y < 8) {
        y = 8;
      }
    }

    // Не допускаем отрицательных координат
    x = Math.max(8, x);
    y = Math.max(8, y);

    return { top: y, left: x };
  }, [contextMenuData, isEmojiExpanded]);

  const handleQuickReaction = useCallback(
    (emoji: string) => {
      if (contextMenuData?.messageId) {
        toggleReaction(contextMenuData.messageId, emoji);
      }
      closeContextMenu();
    },
    [contextMenuData, toggleReaction, closeContextMenu]
  );

  const handleFullPickerReaction = useCallback(
    (emojiData: EmojiClickData) => {
      if (contextMenuData?.messageId) {
        toggleReaction(contextMenuData.messageId, emojiData.emoji);
      }
      closeContextMenu();
    },
    [contextMenuData, toggleReaction, closeContextMenu]
  );

  const handleReply = useCallback(() => {
    if (contextMenuData?.messageId) {
      onReply?.(contextMenuData.messageId);
    }
    closeContextMenu();
  }, [contextMenuData, onReply, closeContextMenu]);

  const handleCopy = useCallback(() => {
    if (contextMenuData?.content) {
      onCopy?.(contextMenuData.content);
    }
    closeContextMenu();
  }, [contextMenuData, onCopy, closeContextMenu]);

  const handleDelete = useCallback(() => {
    if (contextMenuData?.messageId) {
      onDelete?.(contextMenuData.messageId);
    }
    closeContextMenu();
  }, [contextMenuData, onDelete, closeContextMenu]);

  const toggleExpanded = useCallback(() => {
    setIsEmojiExpanded((prev) => !prev);
  }, []);

  // Горизонтальный скролл колесиком мыши по ряду реакций
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      e.preventDefault();
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  if (!contextMenuData) return null;

  const pos = getPosition();

  return (
    <div
      ref={menuRef}
      className={styles.overlay}
      style={{ top: pos.top, left: pos.left }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Быстрые реакции — всегда видны, со скроллом колесиком */}
      <div className={styles.quickReactions}>
        <div
          ref={scrollContainerRef}
          className={styles.quickReactionsScroll}
          onWheel={handleWheel}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={styles.emojiBtn}
              onClick={() => handleQuickReaction(emoji)}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button
          className={`${styles.moreBtn} ${isEmojiExpanded ? styles.moreBtnExpanded : ''}`}
          onClick={toggleExpanded}
          title={isEmojiExpanded ? 'Свернуть' : 'Развернуть'}
          aria-expanded={isEmojiExpanded}
        >
          <svg
            className={styles.chevronIcon}
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
          >
            <path
              d="M4.5 6.75L9 11.25L13.5 6.75"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Аккордеон-секция с EmojiPicker */}
      <div className={`${styles.accordionWrapper} ${isEmojiExpanded ? styles.accordionExpanded : ''}`}>
        <div className={styles.accordionInner}>
          <div className={styles.fullPickerContainer}>
            <EmojiPicker
              onEmojiClick={handleFullPickerReaction}
              width={330}
              height={360}
              theme={Theme.DARK}
              lazyLoadEmojis
              searchDisabled={false}
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
            />
          </div>
        </div>
      </div>

      {/* Разделитель и действия — с CSS transition для плавного скрытия */}
      <div className={`${styles.divider} ${isEmojiExpanded ? styles.hidden : ''}`} />
      <div className={`${styles.actions} ${isEmojiExpanded ? styles.hidden : ''}`}>
        <button className={styles.actionBtn} onClick={handleReply}>
          <span className={styles.actionIcon}>↩</span>
          <span className={styles.actionLabel}>Ответить</span>
        </button>
        <button className={styles.actionBtn} onClick={handleCopy}>
          <span className={styles.actionIcon}>📋</span>
          <span className={styles.actionLabel}>Копировать</span>
        </button>
        <button className={styles.actionBtn} onClick={() => openReactions(contextMenuData.messageId)}>
          <span className={styles.actionIcon}>😊</span>
          <span className={styles.actionLabel}>Реакция</span>
        </button>
        {contextMenuData.isOwn && onDelete && (
          <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleDelete}>
            <span className={styles.actionIcon}>🗑</span>
            <span className={styles.actionLabel}>Удалить</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ReactionContextMenu;
