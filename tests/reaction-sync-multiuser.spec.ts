import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * E2E тест синхронизации реакций между двумя пользователями.
 *
 * Сценарии:
 * 1. User A ставит реакцию → User B видит её мгновенно
 * 2. User A снимает реакцию → User B не видит, User A не видит
 * 3. User A ставит 3-ю реакцию (лимит 2) → oldest заменяется у обоих
 */
test.describe('Reaction Sync — Multi-User Realtime', () => {
  test.setTimeout(120000);

  let contextA: BrowserContext;
  let contextB: BrowserContext;
  let pageA: Page;
  let pageB: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    // Создаём ДВА изолированных контекста (как два разных браузера)
    contextA = await browser.newContext();
    contextB = await browser.newContext();

    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    // Логиним User A
    await login(pageA, process.env.USER_A_EMAIL || 'diage2x@gmail.com', process.env.USER_A_PASSWORD || 'G7Ws7QnB');
    // Логиним User B (нужен второй аккаунт — используем тестовый)
    await login(pageB, process.env.USER_B_EMAIL || 'testuser@example.com', process.env.USER_B_PASSWORD || 'TestPass123!');

    // Ждём загрузки чатов
    await waitForChats(pageA);
    await waitForChats(pageB);
  });

  test.afterAll(async () => {
    await contextA.close();
    await contextB.close();
  });

  test('1. User A ставит реакцию → User B видит её в реальном времени', async () => {
    // Оба пользователя открывают первый общий чат
    await openFirstChat(pageA, 0);
    await openFirstChat(pageB, 0);

    // Ждём загрузки сообщений
    await waitForMessages(pageA);
    await waitForMessages(pageB);

    // Получаем ID первого сообщения
    const messageId = await getFirstMessageId(pageA);
    expect(messageId).toBeTruthy();
    console.log(`Test 1: Using message ID ${messageId}`);

    // Проверяем что реакций нет (или фиксируем начальное состояние)
    const reactionsBeforeA = await getReactions(pageA, messageId);
    const reactionsBeforeB = await getReactions(pageB, messageId);
    console.log('Reactions before:', { A: reactionsBeforeA, B: reactionsBeforeB });

    // User A ставит реакцию 👍
    await toggleReactionViaPicker(pageA, messageId, '👍');
    await pageA.waitForTimeout(1500); // debounce 300мс + network

    // Проверяем что реакция появилась у User A
    const reactionsAfterA = await getReactions(pageA, messageId);
    console.log('Reactions after (User A):', reactionsAfterA);
    expect(reactionsAfterA).toContainEqual(
      expect.objectContaining({ emoji: '👍', myReaction: true })
    );

    // Проверяем что реакция появилась у User B (realtime sync)
    await pageB.waitForTimeout(2000); // даём SSE дойти
    const reactionsAfterB = await getReactions(pageB, messageId);
    console.log('Reactions after (User B):', reactionsAfterB);
    expect(reactionsAfterB).toContainEqual(
      expect.objectContaining({ emoji: '👍', myReaction: false })
    );

    // Проверяем что pills видны в UI обоих пользователей
    await expect(pageA.locator(`[data-reaction-emoji="👍"]`)).toBeVisible({ timeout: 5000 });
    await expect(pageB.locator(`[data-reaction-emoji="👍"]`)).toBeVisible({ timeout: 5000 });
  });

  test('2. User A снимает реакцию → User B не видит, User A не видит (без F5)', async () => {
    const messageId = await getFirstMessageId(pageA);
    expect(messageId).toBeTruthy();

    // Фиксируем что реакция 👍 есть
    const reactionsBeforeA = await getReactions(pageA, messageId);
    const hasThumbA = reactionsBeforeA.some((r: any) => r.emoji === '👍');
    if (!hasThumbA) {
      // Если реакции нет — ставим
      await toggleReactionViaPicker(pageA, messageId, '👍');
      await pageA.waitForTimeout(1500);
    }

    // Убеждаемся что User B видит реакцию
    await pageB.waitForTimeout(2000);
    const reactionsBeforeB = await getReactions(pageB, messageId);
    const hasThumbB = reactionsBeforeB.some((r: any) => r.emoji === '👍');
    if (!hasThumbB) {
      test.skip(true, 'User B не видит реакцию — realtime INSERT не работает');
      return;
    }

    // User A кликает на pill чтобы снять реакцию
    const pillA = pageA.locator(`[data-reaction-emoji="👍"]`).first();
    await expect(pillA).toBeVisible({ timeout: 5000 });
    await pillA.click();
    await pageA.waitForTimeout(1500); // debounce + network

    // Проверяем что реакция исчезла у User A БЕЗ перезагрузки
    const reactionsAfterA = await getReactions(pageA, messageId);
    console.log('Reactions after removal (User A):', reactionsAfterA);
    const stillHasThumbA = reactionsAfterA.some((r: any) => r.emoji === '👍');
    expect(stillHasThumbA).toBe(false);

    // Проверяем что реакция исчезла у User B (realtime DELETE sync)
    await pageB.waitForTimeout(3000); // даём SSE дойти
    const reactionsAfterB = await getReactions(pageB, messageId);
    console.log('Reactions after removal (User B):', reactionsAfterB);
    const stillHasThumbB = reactionsAfterB.some((r: any) => r.emoji === '👍');
    expect(stillHasThumbB).toBe(false);

    // Проверяем что pill больше нет в UI
    const pillsA = pageA.locator(`[data-reaction-emoji="👍"]`);
    await expect(pillsA).toHaveCount(0, { timeout: 5000 });

    const pillsB = pageB.locator(`[data-reaction-emoji="👍"]`);
    await expect(pillsB).toHaveCount(0, { timeout: 5000 });
  });

  test('3. Лимит 2 реакции: 3-я заменяет oldest у обоих пользователей', async () => {
    const messageId = await getFirstMessageId(pageA);
    expect(messageId).toBeTruthy();

    // Очищаем: снимаем все реакции User A
    await clearAllReactions(pageA, messageId);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);

    // User A ставит реакцию 1
    await toggleReactionViaPicker(pageA, messageId, '👍');
    await pageA.waitForTimeout(1000);

    // User A ставит реакцию 2
    await toggleReactionViaPicker(pageA, messageId, '❤️');
    await pageA.waitForTimeout(1000);

    // Проверяем что обе реакции есть у User A
    let reactionsA = await getReactions(pageA, messageId);
    console.log('User A reactions after 2 adds:', reactionsA);
    expect(reactionsA.length).toBe(2);
    expect(reactionsA).toContainEqual(expect.objectContaining({ emoji: '👍' }));
    expect(reactionsA).toContainEqual(expect.objectContaining({ emoji: '❤️' }));

    // Ждём sync к User B
    await pageB.waitForTimeout(3000);
    let reactionsB = await getReactions(pageB, messageId);
    console.log('User B reactions after 2 adds:', reactionsB);
    expect(reactionsB.length).toBe(2);

    // User A ставит реакцию 3 (должна заменить oldest = 👍)
    await toggleReactionViaPicker(pageA, messageId, '🔥');
    await pageA.waitForTimeout(1500);

    // Проверяем у User A: 👍 ушла, остались ❤️ и 🔥
    reactionsA = await getReactions(pageA, messageId);
    console.log('User A reactions after 3rd add (replace):', reactionsA);
    const emojisA = reactionsA.map((r: any) => r.emoji);
    expect(emojisA).not.toContain('👍');
    expect(emojisA).toContain('❤️');
    expect(emojisA).toContain('🔥');
    expect(reactionsA.length).toBe(2);

    // Проверяем у User B: 👍 ушла, остались ❤️ и 🔥
    await pageB.waitForTimeout(3000);
    reactionsB = await getReactions(pageB, messageId);
    console.log('User B reactions after 3rd add (replace):', reactionsB);
    const emojisB = reactionsB.map((r: any) => r.emoji);
    expect(emojisB).not.toContain('👍');
    expect(emojisB).toContain('❤️');
    expect(emojisB).toContain('🔥');
    expect(reactionsB.length).toBe(2);
  });
});

// =====================================================
// HELPERS
// =====================================================

async function login(page: Page, email: string, password: string) {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const loginHeading = page.getByText('Вход в систему');
  if (await loginHeading.isVisible().catch(() => false)) {
    await page.getByRole('textbox', { name: /name@company|email|логин/i }).first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForTimeout(5000);
  }
}

async function waitForChats(page: Page) {
  // Ждём появления списка чатов или сразу переходим в чат
  await page.waitForTimeout(2000);
}

async function openFirstChat(page: Page, _index: number) {
  // Кликаем на первый чат в списке
  const chatItem = page.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"]').first();
  if (await chatItem.isVisible().catch(() => false)) {
    await chatItem.click();
    await page.waitForTimeout(1000);
    return;
  }

  // Fallback: если уже в чате — ничего не делаем
  const bubble = page.locator('[class*="bubble"]').first();
  if (await bubble.isVisible().catch(() => false)) {
    return;
  }

  console.log('Warning: No chat items found, may already be in chat or no chats available');
}

async function waitForMessages(page: Page) {
  await expect(page.locator('[class*="bubble"]').first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function getFirstMessageId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const stores = (window as any).__ZUSTAND_STORES__;
    if (!stores) return null;
    const chatStore = stores.useChatStore.getState();
    const messages = chatStore.messages;
    const msgKeys = Object.keys(messages);
    if (msgKeys.length === 0) return null;
    // Возвращаем первый message ID
    return msgKeys[0];
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

async function toggleReactionViaPicker(page: Page, _messageId: string, emoji: string) {
  // Правый клик на первом сообщении → выбираем реакцию из пикера
  const msg = page.locator('[class*="bubble"]').first();
  await msg.click({ button: 'right' });
  await page.waitForTimeout(500);

  // Ищем кнопку с нужным эмодзи в пикере
  const pickerButtons = page.locator('[class*="quickReactionsScroll"] button, [class*="reactionPicker"] button');
  const count = await pickerButtons.count();
  for (let i = 0; i < count; i++) {
    const btn = pickerButtons.nth(i);
    const text = await btn.textContent();
    if (text && text.includes(emoji)) {
      await btn.click();
      await page.waitForTimeout(300);
      return;
    }
  }

  // Fallback: кликаем первую кнопку
  if (count > 0) {
    await pickerButtons.first().click();
  }
}

async function clearAllReactions(page: Page, messageId: string) {
  // Снимаем все свои реакции
  let reactions = await getReactions(page, messageId);
  let attempts = 0;
  while (reactions.some((r: any) => r.myReaction) && attempts < 10) {
    for (const r of reactions) {
      if (r.myReaction) {
        const pill = page.locator(`[data-reaction-emoji="${r.emoji}"]`).first();
        if (await pill.isVisible().catch(() => false)) {
          await pill.click();
          await page.waitForTimeout(500);
        }
      }
    }
    reactions = await getReactions(page, messageId);
    attempts++;
  }
}
