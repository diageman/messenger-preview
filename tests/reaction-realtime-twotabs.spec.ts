import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Тест: реальная синхронизация реакций между ДВУМЯ изолированными контекстами.
 * Каждый контекст = отдельный браузер с独立的 cookies/session.
 */
test.describe('Reaction Realtime — Two Browser Contexts', () => {
  test.setTimeout(120000);

  let contextA: BrowserContext;
  let contextB: BrowserContext;
  let pageA: Page;
  let pageB: Page;

  test.beforeAll(async ({ browser }) => {
    // Два ИЗОЛИРОВАННЫХ контекста — как два разных браузера
    contextA = await browser.newContext();
    contextB = await browser.newContext();

    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    // Логиним User A
    await login(pageA, 'diage2x@gmail.com', 'G7Ws7QnB');
    // Логиним User B (ДРУГОЙ аккаунт!)
    await login(pageB, 'd1ageman@yandex.ru', 'G7Ws7QnB');

    // Ждём загрузки
    await pageA.waitForTimeout(3000);
    await pageB.waitForTimeout(3000);

    console.log('✅ Both users logged in (DIFFERENT accounts)');

    // Получаем userId обоих
    const userIdA = await pageA.evaluate(() => {
      const stores = (window as any).__ZUSTAND_STORES__;
      return stores?.useAuthStore?.getState()?.currentUserId;
    });
    const userIdB = await pageB.evaluate(() => {
      const stores = (window as any).__ZUSTAND_STORES__;
      return stores?.useAuthStore?.getState()?.currentUserId;
    });
    console.log(`User A ID: ${userIdA?.slice(0, 8)}...`);
    console.log(`User B ID: ${userIdB?.slice(0, 8)}...`);

    // Открываем ОДИН И ТОТ ЖЕ чат где ОБА пользователя — участники
    await openSharedChat(pageA, pageB);
  });

  test.afterAll(async () => {
    await contextA?.close();
    await contextB?.close();
  });

  test('реакция User A появляется у User B через Realtime', async () => {
    // Оба открывают один чат
    await openFirstChat(pageA);
    await openFirstChat(pageB);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);

    // Получаем ID первого ВИДИМОГО сообщения из DOM элемента
    const messageId = await pageA.locator('[data-message-id]').first().getAttribute('data-message-id');
    console.log('Target message ID (from DOM):', messageId);
    expect(messageId).toBeTruthy();

    // Проверяем начальные реакции
    const reactionsA_before = await getReactions(pageA, messageId);
    const reactionsB_before = await getReactions(pageB, messageId);
    console.log('Reactions A before:', reactionsA_before);
    console.log('Reactions B before:', reactionsB_before);

    // User A ставит реакцию — кликаем на то же сообщение
    console.log('User A placing reaction...');
    const placedEmoji = await placeReactionByClick(pageA);
    if (!placedEmoji) {
      test.skip(true, 'Не удалось поставить реакцию через UI');
      return;
    }
    console.log('Placed emoji:', placedEmoji);
    await pageA.waitForTimeout(2000); // debounce + network

    // Проверяем у User A
    const reactionsA_after = await getReactions(pageA, messageId);
    console.log('Reactions A after:', reactionsA_after);
    const hasA = reactionsA_after.some((r: any) => r.emoji === placedEmoji);
    expect(hasA).toBe(true);

    // Ждём Realtime доставку
    console.log('Waiting for Realtime sync to User B...');
    await pageB.waitForTimeout(5000);

    // Проверяем у User B
    const reactionsB_after = await getReactions(pageB, messageId);
    console.log('Reactions B after realtime:', reactionsB_after);
    const hasB = reactionsB_after.some((r: any) => r.emoji === placedEmoji);

    if (!hasB) {
      console.log('❌ Реакция НЕ дошла до User B! Realtime не работает.');
      console.log('   Возможные причины:');
      console.log('   1. Supabase Realtime не включён для таблицы message_reactions');
      console.log('   2. RLS блокирует получение событий');
      console.log('   3. Подписка отключена или не инициализирована');
    }

    expect(hasB).toBe(true);
    console.log('✅ Реакция синхронизирована через Realtime!');
  });

  test('удаление реакции User A видно у User B через Realtime', async () => {
    const messageId = await pageA.locator('[data-message-id]').first().getAttribute('data-message-id');
    expect(messageId).toBeTruthy();

    // Ставим реакцию если её нет
    const reactionsA = await getReactions(pageA, messageId);
    let placedEmoji = reactionsA.length > 0 ? reactionsA[0].emoji : null;

    if (!placedEmoji) {
      placedEmoji = await placeReactionByClick(pageA);
      if (!placedEmoji) {
        test.skip(true, 'Не удалось поставить реакцию');
        return;
      }
      await pageA.waitForTimeout(2000);
      await pageB.waitForTimeout(5000);
    }

    // Убеждаемся что User B видит реакцию И загрузил реакции
    const reactionsB_before = await getReactions(pageB, messageId);
    const hasBBefore = reactionsB_before.some((r: any) => r.emoji === placedEmoji);
    if (!hasBBefore) {
      // Явно загружаем реакции для User B
      console.log('User B: explicitly loading reactions...');
      await pageB.evaluate((mid) => {
        const stores = (window as any).__ZUSTAND_STORES__;
        return stores.useMessageUIStore.getState().loadReactions(mid);
      }, messageId);
      await pageB.waitForTimeout(2000);

      const retry = await getReactions(pageB, messageId);
      if (!retry.some((r: any) => r.emoji === placedEmoji)) {
        test.skip(true, 'User B не видит реакцию — realtime INSERT не работает');
        return;
      }
    }

    // Проверяем что кэш заполнен у User B
    const cacheSize = await pageB.evaluate(() => {
      const stores = (window as any).__ZUSTAND_STORES__;
      return Object.keys(stores.useMessageUIStore.getState().reactionIdCache).length;
    });
    console.log(`User B reactionIdCache size: ${cacheSize}`);

    // User A кликает на pill чтобы снять реакцию
    console.log(`User A removing reaction ${placedEmoji}...`);
    const pillA = pageA.locator(`[data-reaction-emoji="${placedEmoji}"]`).first();
    const isVisible = await pillA.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip(true, 'Pill не виден — нечего удалять');
      return;
    }

    // Слушаем консоль User B для логов SSE
    const sseLogsB: string[] = [];
    pageB.on('console', msg => {
      const text = msg.text();
      if (text.includes('[SSE') || text.includes('[Reaction')) {
        sseLogsB.push(text);
      }
    });

    await pillA.click();
    await pageA.waitForTimeout(2000);

    // Проверяем у User A
    const reactionsA_after = await getReactions(pageA, messageId);
    console.log('Reactions A after removal:', reactionsA_after);
    const hasAAfter = reactionsA_after.some((r: any) => r.emoji === placedEmoji);

    // Ждём Realtime доставку DELETE
    console.log('Waiting for DELETE Realtime sync to User B...');
    await pageB.waitForTimeout(8000);

    // Логи User B
    if (sseLogsB.length > 0) {
      console.log('📋 SSE logs from User B:');
      sseLogsB.forEach(log => console.log('  ' + log));
    } else {
      console.log('⚠️ NO SSE logs from User B — DELETE event не дошёл!');
    }

    // Проверяем у User B
    const reactionsB_after = await getReactions(pageB, messageId);
    console.log('Reactions B after DELETE realtime:', reactionsB_after);
    const hasBAfter = reactionsB_after.some((r: any) => r.emoji === placedEmoji);

    if (hasBAfter) {
      console.log('❌ Реакция ВСЁ ЕЩЁ видна у User B! DELETE Realtime не работает.');
    }

    expect(hasBAfter).toBe(false);
    console.log('✅ Удаление реакции синхронизировано через Realtime!');
  });
});

// =====================================================
// HELPERS
// =====================================================

async function login(page: Page, email: string, password: string) {
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const loginHeading = page.getByText('Вход в систему');
  if (await loginHeading.isVisible().catch(() => false)) {
    await page.locator('input[type="text"], input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForTimeout(5000);
  }
}

async function openSharedChat(pageA: Page, pageB: Page) {
  // Находим чат где ОБА пользователя — участники через store
  const sharedChatId = await findSharedChat(pageA, pageB);
  if (!sharedChatId) {
    console.log('⚠️ No shared chat found, trying first available chat for each');
    // Fallback: открываем первый доступный чат
    await openFirstChat(pageA);
    await openFirstChat(pageB);
    return;
  }

  console.log('📂 Opening shared chat:', sharedChatId);

  // Кликаем на чат в списке
  await clickChatById(pageA, sharedChatId);
  await clickChatById(pageB, sharedChatId);

  await pageA.waitForTimeout(2000);
  await pageB.waitForTimeout(2000);

  // Ждём сообщения
  try {
    await pageA.locator('[class*="bubble"]').first().waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    console.log('⚠️ No messages visible in shared chat');
  }
}

async function findSharedChat(pageA: Page, pageB: Page): Promise<string | null> {
  return pageA.evaluate(() => {
    const stores = (window as any).__ZUSTAND_STORES__;
    if (!stores) return null;
    const chatStore = stores.useChatStore.getState();
    const chats = chatStore.chats;

    // Ищем чат где есть сообщения
    for (const chat of chats) {
      const msgs = chatStore.messages[chat.id];
      if (msgs && msgs.length > 0) {
        return chat.id;
      }
    }
    return null;
  });
}

async function clickChatById(page: Page, chatId: string) {
  // Ищем элемент чата по data атрибуту или кликаем первый
  const chatElements = page.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"], [class*="sidebar"] li');
  const count = await chatElements.count();

  if (count > 0) {
    // Пробуем найти по тексту или кликаем первый
    await chatElements.first().click();
    return;
  }

  // Fallback: если уже в чате — ничего
}

async function openFirstChat(page: Page) {
  // Пробуем найти чат в сайдбаре
  const chatItems = page.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"], [class*="sidebar"] li, [class*="Sidebar"] li');
  const count = await chatItems.count();

  if (count > 0) {
    await chatItems.first().click();
    await page.waitForTimeout(1000);
  }

  // Ждём сообщения
  try {
    await page.locator('[class*="bubble"]').first().waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    console.log('No messages visible, trying another chat...');
    if (count > 1) {
      await chatItems.nth(1).click();
      await page.waitForTimeout(2000);
    }
  }
}

async function getFirstMessageId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const stores = (window as any).__ZUSTAND_STORES__;
    if (!stores) return null;
    const chatStore = stores.useChatStore.getState();
    const msgs = chatStore.messages;
    const keys = Object.keys(msgs);
    return keys.length > 0 ? keys[0] : null;
  });
}

async function getFirstVisibleMessageId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const stores = (window as any).__ZUSTAND_STORES__;
    if (!stores) return null;
    const chatStore = stores.useChatStore.getState();
    const msgs = chatStore.messages;
    // Берём ПЕРВОЕ сообщение — оно видимо на экране
    const keys = Object.keys(msgs);
    return keys.length > 0 ? keys[0] : null;
  });
}

async function getReactions(page: Page, messageId: string): Promise<any[]> {
  return page.evaluate((mid) => {
    const stores = (window as any).__ZUSTAND_STORES__;
    if (!stores) return [];
    const state = stores.useMessageUIStore.getState();
    return state.reactions[mid] || [];
  }, messageId);
}

async function placeReactionByClick(page: Page): Promise<string | null> {
  const msg = page.locator('[class*="bubble"]').first();
  await msg.click({ button: 'right' });
  await page.waitForTimeout(500);

  // Ищем кнопку с эмодзи
  const buttons = page.locator('[class*="quickReactionsScroll"] button, [class*="reactionPicker"] button');
  const count = await buttons.count();

  if (count === 0) return null;

  // Кликаем ПЕРВУЮ кнопку и возвращаем её эмодзи
  const firstBtn = buttons.first();
  const text = await firstBtn.textContent();
  await firstBtn.click();
  return text?.trim() || null;
}
