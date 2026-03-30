/**
 * Hook для resizable и collapsible панелей
 * Сохраняет ширину и состояние в localStorage
 */

import * as React from 'react';

interface UseResizableOptions {
  key: string;
  minWidth: number;
  maxWidth: number;
  defaultValue: number;
  collapsedWidth?: number;
}

export function useResizable({
  key,
  minWidth,
  maxWidth,
  defaultValue,
  collapsedWidth,
}: UseResizableOptions) {
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem(`${key}_collapsed`);
    return saved ? saved === 'true' : false;
  });

  const [width, setWidth] = React.useState(() => {
    if (isCollapsed && collapsedWidth) {
      return collapsedWidth;
    }
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = parseInt(saved, 10);
      return Math.min(Math.max(parsed, minWidth), maxWidth);
    }
    return defaultValue;
  });

  const [isResizing, setIsResizing] = React.useState(false);
  const [tempWidth, setTempWidth] = React.useState<number | null>(null);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      setTempWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (tempWidth) {
        setWidth(tempWidth);
        localStorage.setItem(key, tempWidth.toString());
        if (isCollapsed) {
          setIsCollapsed(false);
          localStorage.setItem(`${key}_collapsed`, 'false');
        }
        setTempWidth(null);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, isCollapsed, key, minWidth, maxWidth, tempWidth]);

  React.useEffect(() => {
    if (isCollapsed && collapsedWidth) {
      setWidth(collapsedWidth);
    } else if (!tempWidth) {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = parseInt(saved, 10);
        setWidth(Math.min(Math.max(parsed, minWidth), maxWidth));
      } else {
        setWidth(defaultValue);
      }
    }
  }, [isCollapsed, collapsedWidth, key, minWidth, maxWidth, defaultValue, tempWidth]);

  const startResize = React.useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem(`${key}_collapsed`, 'false');
    }
    setIsResizing(true);
  }, [isCollapsed, key]);

  const toggleCollapse = React.useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(`${key}_collapsed`, newState.toString());
    if (newState && collapsedWidth) {
      setWidth(collapsedWidth);
    } else {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = parseInt(saved, 10);
        setWidth(Math.min(Math.max(parsed, minWidth), maxWidth));
      } else {
        setWidth(defaultValue);
      }
    }
  }, [isCollapsed, key, collapsedWidth, minWidth, maxWidth, defaultValue]);

  return {
    width,
    isResizing,
    isCollapsed,
    startResize,
    toggleCollapse,
    setWidth,
  };
}

/**
 * Hook для collapsible панелей (простой режим)
 */
export function useCollapsible(key: string, defaultOpen = true) {
  const [isOpen, setIsOpen] = React.useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? saved === 'true' : defaultOpen;
  });

  React.useEffect(() => {
    localStorage.setItem(key, isOpen.toString());
  }, [key, isOpen]);

  const toggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    setIsOpen,
    toggle,
  };
}
