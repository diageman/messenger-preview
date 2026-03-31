# PLAYWRIGHT VISUAL VERIFICATION

## ✅ ЧТО Я МОГУ ПРОВЕРИТЬ САМ

Я запустил Playwright браузер и **сделал скриншоты**:

### Скриншот 1: Auth page
**Файл:** `test-results/01-auth-page.png`

**Что видно:**
- ✅ Форма входа
- ✅ Email input
- ✅ Password input
- ✅ Кнопка "Войти"

### Скриншот 2: Login error
**Файл:** `test-results/02-login-error.png`

**Что видно:**
- ❌ Логин не прошёл (нет реального пользователя anna@taxiline.local)

---

## 📁 ГДЕ СКРИНШОТЫ И ВИДЕО

**Папка:** `test-results/`

**Файлы:**
- `01-auth-page.png` — Auth страница
- `02-login-error.png` — Ошибка логина
- `visual-verification-.../` — Видео теста (.webm)

**Открыть видео:**
```bash
# Windows
start test-results\visual-verification-...\video.webm

# Или просто открой папку
explorer test-results
```

---

## 🎥 КАК ЗАПУСТИТЬ С ВОЗМОЖНОСТЬЮ ЛОГИНА

### Вариант 1: Создать тестового пользователя

**1. Зарегистрируйся через UI:**
```
1. Открой http://localhost:5173/auth
2. Кликни "Регистрация"
3. Введи:
   - Name: Test User
   - Email: test@test.local
   - Password: test123
4. Запомни credentials
```

**2. Создай `.env.local`:**
```env
USER_A_EMAIL=test@test.local
USER_A_PASSWORD=test123
```

**3. Запусти полный тест:**
```bash
npx playwright test messenger --reporter=list
```

---

### Вариант 2: Ручная проверка с видео

**1. Открой браузер:**
```bash
npx playwright open
```

**2. Вручную зайди на:**
```
http://localhost:5173
```

**3. Пройди тесты руками из `BROWSER_VERIFICATION.md`**

**4. Я запишу видео сессии** (если нужно)

---

## 📊 АВТОМАТИЧЕСКИЕ ПРОВЕРКИ

Когда запускаешь `npx playwright test messenger`, я проверяю:

| Check | Automated | Evidence |
|-------|-----------|----------|
| **Auth page loads** | ✅ | Screenshot + DOM check |
| **Login works** | ✅ | URL change |
| **Chat list loads** | ✅ | DOM elements |
| **Incoming latency** | ✅ | Timestamp diff <3s |
| **Chat sync** | ✅ | Text comparison |
| **Active chat flicker** | ✅ | 15s wait + count |
| **Chat list flicker** | ✅ | Count >0 |
| **Identity consistency** | ✅ | Text match |
| **Unread badge** | ✅ | Visible/not visible |
| **Autoscroll** | ✅ | Scroll position check |

---

## 🎯 СЛЕДУЮЩИЙ ШАГ

**Если хочешь чтобы я всё проверил сам:**

1. **Создай тестового пользователя** (см. Вариант 1 выше)

2. **Создай `.env.local`** с credentials

3. **Запусти:**
   ```bash
   npx playwright test messenger --reporter=list
   ```

4. **Я получу полный отчёт** со:
   - Скриншотами
   - Видео
   - Timing metrics
   - Pass/fail по каждому чеку

**Или открой HTML отчёт:**
```bash
npx playwright test --reporter=html
npx playwright show-report
```

---

## 📸 ТЕКУЩИЕ РЕЗУЛЬТАТЫ

```
✅ Auth page loads
✅ Email input visible
✅ Password input visible  
✅ Sign in button visible
❌ Login failed (no real user)
```

**Скриншоты в:** `test-results/`
**Видео в:** `test-results/visual-verification-.../`
