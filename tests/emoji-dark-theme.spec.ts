import { test, expect } from '@playwright/test';

test.describe('Emoji Dark Theme & UX', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const loginHeading = page.getByText('Вход в систему');
    if (await loginHeading.isVisible().catch(() => false)) {
      await page.getByRole('textbox', { name: /name@company/ }).fill('diage2x@gmail.com');
      await page.locator('input[type="password"]').fill('G7Ws7QnB');
      await page.getByRole('button', { name: 'Войти' }).click();
      await page.waitForTimeout(5000);
    }
    await page.waitForTimeout(2000);
  });

  test('context menu emoji picker should have dark theme', async ({ page }) => {
    const msg = page.locator('[class*="bubble"]').first();
    await expect(msg).toBeVisible({ timeout: 10000 });
    await msg.click({ button: 'right' });
    await page.waitForTimeout(500);

    // Expand emoji picker
    const expandBtn = page.locator('[class*="moreBtn"]').first();
    await expandBtn.click();
    await page.waitForTimeout(600);

    // Picker visible via fullPickerContainer
    const pickerContainer = page.locator('[class*="fullPickerContainer"]').first();
    await expect(pickerContainer).toBeVisible({ timeout: 5000 });

    // Check the picker has dark background by sampling computed style
    const pickerBg = await pickerContainer.evaluate((el) => {
      // The emoji-picker-react element
      const ep = el.querySelector('emoji-picker-react');
      if (ep) {
        const shadow = ep.shadowRoot;
        if (shadow) {
          const container = shadow.querySelector('section') || shadow.firstElementChild;
          if (container) return window.getComputedStyle(container).backgroundColor;
        }
      }
      return 'fallback: ' + window.getComputedStyle(el).backgroundColor;
    });
    console.log('Context menu picker bg:', pickerBg);

    // Dark theme background is rgb(30, 42, 53) — NOT white
    expect(pickerBg).not.toContain('255, 255, 255');
    expect(pickerBg).not.toContain('white');
    console.log('✓ Context menu emoji picker has dark theme');

    // Collapse and verify Reply/Copy visible
    await expandBtn.click();
    await page.waitForTimeout(400);
    await expect(page.getByText('Ответить')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Копировать')).toBeVisible({ timeout: 3000 });
    console.log('✓ Reply and Copy buttons visible after collapse');
  });

  test('input emoji picker should have dark theme', async ({ page }) => {
    // Open emoji picker in input area
    const emojiBtn = page.getByRole('button', { name: 'Эмодзи' });
    await expect(emojiBtn).toBeVisible({ timeout: 10000 });
    await emojiBtn.click();
    await page.waitForTimeout(800);

    // The ChatWindow picker is in a div with absolute positioning near the input
    // Find the search textbox inside the picker to confirm it's open
    const searchBox = page.getByPlaceholder('Search').first();
    await expect(searchBox).toBeVisible({ timeout: 5000 });
    console.log('✓ Input emoji picker is open (search box found)');

    // Check the picker container background
    const pickerParent = searchBox.locator('..').locator('..').locator('..');
    const pickerBg = await pickerParent.evaluate((el) => {
      // Go up to the div containing the picker
      let container = el;
      for (let i = 0; i < 5; i++) {
        if (container.parentElement && container.parentElement.id !== 'root') {
          container = container.parentElement;
        }
        const bg = window.getComputedStyle(container).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return bg;
        }
      }
      return window.getComputedStyle(el.closest('div.absolute') || el).backgroundColor;
    });
    console.log('Input picker container bg:', pickerBg);

    // It should NOT be white
    expect(pickerBg).not.toContain('255, 255, 255');
    console.log('✓ Input emoji picker has dark theme');

    // Close picker
    await emojiBtn.click();
    await page.waitForTimeout(300);
  });

  test('context menu has Reply, Copy, Reaction buttons in collapsed state', async ({ page }) => {
    const msg = page.locator('[class*="bubble"]').first();
    await expect(msg).toBeVisible({ timeout: 10000 });
    await msg.click({ button: 'right' });
    await page.waitForTimeout(500);

    await expect(page.getByText('Ответить')).toBeVisible({ timeout: 3000 });
    console.log('✓ Reply button visible');

    await expect(page.getByText('Копировать')).toBeVisible({ timeout: 3000 });
    console.log('✓ Copy button visible');

    await expect(page.getByText('Реакция')).toBeVisible({ timeout: 3000 });
    console.log('✓ Reaction button visible');
  });

  test('quick reactions row has scrollable emojis with more than 6 items', async ({ page }) => {
    const msg = page.locator('[class*="bubble"]').first();
    await expect(msg).toBeVisible({ timeout: 10000 });
    await msg.click({ button: 'right' });
    await page.waitForTimeout(500);

    // Check that we have more than 6 reaction buttons
    const reactionButtons = page.locator('[class*="quickReactionsScroll"] button');
    const count = await reactionButtons.count();
    console.log(`Quick reaction buttons count: ${count}`);
    expect(count).toBeGreaterThan(6);
    console.log(`✓ ${count} quick reactions available (>6)`);

    // Check scroll container exists
    const scrollContainer = page.locator('[class*="quickReactionsScroll"]');
    await expect(scrollContainer).toBeVisible();
    console.log('✓ Scrollable reactions container visible');
  });
});
