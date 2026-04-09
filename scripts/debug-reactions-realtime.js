/**
 * Realtime Reaction Debug Tool
 * 
 * ИНСТРУКЦИЯ:
 * 1. Откройте мессенджер в ДВУХ вкладках браузера (разные аккаунты)
 * 2. В КАЖДОЙ вкладке откройте DevTools Console (F12)
 * 3. Вставьте ЭТОТ СКРИПТ в консоль КАЖДОЙ вкладки
 * 4. В одной вкладке поставьте реакцию — в другой должны появиться логи
 * 
 * Скрипт покажет:
 * - ✅ Статус Realtime подписки
 * - ✅ Все входящие SSE события
 * - ✅ Состояние реакций в store
 * - ✅ Прямой тест: создаст тестовую реакцию через Supabase API
 */

(function() {
  const CID = Math.random().toString(36).slice(2, 8);
  console.log(`%c[DEBUG-${CID}] 🔍 Realtime Reaction Debugger`, 'color: #00ff88; font-weight: bold; font-size: 14px');

  // Получаем stores
  const stores = window.__ZUSTAND_STORES__;
  if (!stores) {
    console.error(`%c[DEBUG-${CID}] ❌ window.__ZUSTAND_STORES__ not found!`, 'color: red');
    console.log('   Make sure the app is running and main.tsx exposes stores.');
    return;
  }

  const uiStore = stores.useMessageUIStore;
  const chatStore = stores.useChatStore;
  const authStore = stores.useAuthStore;

  const currentUserId = authStore.getState().currentUserId;
  console.log(`%c[DEBUG-${CID}] 📊 State:`, 'color: cyan');
  console.log(`   Current User ID: ${currentUserId}`);
  console.log(`   Realtime Initialized: ${chatStore.getState().isRealtimeInitialized}`);
  console.log(`   Messages count: ${Object.keys(chatStore.getState().messages).length}`);
  console.log(`   Reactions in store: ${Object.keys(uiStore.getState().reactions).length}`);

  // Патчим applySseReaction для детального логования
  const originalApply = uiStore.getState().applySseReaction;
  uiStore.setState({
    applySseReaction: function(...args) {
      const [messageId, userId, emoji, event] = args;
      console.log(`%c[DEBUG-${CID}] 📥 applySseReaction CALLED:`, 'color: #ffdd00; background: #333; padding: 4px', {
        event, messageId, userId, emoji,
        isOwn: userId === currentUserId,
        reactionsBefore: uiStore.getState().reactions[messageId] || 'not loaded'
      });
      const result = originalApply(...args);
      console.log(`%c[DEBUG-${CID}] 📤 applySseReaction DONE. Reactions after:`, 'color: #ffdd00; background: #333; padding: 4px',
        uiStore.getState().reactions[messageId] || 'empty'
      );
      return result;
    }
  });
  console.log(`%c[DEBUG-${CID}] ✅ Patched applySseReaction`, 'color: lime');

  // Перехватываем console.log для поиска SSE логов из приложения
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const sseLogs = [];
  function intercept(method, original, color) {
    return function(...args) {
      const msg = args.join(' ');
      if (msg.includes('[SSE]') || msg.includes('[Reaction]')) {
        sseLogs.push({ method, msg, time: Date.now() });
        original(`%c[DEBUG-${CID}] INTERCEPTED:`, `color: ${color}; font-weight: bold`, ...args);
      } else {
        original.apply(console, args);
      }
    };
  }

  console.log = intercept('log', originalLog, 'cyan');
  console.warn = intercept('warn', originalWarn, 'orange');
  console.error = intercept('error', originalError, 'red');

  console.log(`%c[DEBUG-${CID}] ✅ Intercepted console methods for [SSE] and [Reaction] logs`, 'color: lime');

  // Прямая подписка для теста
  let supabaseClient = null;

  // Пробуем найти Supabase client
  if (window.supabase) {
    supabaseClient = window.supabase;
  } else {
    // Пробуем получить через импорты — может быть в модулях
    console.warn(`%c[DEBUG-${CID}] ⚠️ window.supabase not found. Trying to get from app modules...`, 'color: orange');
  }

  if (supabaseClient) {
    const debugChannel = supabaseClient
      .channel(`debug:reactions-${CID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        (payload) => {
          console.log(`%c[DEBUG-${CID}] 🔔 DIRECT SSE EVENT:`, 'color: #00ff88; font-size: 12px; background: #222; padding: 4px', {
            event: payload.eventType,
            new: payload.new,
            old: payload.old,
            timestamp: new Date().toISOString()
          });
        }
      )
      .subscribe((status) => {
        console.log(`%c[DEBUG-${CID}] 📡 Debug channel status: ${status}`, 'color: magenta; font-weight: bold');
        if (status === 'SUBSCRIBED') {
          console.log(`%c[DEBUG-${CID}] ✅ Realtime is WORKING — events should arrive!`, 'color: lime; font-size: 14px; font-weight: bold');
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`%c[DEBUG-${CID}] ❌ Realtime CHANNEL ERROR — check Supabase setup!`, 'color: red; font-size: 14px; font-weight: bold');
        }
      });

    window.__debugChannel = debugChannel;
    console.log(`%c[DEBUG-${CID}] ✅ Direct Realtime subscription created`, 'color: lime');
  }

  // Функция для прямого теста
  window.testReactionRealtime = async function() {
    console.log(`%c[DEBUG-${CID}] 🧪 Starting direct reaction test...`, 'color: yellow; font-weight: bold');

    // Находим первое сообщение
    const messages = chatStore.getState().messages;
    const msgIds = Object.keys(messages);
    if (msgIds.length === 0) {
      console.error(`%c[DEBUG-${CID}] ❌ No messages found!`, 'color: red');
      return;
    }

    const messageId = msgIds[0];
    console.log(`%c[DEBUG-${CID}] Using message: ${messageId}`, 'color: cyan');

    // Проверяем текущие реакции
    const before = uiStore.getState().reactions[messageId] || [];
    console.log(`%c[DEBUG-${CID}] Reactions before:`, 'color: cyan', before);

    // Ставим реакцию через toggleReaction
    const testEmoji = '🧪';
    console.log(`%c[DEBUG-${CID}] Calling toggleReaction('${messageId}', '${testEmoji}')...`, 'color: yellow');
    uiStore.getState().toggleReaction(messageId, testEmoji);

    // Ждём debounce
    await new Promise(r => setTimeout(r, 1000));

    const after = uiStore.getState().reactions[messageId] || [];
    console.log(`%c[DEBUG-${CID}] Reactions after:`, 'color: cyan', after);

    // Проверяем SSE логи
    if (sseLogs.length > 0) {
      console.log(`%c[DEBUG-${CID}] 📋 SSE logs captured:`, 'color: lime');
      sseLogs.forEach(log => console.log(`  [${log.method}] ${log.msg}`));
    } else {
      console.warn(`%c[DEBUG-${CID}] ⚠️ NO SSE logs captured! Realtime may not be working.`, 'color: orange');
    }
  };

  console.log(`%c[DEBUG-${CID}] 🎯 To test: run testReactionRealtime() in console`, 'color: #00ff88; font-size: 12px');
  console.log(`%c[DEBUG-${CID}] 📝 Then check ANOTHER tab for SSE events`, 'color: #00ff88; font-size: 12px');
})();
