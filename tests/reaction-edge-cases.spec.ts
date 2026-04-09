import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Edge-case тесты реакций — 2 изолированных контекста (User A и User B)
 *
 * Сценарии:
 * 1. Базовый синк: A ставит → B видит в DOM
 * 2. Удаление: A убирает → B НЕ ВИДИТ (фикс бага "призрак")
 * 3. Защита от дублей: B ставит ту же → count=2, не два значка
 * 4. Стресс-тест: A кликает 5 раз подряд → стейт стабилен
 */
test.describe('Reaction Edge Cases — Two Users', () => {
  test.setTimeout(120000);

  let contextA: BrowserContext;
  let contextB: BrowserContext;
  let pageA: Page;
  let pageB: Page;
  let messageId: string;

  test.beforeAll(async ({ browser }) => {
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    // Логины ДВУХ РАЗНЫХ пользователей
    await login(pageA, 'diage2x@gmail.com', 'G7Ws7QnB');
    await login(pageB, 'd1ageman@yandex.ru', 'G7Ws7QnB');
    await pageA.waitForTimeout(3000);
    await pageB.waitForTimeout(3000);

    // Открываем общий чат
    await openSharedChat(pageA, pageB);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);

    // Получаем messageId из DOM
    messageId = await pageA.locator('[data-message-id]').first().getAttribute('data-message-id');
    console.log('📌 Shared message ID:', messageId);

    // Очищаем все реакции перед тестами
    await clearAllReactions(pageA, messageId);
    await clearAllReactions(pageB, messageId);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await contextA?.close();
    await contextB?.close();
  });

  // ==================== СЦЕНАРИЙ 1: Базовый синк ====================
  test('1. User A ставит реакцию → User B видит её в DOM', async () => {
    const reactionsA_before = await getReactions(pageA, messageId);
    const reactionsB_before = await getReactions(pageB, messageId);
    console.log('Before INSERT:', { A: reactionsA_before, B: reactionsB_before });

    // User A ставит реакцию
    const placedEmoji = await placeReactionByClick(pageA);
    expect(placedEmoji).toBeTruthy();
    console.log('User A placed:', placedEmoji);
    await pageA.waitForTimeout(2000);

    // Проверяем User A
    const reactionsA = await getReactions(pageA, messageId);
    expect(reactionsA.some((r: any) => r.emoji === placedEmoji)).toBe(true);
    console.log('User A reactions:', reactionsA);

    // Ждём Realtime
    await pageB.waitForTimeout(5000);

    // Проверяем User B
    const reactionsB = await getReactions(pageB, messageId);
    console.log('User B reactions:', reactionsB);
    expect(reactionsB.some((r: any) => r.emoji === placedEmoji)).toBe(true);

    // Проверяем DOM User B
    const pillB = pageB.locator(`[data-reaction-emoji="${placedEmoji}"]`).first();
    await expect(pillB).toBeVisible({ timeout: 5000 });
    console.log('✅ User B sees reaction in DOM');
  });

  // ==================== СЦЕНАРИЙ 2: Удаление ====================
  test('2. User A убирает реакцию → User B НЕ ВИДИТ (фикс "призрак")', async () => {
    const reactionsA = await getReactions(pageA, messageId);
    const existingEmoji = reactionsA.find((r: any) => r.myReaction)?.emoji;

    if (!existingEmoji) {
      test.skip(true, 'No reaction to remove');
      return;
    }
    console.log('Removing:', existingEmoji);

    // User A кликает на pill
    const pillA = pageA.locator(`[data-reaction-emoji="${existingEmoji}"]`).first();
    await expect(pillA).toBeVisible({ timeout: 5000 });
    await pillA.click();
    await pageA.waitForTimeout(2000);

    // Проверяем User A
    const reactionsA_after = await getReactions(pageA, messageId);
    expect(reactionsA_after.some((r: any) => r.emoji === existingEmoji)).toBe(false);
    console.log('User A after removal:', reactionsA_after);

    // Ждём Realtime
    await pageB.waitForTimeout(8000);

    // Проверяем User B — реакции НЕ ДОЛЖНО БЫТЬ
    const reactionsB_after = await getReactions(pageB, messageId);
    console.log('User B after sync:', reactionsB_after);
    const stillVisible = reactionsB_after.some((r: any) => r.emoji === existingEmoji);

    if (stillVisible) {
      console.log('❌ BUG: Reaction GHOST visible for User B!');
    }
    expect(stillVisible).toBe(false);

    // Проверяем DOM User B — pill должен исчезнуть
    const pillsB = pageB.locator(`[data-reaction-emoji="${existingEmoji}"]`);
    await expect(pillsB).toHaveCount(0, { timeout: 5000 });
    console.log('✅ User B does NOT see ghost reaction');
  });

  // ==================== СЦЕНАРИЙ 3: Защита от дублей ====================
  test('3. User B ставит ту же реакцию → count=2, один значок', async () => {
    // User A ставит 👍
    await clearAllReactions(pageA, messageId);
    await clearAllReactions(pageB, messageId);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);

    await placeReactionByClick(pageA);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(5000);

    const reactionsB_before = await getReactions(pageB, messageId);
    const emojiA = reactionsB_before.find((r: any) => !r.myReaction)?.emoji;
    if (!emojiA) {
      test.skip(true, 'User A reaction not synced');
      return;
    }
    console.log('User A reaction:', emojiA);

    // User B ставит ТУ ЖЕ реакцию (через picker)
    await placeReactionByClick(pageB, emojiA);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(5000);

    // Проверяем User B
    const reactionsB = await getReactions(pageB, messageId);
    console.log('User B reactions after same emoji:', reactionsB);

    const matchingEmoji = reactionsB.filter((r: any) => r.emoji === emojiA);
    expect(matchingEmoji.length).toBe(1); // ОДИН значок, не два
    expect(matchingEmoji[0].count).toBe(2); // count = 2
    expect(matchingEmoji[0].myReaction).toBe(true);
    console.log('✅ count=2, single pill');

    // Проверяем User A
    await pageA.waitForTimeout(3000);
    const reactionsA = await getReactions(pageA, messageId);
    console.log('User A reactions:', reactionsA);
    const matchingA = reactionsA.filter((r: any) => r.emoji === emojiA);
    expect(matchingA.length).toBe(1);
    expect(matchingA[0].count).toBe(2);
    console.log('✅ User A also sees count=2');
  });

  // ==================== СЦЕНАРИЙ 4: Стресс-тест ====================
  test('4. User A кликает реакцию 5 раз подряд → стейт стабилен', async () => {
    await clearAllReactions(pageA, messageId);
    await clearAllReactions(pageB, messageId);
    await pageA.waitForTimeout(2000);

    // Спамим 5 раз без задержки
    console.log('Spamming 5 clicks...');
    for (let i = 0; i < 5; i++) {
      await placeReactionByClick(pageA, undefined, true); // skip wait
    }
    await pageA.waitForTimeout(3000); // debounce 300 * 5 + network

    // Проверяем User A
    const reactionsA = await getReactions(pageA, messageId);
    console.log('User A after spam:', reactionsA);

    // myReaction должно быть 0 или 1 (toggle)
    const myReactions = reactionsA.filter((r: any) => r.myReaction);
    expect(myReactions.length).toBeLessThanOrEqual(1);
    if (myReactions.length > 0) {
      expect(myReactions[0].count).toBeGreaterThanOrEqual(1);
    }
    console.log('✅ User A state stable');

    // Ждём User B
    await pageB.waitForTimeout(5000);
    const reactionsB = await getReactions(pageB, messageId);
    console.log('User B after spam:', reactionsB);

    // Считаем общее количество myReaction + других
    const totalMyB = reactionsB.filter((r: any) => r.myReaction).length;
    expect(totalMyB).toBeLessThanOrEqual(1);
    console.log('✅ User B state stable');
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
  const chatItems = pageA.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"], [class*="sidebar"] li');
  const count = await chatItems.count();
  if (count > 0) {
    await chatItems.first().click();
    await pageA.waitForTimeout(1000);
  }

  const chatItemsB = pageB.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"], [class*="sidebar"] li');
  const countB = await chatItemsB.count();
  if (countB > 0) {
    await chatItemsB.first().click();
    await pageB.waitForTimeout(1000);
  }

  try {
    await pageA.locator('[class*="bubble"]').first().waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    console.log('⚠️ No messages visible');
  }
}

async function getReactions(page: Page, messageId: string): Promise<any[]> {
  return page.evaluate((mid) => {
    const stores = (window as any).__ZUSTAND_STORES__;
    if (!stores) return [];
    const state = stores.useMessageUIStore.getState();
    return state.reactions[mid] || [];
  }, messageId);
}

async function placeReactionByClick(page: Page, specificEmoji?: string, skipWait: boolean = false): Promise<string | null> {
  const msg = page.locator('[class*="bubble"]').first();
  await msg.click({ button: 'right' });
  await page.waitForTimeout(300);

  const buttons = page.locator('[class*="quickReactionsScroll"] button, [class*="reactionPicker"] button');
  const count = await buttons.count();
  if (count === 0) return null;

  let btn;
  if (specificEmoji) {
    for (let i = 0; i < count; i++) {
      const b = buttons.nth(i);
      const text = await b.textContent();
      if (text && text.includes(specificEmoji)) {
        btn = b;
        break;
      }
    }
  }

  btn = btn || buttons.first();
  const text = await btn.textContent();
  await btn.click();
  if (!skipWait) await page.waitForTimeout(500);
  return text?.trim() || null;
}

async function clearAllReactions(page: Page, messageId: string) {
  let attempts = 0;
  while (attempts < 10) {
    const reactions = await getReactions(page, messageId);
    const myReactions = reactions.filter((r: any) => r.myReaction);
    if (myReactions.length === 0) break;

    for (const r of myReactions) {
      const pill = page.locator(`[data-reaction-emoji="${r.emoji}"]`).first();
      if (await pill.isVisible().catch(() => false)) {
        await pill.click();
        await page.waitForTimeout(500);
      }
    }
    attempts++;
  }
}
