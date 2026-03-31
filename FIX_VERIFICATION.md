# MESSAGE DISAPPEARANCE FIX - VERIFICATION

## ROOT CAUSE (FIXED)

**Проблема:** `fetchMessages()` делал `setMessages(data)` — ЗАМЕНЯЛ весь массив сообщений.

**Сценарий:**
```
1. User отправляет сообщение → optimistic append ✅
2. Сообщение видно в active chat ✅
3. Component remounts (navigation) → useEffect runs
4. fetchMessages() → setMessages(DB data) ❌
5. DB data не включает только что отправленное (latency)
6. Сообщение исчезает ❌
```

**Fix:** MERGE strategy — keep existing messages, add missing from DB.

---

## MANUAL CHECKLIST (Deployed Version)

**URL:** https://messendzher.vercel.app

### Тест 1: Message persistence after send

**Шаги:**
1. Открой https://messendzher.vercel.app
2. Залогинься
3. Открой direct chat
4. Отправь сообщение "Test 1"

**Ожидай:**
- [ ] Сообщение появляется сразу (<100ms)
- [ ] Видно в active chat
- [ ] Видно в chat list preview

**Подожди 10-15 секунд:**
- [ ] Сообщение НЕ исчезает
- [ ] Остаётся в active chat
- [ ] Остаётся в chat list

**Обнови страницу (F5):**
- [ ] Сообщение остаётся после reload
- [ ] Не нужно отправлять снова

---

### Тест 2: Incoming message stability

**Шаги:**
1. Browser A: открой direct chat
2. Browser B: отправь сообщение "Test 2"
3. Browser A: смотри на active chat

**Ожидай:**
- [ ] Сообщение появляется в Browser A (<3s)
- [ ] Видно в active chat
- [ ] Видно в chat list preview

**Подожди 10-15 секунд:**
- [ ] Сообщение НЕ исчезает
- [ ] Остаётся в active chat

**Browser A: обнови страницу (F5):**
- [ ] Сообщение остаётся после reload

---

### Тест 3: Chat list vs active chat sync

**Шаги:**
1. Browser A: открой direct chat
2. Browser B: отправь сообщение "Test 3"
3. Browser A: смотри одновременно на:
   - Chat list (слева)
   - Active chat (справа)

**Ожидай:**
- [ ] Сообщение появляется в chat list
- [ ] Сообщение появляется в active chat
- [ ] Одинаковое содержимое в обоих местах
- [ ] Нет рассинхрона

---

### Тест 4: Multiple messages rapid fire

**Шаги:**
1. Открой direct chat
2. Быстро отправь 3 сообщения:
   - "Rapid 1"
   - "Rapid 2"
   - "Rapid 3"

**Ожидай:**
- [ ] Все 3 появляются сразу
- [ ] Все 3 видны в active chat
- [ ] Все 3 видны в chat list
- [ ] Нет дубликатов
- [ ] Нет исчезновений

**Подожди 15 секунд:**
- [ ] Все 3 сообщения остаются
- [ ] Нет исчезновений после polling

**Обнови страницу (F5):**
- [ ] Все 3 сообщения persist
- [ ] Порядок сохранён

---

### Тест 5: Navigation + message persistence

**Шаги:**
1. Открой direct chat
2. Отправь сообщение "Navigation test"
3. Убедись что видно
4. Кликни на другой чат в списке
5. Вернись на original чат

**Ожидай:**
- [ ] Сообщение остаётся после navigation
- [ ] Не нужно отправлять снова
- [ ] Messages не cleared при switch

---

## SUCCESS CRITERIA

Все тесты должны пройти:

```
Test                          | Pass | Fail | Notes
------------------------------|------|------|-------
Message persistence           |      |      |
Incoming message stability    |      |      |
Chat list vs active chat sync |      |      |
Multiple messages rapid fire  |      |      |
Navigation + persistence      |      |      |
```

**Если хотя бы один FAIL:**
1. Запиши exact symptom
2. Открой консоль (F12)
3. Скопируй errors
4. Покажи скриншот

---

## DEPLOY INSTRUCTIONS

После локального фикса:

```bash
# 1. Build
cd c:\Users\Дмитрий\Desktop\Приложения\Мессенджер
pnpm build:web

# 2. Deploy to Vercel
vercel --prod

# 3. Wait for deploy to complete
# 4. Open https://messendzher.vercel.app
# 5. Run manual tests above
```

---

## TECHNICAL DETAILS

**Fixed code:**
```typescript
// OLD (broken):
setMessages(messagesWithOwn);  // REPLACE entire array

// NEW (fixed):
setMessages((prev) => {
  if (!prev || prev.length === 0) {
    return messagesWithOwn;
  }
  
  // Keep existing messages
  const existingIds = new Set(prev.map(m => m.id));
  
  // Add only missing from DB
  const newMessages = messagesWithOwn.filter(m => !existingIds.has(m.id));
  
  // Merge and sort
  const combined = [...prev, ...newMessages];
  combined.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  return combined;
});
```

**Why it works:**
- Optimistic messages stay in state
- DB fetch adds missing messages
- No destructive replace
- Messages persist across remounts
