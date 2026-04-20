import { test, expect, Page } from '@playwright/test';

/**
 * E2E тест настроек UI.
 *
 * Сценарий:
 * 1. Выключить "Enter отправляет сообщение" в настройках
 * 2. В чате ввести "Test" и нажать Enter → сообщение НЕ отправляется, перенос строки
 * 3. Включить "Enter отправляет сообщение"
 * 4. В чате ввести "Test2" и нажать Enter → сообщение отправляется
 */
test.describe('Settings UI — Enter to Send', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const loginHeading = page.getByText('Вход в систему');
    if (await loginHeading.isVisible().catch(() => false)) {
      await page.locator('input[type="text"], input[type="email"]').first().fill('diage2x@gmail.com');
      await page.locator('input[type="password"]').first().fill('G7Ws7QnB');
      await page.getByRole('button', { name: 'Войти' }).click();
      await page.waitForTimeout(5000);
    }
  });

  test('выключить Enter→отправка, Enter делает перенос строки, включить → Enter отправляет', async ({ page }) => {
    // --- Шаг 1: Открываем настройки и выключаем "Enter отправляет сообщение" ---
    console.log('🔧 Opening settings...');
    await openSettings(page);

    // Прокручиваем до секции "Чаты и интерфейс" и переключаем
    const enterRow = page.locator('text=Enter отправляет сообщение').first();
    await expect(enterRow).toBeVisible({ timeout: 10000 });

    // Switch — это button с role="switch" внутри SettingsRow
    const enterSwitch = enterRow.locator('..').locator('..').locator('button[role="switch"]').first();
    await expect(enterSwitch).toBeVisible({ timeout: 5000 });

    // Проверяем состояние через aria-checked
    const isCheckedBefore = await enterSwitch.getAttribute('aria-checked');
    console.log('Enter toggle before (aria-checked):', isCheckedBefore);

    // Выключаем если включено
    if (isCheckedBefore === 'true') {
      await enterSwitch.click();
      await page.waitForTimeout(500);
    }

    // Проверяем что выключено
    const isCheckedAfter = await enterSwitch.getAttribute('aria-checked');
    console.log('Enter toggle after (aria-checked):', isCheckedAfter);
    expect(isCheckedAfter).toBe('false');
    console.log('✅ Enter toggle switched OFF');

    // --- Шаг 2: Переходим в чат ---
    console.log('💬 Opening chat...');

    // Возвращаемся на главную и выбираем чат
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Кликаем на первый чат
    const chatItems = page.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"], [class*="sidebar"] li');
    const chatCount = await chatItems.count();
    console.log('Found', chatCount, 'chats');
    if (chatCount > 0) {
      await chatItems.nth(Math.min(1, chatCount - 1)).click();
      await page.waitForTimeout(3000);
    }

    // Ждём textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });
    console.log('✅ Chat opened, textarea visible');

    // Вводим текст и нажимаем Enter
    await textarea.fill('Test');
    await textarea.press('Enter');
    await page.waitForTimeout(1000);

    // Проверяем что сообщение НЕ отправлено — текст всё ещё в textarea
    const textareaValue = await textarea.inputValue();
    console.log('Textarea value after Enter:', JSON.stringify(textareaValue));

    // При выключенном "Enter отправляет" — Enter должен сделать перенос строки
    expect(textareaValue).toContain('Test');
    console.log('✅ Message NOT sent when Enter toggle is OFF (text still in textarea)');

    // Очищаем textarea
    await textarea.fill('');

    // --- Шаг 3: Возвращаемся в настройки и включаем ---
    console.log('🔧 Re-enabling Enter toggle...');
    await openSettings(page);
    await page.waitForTimeout(1000);

    const enterSwitch2 = page.locator('text=Enter отправляет сообщение').first().locator('..').locator('..').locator('button[role="switch"]').first();
    await expect(enterSwitch2).toBeVisible({ timeout: 10000 });
    await enterSwitch2.click();
    await page.waitForTimeout(500);

    const isCheckedOn = await enterSwitch2.getAttribute('aria-checked');
    expect(isCheckedOn).toBe('true');
    console.log('✅ Enter toggle switched ON');

    // --- Шаг 4: Переходим в чат и проверяем отправку ---
    console.log('💬 Opening chat again...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const chatItems2 = page.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"], [class*="sidebar"] li');
    const chatCount2 = await chatItems2.count();
    if (chatCount2 > 0) {
      await chatItems2.nth(Math.min(1, chatCount2 - 1)).click();
      await page.waitForTimeout(3000);
    }

    const textarea2 = page.locator('textarea').first();
    await expect(textarea2).toBeVisible({ timeout: 10000 });

    await textarea2.fill('Test2');
    await textarea2.press('Enter');
    await page.waitForTimeout(2000);

    // Проверяем что textarea очистилась
    const textareaValue2 = await textarea2.inputValue();
    console.log('Textarea value after Enter (toggle ON):', JSON.stringify(textareaValue2));
    expect(textareaValue2.trim()).toBe('');

    // Проверяем что сообщение появилось в чате
    const lastMsg = page.locator('[class*="bubble"]').last();
    const lastMsgText = await lastMsg.textContent();
    console.log('Last message in chat:', lastMsgText);
    expect(lastMsgText).toContain('Test2');
    console.log('✅ Message SENT when Enter toggle is ON');
  });
});

// =====================================================
// HELPERS
// =====================================================

async function openSettings(page: Page) {
  // Ищем кнопку настроек в сайдбаре
  const settingsBtn = page.locator('[title*="Настройки"], [aria-label*="Настройки"], button:has(svg[data-lucide="settings"])').first();
  if (await settingsBtn.isVisible().catch(() => false)) {
    await settingsBtn.click();
    await page.waitForTimeout(1000);
    return;
  }

  // Fallback: переходим по URL
  await page.goto('http://localhost:5173/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

async function openFirstChat(page: Page) {
  const chatItems = page.locator('[class*="chatItem"], [class*="chat-item"], [class*="ChatItem"], [class*="sidebar"] li');
  const count = await chatItems.count();
  if (count > 0) {
    await chatItems.first().click();
    await page.waitForTimeout(1000);
  }

  try {
    await page.locator('[class*="bubble"]').first().waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    console.log('No messages visible, may need to select a different chat');
  }
}
