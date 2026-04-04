const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('--- НАЧАЛО ТЕСТА ---');
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[БРАУЗЕР] ❌ ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log('1. Вход...');
    await page.fill('input[type="email"]', 'diage2x@gmail.com');
    await page.fill('input[type="password"]', 'G7Ws7QnB');
    await page.click('button[type="submit"]');
    
    // Ждем появления списка чатов
    await page.waitForSelector('[class*="chat-item"], [class*="ChatListItem"]', { timeout: 15000 });
    console.log('✅ Авторизация пройдена, чаты загружены');

    const sections = ['Личные', 'Команды', 'Архив'];
    for (const section of sections) {
      const tab = page.getByText(section).first();
      if (await tab.isVisible()) {
        await tab.click();
        console.log(`📍 Переход в раздел: ${section}`);
        await page.waitForTimeout(1000);
      }
    }

    console.log('3. Проверка конкретного чата...');
    const firstChat = page.locator('[class*="chat-item"], [class*="ChatListItem"]').first();
    await firstChat.click();
    console.log('✅ Чат открыт успешно');

  } catch (err) {
    console.log('❌ ОШИБКА ПРИ ТЕСТИРОВАНИИ:', err.message);
  } finally {
    await browser.close();
    console.log('--- ТЕСТ ЗАВЕРШЕН ---');
  }
})();