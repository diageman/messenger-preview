import { test, expect, Page } from '@playwright/test';

/**
 * Тест: ширина центральной панели настроек НЕ меняется при переключении темы.
 */
test.describe('Theme Layout Stability', () => {
  test.setTimeout(90000);

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

  test('ширина центральной панели настроек одинакова в dark и light темах', async ({ page }) => {
    // --- Шаг 1: Открываем настройки (темная тема по умолчанию) ---
    console.log('🔧 Opening settings (dark theme)...');
    await openSettings(page);

    // Ждём загрузки контента
    await page.waitForTimeout(2000);

    // --- Шаг 2: Замеряем ширину центральной панели ---
    const panelLocator = page.locator('.max-w-4xl');
    await expect(panelLocator).toBeVisible({ timeout: 10000 });

    const darkBox = await panelLocator.boundingBox();
    expect(darkBox).not.toBeNull();
    const darkWidth = darkBox!.width;
    console.log(`Dark theme panel width: ${darkWidth}px`);

    // Также замеряем высоту для полноты
    const darkHeight = darkBox!.height;
    console.log(`Dark theme panel height: ${darkHeight}px`);

    // --- Шаг 3: Переключаем на светлую тему ---
    console.log('🎨 Switching to light theme...');
    const lightBtn = page.locator('button').filter({ hasText: 'Light' }).first();
    await expect(lightBtn).toBeVisible({ timeout: 5000 });
    await lightBtn.click();
    await page.waitForTimeout(1500);

    // Проверяем что data-theme="light" применён
    const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(themeAttr).toBe('light');
    console.log('✅ Light theme applied');

    // --- Шаг 4: Замеряем ширину снова ---
    await expect(panelLocator).toBeVisible({ timeout: 5000 });
    const lightBox = await panelLocator.boundingBox();
    expect(lightBox).not.toBeNull();
    const lightWidth = lightBox!.width;
    console.log(`Light theme panel width: ${lightWidth}px`);

    const lightHeight = lightBox!.height;
    console.log(`Light theme panel height: ${lightHeight}px`);

    // --- Шаг 5: Сравниваем ---
    // Ширина должна быть идентичной (±1px из-за subpixel rendering)
    const widthDiff = Math.abs(darkWidth - lightWidth);
    console.log(`Width difference: ${widthDiff}px`);
    expect(widthDiff).toBeLessThanOrEqual(1);

    // Высота также не должна сильно меняться
    const heightDiff = Math.abs(darkHeight - lightHeight);
    console.log(`Height difference: ${heightDiff}px`);
    expect(heightDiff).toBeLessThanOrEqual(2);

    // --- Шаг 6: Проверяем что элементы внутри не "поплыли" ---
    const settingsSections = page.locator('[class*="SettingsSection"], h2, [class*="card"]');
    const darkSectionCount = await settingsSections.count();
    console.log(`Settings sections count: ${darkSectionCount}`);
    expect(darkSectionCount).toBeGreaterThan(0);

    // Переключаем обратно на темную для проверки
    console.log('🎨 Switching back to dark theme...');
    const darkBtn = page.locator('button').filter({ hasText: 'Dark' }).first();
    await darkBtn.click();
    await page.waitForTimeout(1000);

    const darkBox2 = await panelLocator.boundingBox();
    const darkWidth2 = darkBox2!.width;
    console.log(`Dark theme panel width (after switch back): ${darkWidth2}px`);

    const widthDiff2 = Math.abs(darkWidth - darkWidth2);
    expect(widthDiff2).toBeLessThanOrEqual(1);
    console.log('✅ Layout is stable across theme switches');
  });
});

async function openSettings(page: Page) {
  const settingsBtn = page.locator('[title*="Настройки"], [aria-label*="Настройки"], button:has(svg[data-lucide="settings"])').first();
  if (await settingsBtn.isVisible().catch(() => false)) {
    await settingsBtn.click();
    await page.waitForTimeout(1000);
    return;
  }
  await page.goto('http://localhost:5173/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}
