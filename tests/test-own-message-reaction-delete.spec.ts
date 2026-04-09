import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Баг: User A ставит реакцию на СВОЁ сообщение → удаляет → у User B "призрак"
 */
test.describe('Own Message Reaction Delete Sync', () => {
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

    await login(pageA, 'diage2x@gmail.com', 'G7Ws7QnB');
    await login(pageB, 'd1ageman@yandex.ru', 'G7Ws7QnB');
    await pageA.waitForTimeout(3000);
    await pageB.waitForTimeout(3000);

    await openSharedChat(pageA, pageB);
    await pageA.waitForTimeout(2000);
    await pageB.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await contextA?.close();
    await contextB?.close();
  });

  test('User A ставит реакцию на СВОЁ сообщение → User B видит → User A удаляет → User B НЕ видит', async () => {
    // --- ШАГ 1: User A пишет СВОЁ сообщение ---
    console.log('📝 User A typing own message...');
    const inputA = pageA.locator('textarea').first();
    await inputA.fill('Мое тестовое сообщение');
    await inputA.press('Enter');
    await pageA.waitForTimeout(3000);

    // Находим ID нового сообщения
    messageId = await pageA.locator('[data-message-id]').last().getAttribute('data-message-id');
    console.log('📌 New message ID (owned by User A):', messageId);

    // Проверяем что User B тоже видит сообщение
    await pageB.waitForTimeout(3000);
    const messagesB = await pageB.locator('[data-message-id]').count();
    console.log('User B sees', messagesB, 'messages');

    // --- ШАГ 2: User A ставит реакцию на своё сообщение ---
    console.log('👍 User A placing reaction on OWN message...');
    const placedEmoji = await placeReactionOnMessage(pageA, messageId);
    expect(placedEmoji).toBeTruthy();
    await pageA.waitForTimeout(2000);

    // User A видит реакцию
    const reactionsA = await getReactions(pageA, messageId);
    console.log('User A reactions:', reactionsA);
    expect(reactionsA.some((r: any) => r.emoji === placedEmoji)).toBe(true);

    // --- ШАГ 3: User B видит реакцию ---
    await pageB.waitForTimeout(5000);
    const reactionsB = await getReactions(pageB, messageId);
    console.log('User B reactions:', reactionsB);

    // Проверяем кэш User B
    const cacheB = await pageB.evaluate(() => {
      const stores = (window as any).__ZUSTAND_STORES__;
      return stores?.useMessageUIStore?.getState()?.reactionIdCache || {};
    });
    console.log('User B reactionIdCache:', JSON.stringify(cacheB, null, 2));

    expect(reactionsB.some((r: any) => r.emoji === placedEmoji)).toBe(true);
    console.log('✅ User B sees reaction');

    // --- ШАГ 4: User A удаляет реакцию ---
    console.log('🗑 User A removing reaction...');
    const pillA = pageA.locator(`[data-reaction-emoji="${placedEmoji}"]`).first();
    await expect(pillA).toBeVisible({ timeout: 5000 });
    await pillA.click();
    await pageA.waitForTimeout(2000);

    // User A не видит
    const reactionsA_after = await getReactions(pageA, messageId);
    console.log('User A after removal:', reactionsA_after);
    expect(reactionsA_after.some((r: any) => r.emoji === placedEmoji)).toBe(false);

    // --- ШАГ 5: User B НЕ видит (фикс бага) ---
    await pageB.waitForTimeout(8000);

    // Проверяем кэш после удаления
    const cacheB_after = await pageB.evaluate(() => {
      const stores = (window as any).__ZUSTAND_STORES__;
      return stores?.useMessageUIStore?.getState()?.reactionIdCache || {};
    });
    console.log('User B reactionIdCache after:', JSON.stringify(cacheB_after, null, 2));

    const reactionsB_after = await getReactions(pageB, messageId);
    console.log('User B after sync:', reactionsB_after);

    const stillVisible = reactionsB_after.some((r: any) => r.emoji === placedEmoji);
    expect(stillVisible).toBe(false);
    console.log('✅ User B: reaction removed (no ghost!)');
  });
});

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
    if (await items.count() > 0) await items.first().click();
    await page.waitForTimeout(1000);
  }
  await pageA.locator('[class*="bubble"]').first().waitFor({ state: 'visible', timeout: 10000 });
}

async function getReactions(page: Page, messageId: string): Promise<any[]> {
  return page.evaluate((mid) => {
    const stores = (window as any).__ZUSTAND_STORES__;
    return stores?.useMessageUIStore.getState().reactions[mid] || [];
  }, messageId);
}

async function placeReactionOnMessage(page: Page, messageId: string): Promise<string | null> {
  const bubble = page.locator(`[data-message-id="${messageId}"] [class*="bubble"]`).first();
  await bubble.click({ button: 'right' });
  await page.waitForTimeout(300);
  const btn = page.locator('[class*="quickReactionsScroll"] button, [class*="reactionPicker"] button').first();
  const text = await btn.textContent();
  await btn.click();
  await page.waitForTimeout(300);
  return text?.trim() || null;
}
