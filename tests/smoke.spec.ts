import { test, expect } from '@playwright/test';

test.describe('Messenger - Quick Smoke Test', () => {
  test('should load app and show auth page', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Check auth page loads
    await expect(page.getByRole('heading', { name: 'Мессенджер' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Вход в систему')).toBeVisible();
    await expect(page.getByText('Регистрация')).toBeVisible();
    
    console.log('✅ Auth page loaded');
  });
  
  test('should show chat list after login', async ({ page }) => {
    // Skip if no test credentials
    test.skip(!process.env.USER_A_EMAIL, 'No test credentials configured');
    
    await page.goto('http://localhost:5173/auth');
    
    // Login
    await page.fill('input[type="email"]', process.env.USER_A_EMAIL || '');
    await page.fill('input[type="password"]', process.env.USER_A_PASSWORD || '');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to chats
    await page.waitForURL('**/chats', { timeout: 10000 });
    
    // Check chat list loads
    await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Диалоги')).toBeVisible();
    
    console.log('✅ Chat list loaded');
  });
});
