const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('--- ФИНАЛЬНЫЙ ВИЗУАЛЬНЫЙ АУДИТ ---');

  try {
    await page.goto('http://localhost:5180/auth');
    await page.fill('input[type="email"]', 'diage2x@gmail.com');
    await page.fill('input[type="password"]', 'G7Ws7QnB');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('http://localhost:5180/', { timeout: 10000 });
    console.log('✅ Вход в систему выполнен');

    // Ждем, пока исчезнет лоадер
    console.log('Ждем завершения загрузки чатов...');
    await page.waitForFunction(() => !document.body.innerText.includes('Загрузка'), { timeout: 15000 });
    
    // Собираем всё, что похоже на кнопки навигации
    const navElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, [role="tab"]'))
        .map(el => ({
          text: el.innerText.trim(),
          tag: el.tagName,
          visible: el.offsetWidth > 0
        }))
        .filter(el => el.text.length > 0);
    });

    console.log('Найденные элементы навигации:', JSON.stringify(navElements, null, 2));

    // Проверка наличия чатов в списке
    const chatCount = await page.evaluate(() => document.querySelectorAll('[class*="chat-item"], [class*="ChatListItem"]').length);
    console.log(`Количество чатов в списке: ${chatCount}`);

  } catch (err) {
    console.error('❌ ОШИБКА:', err.message);
  } finally {
    await browser.close();
    console.log('--- АУДИТ ЗАВЕРШЕН ---');
  }
})();