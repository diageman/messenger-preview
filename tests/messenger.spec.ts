import { test, expect, devices } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  userA: {
    email: process.env.USER_A_EMAIL || 'user1@test.local',
    password: process.env.USER_A_PASSWORD || 'test123',
  },
  userB: {
    email: process.env.USER_B_EMAIL || 'user2@test.local',
    password: process.env.USER_B_PASSWORD || 'test123',
  },
};

test.describe('Messenger - Direct Chat E2E', () => {
  let browserA: any;
  let browserB: any;
  let pageA: any;
  let pageB: any;

  // Setup: Open two browser contexts
  test.beforeAll(async ({ browser }) => {
    // Create two independent browser contexts
    browserA = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    browserB = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });

    pageA = await browserA.newPage();
    pageB = await browserB.newPage();

    // Login both users
    await login(pageA, TEST_CONFIG.userA);
    await login(pageB, TEST_CONFIG.userB);

    // Navigate to chats
    await pageA.goto(`${TEST_CONFIG.appUrl}/chats`);
    await pageB.goto(`${TEST_CONFIG.appUrl}/chats`);

    // Wait for chat list to load
    await pageA.waitForSelector('[aria-label*="Чат"]', { timeout: 10000 });
    await pageB.waitForSelector('[aria-label*="Чат"]', { timeout: 10000 });
  });

  test.afterAll(async () => {
    await browserA?.close();
    await browserB?.close();
  });

  test('should show instant message delivery', async () => {
    test.setTimeout(60000);

    // Open direct chat on both sides
    await openDirectChat(pageA, pageB);

    // Test 1: Incoming realtime latency
    const sendTime = Date.now();
    await pageA.locator('textarea[placeholder*="сообщение"]').fill('Test message 1');
    await pageA.locator('button[aria-label*="Отправить"]').click();

    // Wait for message to appear on pageB
    await pageB.waitForSelector('text="Test message 1"', { timeout: 5000 });
    const receiveTime = Date.now();
    const latency = receiveTime - sendTime;

    console.log(`✅ Message latency: ${latency}ms`);
    expect(latency).toBeLessThan(3000); // <3s (includes network + render)

    // Test 2: Chat list vs active chat sync
    const chatListMessage = await pageB.locator('[aria-label*="Чат"]').last().textContent();
    const activeChatMessage = await pageB.locator('text="Test message 1"').textContent();

    expect(chatListMessage).toContain('Test message 1');
    expect(activeChatMessage).toBe('Test message 1');

    // Test 3: Active chat flicker (wait 15s, watch for issues)
    await pageB.waitForTimeout(15000);

    // Check if messages container is still populated
    const messagesCount = await pageB.locator('[role="log"] [class*="message"]').count();
    expect(messagesCount).toBeGreaterThan(0);

    // Test 4: Chat list flicker
    const chatListCount = await pageA.locator('[role="list"] > *').count();
    expect(chatListCount).toBeGreaterThan(0);

    // Test 5: Identity consistency
    const chatListName = await pageA.locator('[aria-label^="Чат с"]').first().textContent();
    const headerName = await pageA.locator('header h3').textContent();

    expect(chatListName).toEqual(headerName);

    // Test 6: Unread badge
    await pageB.goto(`${TEST_CONFIG.appUrl}/chats`); // Go back to chat list
    await pageA.locator('textarea[placeholder*="сообщение"]').fill('Test message 2');
    await pageA.locator('button[aria-label*="Отправить"]').click();

    // Wait for unread badge on pageB
    await pageB.waitForTimeout(2000);
    const badgeExists = await pageB.locator('[class*="badge"]').isVisible();
    expect(badgeExists).toBe(true);

    // Open chat - badge should disappear
    await openDirectChat(pageB, pageA);
    await pageB.waitForTimeout(1000);
    const badgeVisible = await pageB.locator('[class*="badge"]').isVisible();
    expect(badgeVisible).toBe(false);

    // Test 7: Autoscroll
    await pageA.locator('textarea[placeholder*="сообщение"]').fill('Test message 3');
    await pageA.locator('button[aria-label*="Отправить"]').click();

    // Wait and check if pageB auto-scrolled to bottom
    await pageB.waitForTimeout(2000);
    const isAtBottom = await pageB.evaluate(() => {
      const container = document.querySelector('[role="log"]');
      if (!container) return false;
      const threshold = 100;
      return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    });
    expect(isAtBottom).toBe(true);
  });
});

// Helper functions
async function login(page: any, user: any) {
  await page.goto(`${TEST_CONFIG.appUrl}/auth`);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  // Wait for any navigation (could be / or /chats)
  await page.waitForTimeout(5000);
  const currentUrl = page.url();
  console.log(`Login result URL: ${currentUrl}`);
}

async function openDirectChat(pageA: any, pageB: any) {
  // Find and click on the direct chat from the other user
  const peerEmail = pageA === pageA ? TEST_CONFIG.userB.email : TEST_CONFIG.userA.email;
  const chatItem = pageA.locator(`[aria-label*="Чат"]`).filter({ hasText: peerEmail.split('@')[0] });

  const chatCount = await chatItem.count();
  if (chatCount > 0) {
    await chatItem.first().click();
  } else {
    // Create new chat if not exists
    await pageA.click('button:has-text("Новый чат")');
    await pageA.fill('input[placeholder*="Поиск"]', peerEmail.split('@')[0]);
    await pageA.click('[role="dialog"] button:has-text("Создать чат")');
  }

  await pageA.waitForSelector('[role="log"]', { timeout: 10000 });
}
