# Fix для create_direct_chat

## Проблема

Функция `create_direct_chat()` не может создать chat_members из-за RLS.

**Симптом:**
- Контакты отображаются ✅
- Кнопка "Чат" нажимается ✅
- RPC вызов возвращается с ошибкой или null ❌
- Чат не создаётся ❌

**Root cause:**
RLS policy на `chat_members` разрешает только SELECT (`chat_members_visible`), но не INSERT.

Функция `create_direct_chat` использует `SECURITY DEFINER`, но INSERT в `chat_members` блокируется RLS.

---

## Решение

Выполни этот SQL в Supabase Dashboard → SQL Editor:

```sql
-- Add INSERT policy for chat_members
DROP POLICY IF EXISTS chat_members_insert ON chat_members;

CREATE POLICY chat_members_insert ON chat_members FOR INSERT
  WITH CHECK (true);
```

---

## Проверка после fix

1. Открой http://localhost:5173/contacts
2. Выбери сотрудника
3. Нажми "Чат"
4. **Ожидай:**
   - Создание чата
   - Redirect на /chats
   - Чат отображается в списке
   - Можно открыть и отправить сообщение

---

## Diagnostic script

Для диагностики запусти:

```bash
node scripts/diagnose-direct-chat.js
```

Покажет:
- Список профилей
- Список организаций
- Существующие чаты
- Результат тестового RPC вызова
