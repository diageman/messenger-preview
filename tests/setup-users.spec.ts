import { test, expect } from '@playwright/test';

test.describe('Setup - Register Test Users', () => {
  test('should register user A', async ({ page }) => {
    await page.goto('http://localhost:5173/auth');
    
    // Click registration tab
    await page.click('button:has-text("Регистрация")');
    await page.waitForTimeout(500);
    
    // Fill registration form
    await page.fill('input[placeholder*="Иванов"]', 'Test User A');
    await page.fill('input[type="email"]', 'test@test.local');
    await page.fill('input[type="password"]', 'test123');
    
    // Submit
    await page.click('button:has-text("Создать аккаунт")');
    
    // Wait for redirect
    try {
      await page.waitForURL('**/chats', { timeout: 10000 });
      console.log('✅ User A registered successfully');
      await page.screenshot({ path: 'test-results/user-a-registered.png' });
    } catch (error) {
      // Might already exist - try to login
      console.log('⚠️  User A might already exist, trying login...');
      await page.goto('http://localhost:5173/auth');
      await page.click('button:has-text("Вход")');
      await page.waitForTimeout(500);
      await page.fill('input[type="email"]', 'test@test.local');
      await page.fill('input[type="password"]', 'test123');
      await page.click('button[type="submit"]');
      // Wait for any navigation (could be / or /chats)
      await page.waitForTimeout(5000);
      const currentUrl = page.url();
      if (currentUrl.includes('/chats') || currentUrl === 'http://localhost:5173/') {
        console.log('✅ User A logged in, URL:', currentUrl);
        await page.screenshot({ path: 'test-results/user-a-logged-in.png' });
      } else {
        console.log('❌ User A login failed, URL:', currentUrl);
        throw error;
      }
    }
  });
  
  test('should register user B', async ({ page }) => {
    await page.goto('http://localhost:5173/auth');
    
    // Click registration tab
    await page.click('button:has-text("Регистрация")');
    await page.waitForTimeout(500);
    
    // Fill registration form
    await page.fill('input[placeholder*="Иванов"]', 'Test User B');
    await page.fill('input[type="email"]', 'test1@test.local');
    await page.fill('input[type="password"]', 'test123');
    
    // Submit
    await page.click('button:has-text("Создать аккаунт")');
    
    // Wait for redirect
    try {
      await page.waitForURL('**/chats', { timeout: 10000 });
      console.log('✅ User B registered successfully');
      await page.screenshot({ path: 'test-results/user-b-registered.png' });
    } catch (error) {
      // Might already exist - try to login
      console.log('⚠️  User B might already exist, trying login...');
      await page.goto('http://localhost:5173/auth');
      await page.click('button:has-text("Вход")');
      await page.waitForTimeout(500);
      await page.fill('input[type="email"]', 'test1@test.local');
      await page.fill('input[type="password"]', 'test123');
      await page.click('button[type="submit"]');
      // Wait for any navigation (could be / or /chats)
      await page.waitForTimeout(5000);
      const currentUrl = page.url();
      if (currentUrl.includes('/chats') || currentUrl === 'http://localhost:5173/') {
        console.log('✅ User B logged in, URL:', currentUrl);
        await page.screenshot({ path: 'test-results/user-b-logged-in.png' });
      } else {
        console.log('❌ User B login failed, URL:', currentUrl);
        throw error;
      }
    }
  });
});
