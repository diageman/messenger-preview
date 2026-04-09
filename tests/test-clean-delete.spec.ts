import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Тест: чистая синхронизация удаления реакций (после REPLICA IDENTITY FULL).
 * Два изолированных контекста — User A и User B.
 *
 * Сценарий:
 * 1. User A ставит реакцию → User B видит в DOM
 * 2. User A убирает реакцию → User B НЕ видит в DOM (мгновенно, без F5)
 */
test.describe('Clean Delete Sync — REPLICA IDENTITY FULL', () => {
  test.setTimeout(90000);

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

    await login(pageA, 'diage2x@gmail.com', 'G7Ws7QnB');
    await login(pageB, 'd1ageman@yandex.ru', 'G7Ws7QnB');
    await pageA.waitForTimeout(3000);
    await pageB.waitForTimeout(3000);

    await openSharedChat(pageA, pageB);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);

    messageId = await pageA.locator('[data-message-id]').first().getAttribute('data-message-id');
    console.log('📌 Shared message ID:', messageId);

    // Очищаем реакции перед тестом
    await clearAllReactions(pageA, messageId);
    await clearAllReactions(pageB, messageId);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await contextA?.close();
    await contextB?.close();
  });

  test('User A ставит → User B видит → User A убирает → User B НЕ видит', async () => {
    // --- ШАГ 0: Очищаем реакции ---
    await clearAllReactions(pageA, messageId);
    await clearAllReactions(pageB, messageId);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);

    const reactionsBefore = await getReactions(pageA, messageId);
    const myBefore = reactionsBefore.filter((r: any) => r.myReaction);
    expect(myBefore.length).toBe(0);

    // --- ШАГ 1: User A ставит реакцию ---
    const placedEmoji = await placeReactionByClick(pageA);
    expect(placedEmoji).toBeTruthy();
    console.log('✅ User A placed:', placedEmoji);
    await pageA.waitForTimeout(2000);

    // User A видит реакцию
    const reactionsA = await getReactions(pageA, messageId);
    expect(reactionsA.some((r: any) => r.emoji === placedEmoji)).toBe(true);
    console.log('User A sees:', reactionsA);

    // --- ШАГ 2: User B видит реакцию через Realtime ---
    await pageB.waitForTimeout(5000);
    const reactionsB = await getReactions(pageB, messageId);
    console.log('User B sees:', reactionsB);
    expect(reactionsB.some((r: any) => r.emoji === placedEmoji)).toBe(true);

    // Проверяем DOM User B
    const pillB = pageB.locator(`[data-reaction-emoji="${placedEmoji}"]`).first();
    await expect(pillB).toBeVisible({ timeout: 5000 });
    console.log('✅ User B sees reaction in DOM');

    // --- ШАГ 3: User A убирает реакцию ---
    const pillA = pageA.locator(`[data-reaction-emoji="${placedEmoji}"]`).first();
    await expect(pillA).toBeVisible({ timeout: 5000 });
    await pillA.click();
    console.log('✅ User A clicked to remove');
    await pageA.waitForTimeout(2000);

    // User A больше не видит
    const reactionsA_after = await getReactions(pageA, messageId);
    expect(reactionsA_after.some((r: any) => r.emoji === placedEmoji)).toBe(false);
    console.log('User A after removal:', reactionsA_after);

    // --- ШАГ 4: Проверяем напрямую из страницы User B ---
    // Вместо console listener — напрямую проверяем state страницы
    await pageB.waitForTimeout(8000);

    // Проверяем reactionIdCache (если остался от старого кода)
    const cacheCheck = await pageB.evaluate(() => {
      const stores = (window as any).__ZUSTAND_STORES__;
      const state = stores?.useMessageUIStore?.getState();
      return {
        reactions: state?.reactions || {},
        reactionIdCache: (state as any)?.reactionIdCache || {},
        isRealtimeInitialized: stores?.useChatStore?.getState()?.isRealtimeInitialized,
      };
    });
    console.log('User B state:', JSON.stringify(cacheCheck, null, 2));

    const reactionsB_after = await getReactions(pageB, messageId);
    console.log('User B after sync:', reactionsB_after);

    const stillVisible = reactionsB_after.some((r: any) => r.emoji === placedEmoji);
    if (stillVisible) {
      console.log('❌ BUG: Ghost reaction still visible for User B!');
    }
    expect(stillVisible).toBe(false);

    // Проверяем DOM — pill должен полностью исчезнуть
    const pillsB = pageB.locator(`[data-reaction-emoji="${placedEmoji}"]`);
    await expect(pillsB).toHaveCount(0, { timeout: 5000 });
    console.log('✅ User B: reaction completely removed from DOM (no ghost!)');
  });
});

// =====================================================
// HELPERS
// =====================================================

async function login(page: Page, email: string, password: string) {
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  if (await page.getByText('Вход в систему').isVisible().catch(() => false)) {
    await page.locator('input[type="text"], input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();
    await page.waitForTimeout(5000);
  }
}

async function openSharedChat(pageA: Page, pageB: Page) {
  for (const page of [pageA, pageB]) {
    const items = page.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"], [class*="sidebar"] li');
    if (await items.count() > 0) {
      await items.first().click();
      await page.waitForTimeout(1000);
    }
  }
  await pageA.locator('[class*="bubble"]').first().waitFor({ state: 'visible', timeout: 10000 });
}

async function getReactions(page: Page, messageId: string): Promise<any[]> {
  return page.evaluate((mid) => {
    const stores = (window as any).__ZUSTAND_STORES__;
    return stores?.useMessageUIStore.getState().reactions[mid] || [];
  }, messageId);
}

async function placeReactionByClick(page: Page): Promise<string | null> {
  await page.locator('[class*="bubble"]').first().click({ button: 'right' });
  await page.waitForTimeout(300);
  const btn = page.locator('[class*="quickReactionsScroll"] button, [class*="reactionPicker"] button').first();
  const text = await btn.textContent();
  await btn.click();
  await page.waitForTimeout(300);
  return text?.trim() || null;
}

async function clearAllReactions(page: Page, messageId: string) {
  let attempts = 0;
  while (attempts < 10) {
    const reactions = await getReactions(page, messageId);
    const my = reactions.filter((r: any) => r.myReaction);
    if (my.length === 0) break;
    for (const r of my) {
      const pill = page.locator(`[data-reaction-emoji="${r.emoji}"]`).first();
      if (await pill.isVisible().catch(() => false)) await pill.click();
    }
    await page.waitForTimeout(500);
    attempts++;
  }
}
