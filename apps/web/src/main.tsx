import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Глобальная блокировка 'шторма' уведомлений при старте
if (typeof window !== 'undefined') {
  const OriginalNotification = window.Notification;
  // @ts-ignore
  window.Notification = function(title, options) {
    console.log('⚠️ Уведомление заблокировано (защита при старте):', title);
    return {};
  };
  // Возвращаем как было через 15 секунд
  setTimeout(() => {
    window.Notification = OriginalNotification;
    console.log('✅ Уведомления снова включены');
  }, 15000);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Expose Zustand stores for testing (dev only)
if (import.meta.env.DEV) {
  import('./stores/useMessageUIStore').then(({ useMessageUIStore }) => {
    (window as any).__ZUSTAND_STORES__ = { useMessageUIStore };
  });
  import('./stores/useChatStore').then(({ useChatStore }) => {
    (window as any).__ZUSTAND_STORES__ = { ...(window as any).__ZUSTAND_STORES__, useChatStore };
  });
}
