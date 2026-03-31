# E2E TESTING GUIDE

## Playwright Setup (ГОТОВО)

✅ Playwright установлен
✅ Chromium браузер загружен
✅ Конфигурация создана
✅ Smoke test проходит

---

## ЗАПУСК ТЕСТОВ

### 1. Быстрый smoke test (без credentials)

```bash
cd c:\Users\Дмитрий\Desktop\Приложения\Мессенджер
npx playwright test smoke --reporter=list
```

**Что проверяет:**
- ✅ Auth page загружается
- ✅ Кнопки "Вход"/"Регистрация" видны

---

### 2. Полный E2E test (с credentials)

**Настрой переменные окружения:**

Создай файл `.env.local` в корне проекта:

```env
APP_URL=http://localhost:5173
USER_A_EMAIL=user1@test.local
USER_A_PASSWORD=test123
USER_B_EMAIL=user2@test.local
USER_B_PASSWORD=test123
```

**Замени на реальные credentials двух пользователей!**

**Запусти тест:**

```bash
npx playwright test messenger --reporter=list
```

**Или с UI:**

```bash
npx playwright test --ui
```

**Или с отчётом:**

```bash
npx playwright test --reporter=html
npx playwright show-report
```

---

## ЧТО ПРОВЕРЯЕТ messenger.spec.ts

| Test | Description |
|------|-------------|
| **Incoming realtime latency** | Сообщение появляется <3s |
| **Chat list vs active chat sync** | Одинаковое содержимое |
| **Active chat flicker** | Нет мигания 15s |
| **Chat list flicker** | Нет исчезновения |
| **Identity consistency** | Имя в list = имя в header |
| **Unread badge** | Появляется/исчезает |
| **Autoscroll** | Автопрокрутка вниз |

---

## РУЧНАЯ ПРОВЕРКА (если нет тестовых credentials)

Открой `BROWSER_VERIFICATION.md` и следуй инструкции.

---

## ИНТЕРПРЕТАЦИЯ РЕЗУЛЬТАТОВ

### ✅ PASS

```
✓ should show instant message delivery (15.2s)
```

**Вывод:** Все 7 проверок прошли.

### ❌ FAIL

```
✗ should show instant message delivery (5.1s)

Error: expect(received).toBeLessThan(expected)
Expected: < 3000
Received:   5100
```

**Вывод:** Message latency >3s → realtime broken.

---

## DEBUG MODE

**Запусти с debug log:**

```bash
npx playwright test messenger --debug
```

**Запусти один тест:**

```bash
npx playwright test messenger --grep "Incoming realtime"
```

**Запусти с конкретным браузером:**

```bash
npx playwright test messenger --project=chromium
```

---

## TROUBLESHOOTING

### "Timeout waiting for app"

```bash
# Start dev server first
pnpm dev:web

# Then run tests
npx playwright test
```

### "No elements found"

Проверь selectors в `tests/messenger.spec.ts` - возможно изменились классы.

### "Credentials invalid"

Проверь `.env.local` - credentials должны быть реальными пользователями из Supabase.

---

## NEXT STEPS

После успешного теста:

1. **Запусти полный прогон:**
   ```bash
   npx playwright test --reporter=html
   npx playwright show-report
   ```

2. **Проверь отчёт:**
   - Скриншоты на failure
   - Video на retry
   - Timing metrics

3. **Зафиксируй результаты:**
   ```
   Check                          | Result | Notes
   -------------------------------|--------|---------------------------
   Incoming realtime latency      | ✅     | 234ms
   Chat list vs active chat sync  | ✅     | одновременно
   Active chat flicker            | ✅     | нет мигания
   Chat list flicker              | ✅     | нет мигания
   Identity consistency           | ✅     | совпадает
   Unread badge                   | ✅     | работает
   Autoscroll                     | ✅     | работает
   ```

---

## ГОТОВО К DEPLOY

Если все тесты прошли → messenger готов к production deploy.
