const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- ЗАПУСК АУДИТА ---');

  // Ловим ошибки консоли
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER-ERROR] ${msg.text()}`);
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    console.log('1. Авторизация...');
    await page.fill('input[type="email"]', 'diage2x@gmail.com');
    await page.fill('input[type="password"]', 'G7Ws7QnB');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/', { timeout: 10000 });
    console.log('✅ Вход выполнен успешно');

    const sections = ['Личные', 'Команды', 'Архив'];
    for (const section of sections) {
      console.log(`2. Проверка раздела: ${section}`);
      const tab = page.getByText(section).first();
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(1000);
      } else {
        console.log(`⚠️ Раздел ${section} не найден на странице`);
      }
    }

    console.log('3. Проверка открытия чата...');
    const chat = page.locator('[class*="chat-item"], [class*="ChatListItem"]').first();
    if (await chat.isVisible()) {
      await chat.click();
      console.log('✅ Чат открыт');
      await page.waitForTimeout(1000);
    }

    console.log('--- АУДИТ ЗАВЕРШЕН ---');

  } catch (err) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТА:', err.message);
  } finally {
    await browser.close();
  }
})();