import { useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';

/**
 * Applies user settings to the DOM via data-attributes on <html>.
 * CSS rules in index.css react to these attributes.
 * Placed once inside App, works globally.
 */
export function SettingsApplier() {
  const { appearance, chats } = useSettings();

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-theme', appearance.theme);
    root.setAttribute('data-density', appearance.density);
    root.setAttribute('data-text-size', appearance.textSize);
    root.setAttribute('data-animations', String(appearance.animations));
    root.setAttribute('data-show-avatars', String(appearance.showAvatars));
  }, [appearance]);

  // Expose enterToSend for ChatWindow via a simple data-attr
  useEffect(() => {
    document.documentElement.setAttribute('data-enter-to-send', String(chats.enterToSend));
  }, [chats.enterToSend]);

  return null;
}
