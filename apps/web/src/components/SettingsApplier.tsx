import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

/**
 * Применяет настройки из useSettingsStore к DOM через data-attributes на <html>.
 * CSS-правила в index.css реагируют на эти атрибуты.
 */
export function SettingsApplier() {
  const { theme, textSize, showAvatars, sendOnEnter } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-text-size', textSize);
    root.setAttribute('data-show-avatars', String(showAvatars));
    root.setAttribute('data-send-on-enter', String(sendOnEnter));
  }, [theme, textSize, showAvatars, sendOnEnter]);

  return null;
}
