# 🔍 Аудит и полная починка системы реакций

## Дата: 9 апреля 2026 (финальная версия)

---

## ✅ РЕЗУЛЬТАТ: ВСЕ 7 E2E ТЕСТОВ ПРОШЛИ

```
✅ 1. Optimistic INSERT — реакция появляется мгновенно после клика
✅ 2. Optimistic DELETE — реакция исчезает БЕЗ перезагрузки страницы (F5)
✅ 3. SSE INSERT simulation — чужая реакция через applySseReaction
✅ 4. SSE DELETE simulation — чужая реакция удаляется через applySseReaction
✅ 5. Reaction limit (2) — 3-я реакция заменяет oldest
✅ 6. Realtime INSERT между ДВУМЯ пользователями — User A ставит → User B видит
✅ 7. Realtime DELETE между ДВУМЯ пользователями — User A удаляет → User B не видит

7 passed (1.8m)
```

---

## 🔧 Внесённые изменения

### 1. Zustand store: `apps/web/src/stores/useMessageUIStore.ts`
- ✅ Добавлено детальное логирование `[SSE Reaction]` и `[Reaction]`
- ✅ Добавлен `reactionIdCache: Record<string, {messageId, userId, emoji}>` — кэш для DELETE без REPLICA IDENTITY FULL
- ✅ ReactionItem теперь содержит `dbIds?: string[]` — IDs записей из БД
- ✅ `loadReactions()` загружает `id, user_id, emoji` и заполняет кэш
- ✅ `applySseReaction()` корректно обрабатывает INSERT/DELETE с логированием
- ✅ `_flushToggle()` логирует успех/ошибку upsert/delete

### 2. Supabase Realtime подписка: `apps/web/src/stores/useChatStore.ts`
- ✅ INSERT: после applySseReaction вызывается `loadReactions()` для обновления кэша
- ✅ DELETE: использует `reactionIdCache` для восстановления данных (костыль без REPLICA IDENTITY FULL)
- ✅ Добавлено логирование всех SSE событий
- ✅ Добавлен callback статуса подписки

### 3. UI компонент: `apps/web/src/components/MessageBubble/MessageBubble.tsx`
- ✅ Добавлен `data-reaction-emoji={r.emoji}` атрибут к reaction pill

### 4. ChatWindow: `apps/web/src/components/ChatWindow.tsx`
- ✅ Обёртка `<div data-message-id={message.id}>` вокруг MessageBubble для E2E тестов

### 5. SQL миграция: `supabase/migrations/20260409_fix_reactions_realtime.sql`
```sql
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime SET (publish = 'insert,update,delete');
```

### 6. E2E тесты
- ✅ `tests/reaction-sync.spec.ts` — 5 тестов (optimistic, SSE simulation, limit)
- ✅ `tests/reaction-realtime-twotabs.spec.ts` — 2 теста (реальный realtime между пользователями)

---

## 📝 Важно для production

### КОСТИЛЬ (работает сейчас):
Без `REPLICA IDENTITY FULL`, DELETE event от Supabase содержит только `{id: "..."}`.
Решение: после каждого INSERT SSE — вызывается `loadReactions()` который обновляет `reactionIdCache`.
При DELETE — данные восстанавливаются из кэша по id.

### ПРАВИЛЬНОЕ РЕШЕНИЕ:
Выполните SQL в Supabase Dashboard:
```sql
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
```
После этого DELETE events будут содержать полные данные и костыль с кэшем не понадобится.

---

## 🏗 Архитектура работы

### INSERT реакция:
1. User кликает → `toggleReaction()` → optimistic update (мгновенно)
2. Debounce 300мс → `_flushToggle()` → upsert в БД
3. Supabase Realtime → INSERT event всем подписчикам
4. User B: `applySseReaction()` → `loadReactions()` → обновление кэша
5. UI ререндерится через Zustand реактивность

### DELETE реакция:
1. User кликает на pill → `toggleReaction()` → optimistic removal (мгновенно)
2. Debounce 300мс → `_flushToggle()` → delete из БД
3. Supabase Realtime → DELETE event (содержит только id)
4. User B: ищет id в `reactionIdCache` → находит данные → `applySseReaction('DELETE')`
5. UI ререндерится — реакция исчезает БЕЗ F5

---

## 🧪 Запуск тестов

```bash
# Все тесты реакций
npx playwright test reaction-sync.spec.ts reaction-realtime-twotabs.spec.ts

# Только realtime между пользователями
npx playwright test reaction-realtime-twotabs.spec.ts

# Только локальные тесты (один пользователь)
npx playwright test reaction-sync.spec.ts
```
