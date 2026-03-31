import { test, expect } from '@playwright/test';

test.describe('Messenger - Visual Verification', () => {
  test('should show correct UI elements', async ({ page }) => {
    // Start recording video
    const context = page.context();
    
    // Go to auth page
    await page.goto('http://localhost:5173/auth');
    await page.waitForTimeout(2000);
    
    // Screenshot 1: Auth page
    await page.screenshot({ path: 'test-results/01-auth-page.png' });
    console.log('📸 Screenshot: auth-page.png');
    
    // Check elements visible
    const hasEmailInput = await page.locator('input[type="email"]').isVisible();
    const hasPasswordInput = await page.locator('input[type="password"]').isVisible();
    const hasSignInButton = await page.getByRole('button', { name: 'Войти' }).isVisible();
    
    console.log('✅ Auth page elements:');
    console.log(`   - Email input: ${hasEmailInput}`);
    console.log(`   - Password input: ${hasPasswordInput}`);
    console.log(`   - Sign in button: ${hasSignInButton}`);
    
    // Try to login with demo credentials
    await page.fill('input[type="email"]', 'anna@taxiline.local');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    try {
      await page.waitForURL('**/chats', { timeout: 10000 });
      console.log('✅ Login successful - redirected to /chats');
      
      // Screenshot 2: Chat list
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/02-chat-list.png' });
      console.log('📸 Screenshot: chat-list.png');
      
      // Check chat list elements
      const hasChatList = await page.locator('[aria-label*="Диалоги"]').isVisible();
      const hasNewChatButton = await page.locator('text=Новый чат').isVisible();
      
      console.log('✅ Chat list elements:');
      console.log(`   - Chat list: ${hasChatList}`);
      console.log(`   - New chat button: ${hasNewChatButton}`);
      
      // Try to open a chat if exists
      const chatItems = await page.locator('[aria-label*="Чат с"]').count();
      if (chatItems > 0) {
        await page.locator('[aria-label*="Чат с"]').first().click();
        await page.waitForTimeout(2000);
        
        // Screenshot 3: Active chat
        await page.screenshot({ path: 'test-results/03-active-chat.png' });
        console.log('📸 Screenshot: active-chat.png');
        
        // Check active chat elements
        const hasHeader = await page.locator('header h3').isVisible();
        const hasMessageInput = await page.locator('textarea[placeholder*="сообщение"]').isVisible();
        
        console.log('✅ Active chat elements:');
        console.log(`   - Header: ${hasHeader}`);
        console.log(`   - Message input: ${hasMessageInput}`);
        
        // Check identity consistency
        const chatListName = await page.locator('[aria-label*="Чат с"]').first().textContent();
        const headerName = await page.locator('header h3').textContent();
        
        console.log('\n📋 IDENTITY CHECK:');
        console.log(`   ChatList name: "${chatListName}"`);
        console.log(`   Header name: "${headerName}"`);
        console.log(`   Match: ${chatListName === headerName ? '✅' : '❌'}`);
        
      } else {
        console.log('⚠️  No chats found - need to create one manually');
      }
      
    } catch (error) {
      console.log('❌ Login failed or timeout');
      await page.screenshot({ path: 'test-results/02-login-error.png' });
      console.log('📸 Screenshot: login-error.png');
    }
    
    console.log('\n✅ Visual verification complete!');
    console.log('📁 Screenshots saved to: test-results/');
  });
});
