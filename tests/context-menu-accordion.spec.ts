import { test, expect } from '@playwright/test';

test.describe('Context Menu Accordion Pattern', () => {
  test('full accordion flow: login, right-click, expand, collapse', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Navigate and login
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

    // 2. Find a message bubble
    const messageSelectors = ['[class*="messageBubble"]', '[class*="message-bubble"]', '[class*="MessageBubble"]', '[class*="bubble"]'];
    let messageEl = null;
    for (const selector of messageSelectors) {
      try {
        const locator = page.locator(selector).first();
        if (await locator.isVisible({ timeout: 3000 })) {
          messageEl = locator;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!messageEl) {
      // Fallback: right-click in center of page
      const viewport = page.viewportSize();
      if (viewport) {
        await page.mouse.click(viewport.width / 2 + 100, viewport.height / 2, { button: 'right' });
      }
    } else {
      // 3. Right-click on the message
      await messageEl.click({ button: 'right' });
    }

    await page.waitForTimeout(500);

    // 4. Verify context menu appears
    const overlay = page.locator('[class*="overlay"]').first();
    await expect(overlay).toBeVisible({ timeout: 5000 });
    console.log('✓ Context menu is visible');

    // 5. Check "Ответить" button exists
    const replyButton = page.getByText('Ответить');
    await expect(replyButton).toBeVisible({ timeout: 3000 });
    console.log('✓ Reply button is visible');

    // 6. Check expand arrow
    const expandButton = page.locator('[class*="moreBtn"]').first();
    await expect(expandButton).toBeVisible({ timeout: 3000 });
    console.log('✓ Expand arrow is visible');

    // 7. Click expand arrow
    await expandButton.click();
    // Wait for animation
    await page.waitForTimeout(500);

    // 8. Verify emoji picker is visible
    const emojiPicker = page.locator('[class*="fullPickerContainer"]').first();
    await expect(emojiPicker).toBeVisible({ timeout: 5000 });
    console.log('✓ Emoji Picker is visible after expand');

    // 9. Click collapse
    await expandButton.click();
    // Wait for animation to complete
    await page.waitForTimeout(600);

    // 10. Verify emoji picker is hidden (check opacity/visibility via evaluate)
    const isPickerHidden = await emojiPicker.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none' || el.offsetHeight === 0;
    });
    
    if (!isPickerHidden) {
      // Fallback: wait a bit more for transition
      await page.waitForTimeout(400);
      const isPickerHidden2 = await emojiPicker.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none' || el.offsetHeight === 0;
      });
      expect(isPickerHidden2).toBeTruthy();
    }
    console.log('✓ Emoji Picker hidden after collapse');

    // 11. Verify Reply button is visible again
    await expect(replyButton).toBeVisible({ timeout: 3000 });
    console.log('✓ Reply button visible after collapse');

    console.log('✅ All accordion tests passed!');
  });
});
