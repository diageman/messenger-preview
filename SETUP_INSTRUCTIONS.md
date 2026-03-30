# Инструкция по настройке базы данных

## Проблема
RLS (Row Level Security) блокирует вставку данных без аутентификации. Это правильное поведение для production, но требует ручного создания начальных данных через Dashboard.

---

## Решение (5 минут)

### Шаг 1: Выполнить миграцию 002 (чаты и сообщения)

1. Открой https://app.supabase.com/project/_/sql
2. Открой файл проекта: `supabase/migrations/002_phase2_chats.sql`
3. Скопируй всё содержимое файла
4. Вставь в SQL Editor в браузере
5. Нажми **Run** (или Ctrl+Enter)
6. Дождись сообщения об успехе

**Проверка:**
```bash
node scripts/check-schema.js
```
Должно показать: ✅ chats, ✅ chat_members, ✅ messages, ✅ attachments

---

### Шаг 2: Создать пользователя

1. Открой https://app.supabase.com/project/_/auth/users
2. Нажми **Add user** → **Create new user**
3. Заполни:
   - **Email**: `anna@taxiline.local`
   - **Password**: `demo123`
   - **Auto Confirm User**: ✅ ВКЛЮЧИ
4. Нажми **Create user**
5. Скопируй **User ID** (UUID вида `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

---

### Шаг 3: Создать организацию

В SQL Editor выполни:
```sql
INSERT INTO organizations (id, name, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Таксопарк "Линия"',
  'taxi-line'
);
```

---

### Шаг 4: Создать профиль пользователя

В SQL Editor выполни (замени USER_ID на скопированный ID):
```sql
INSERT INTO profiles (id, organization_id, full_name, role, email, status)
VALUES (
  'USER_ID_ИЗ_ШАГА_2',  -- Вставь ID пользователя
  '00000000-0000-0000-0000-000000000001',
  'Анна Петрова',
  'Оператор',
  'anna@taxiline.local',
  'online'
);
```

---

### Шаг 5: Создать департаменты

В SQL Editor выполни:
```sql
INSERT INTO departments (organization_id, name, description)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Диспетчерская служба', 'Приём и обработка заказов'),
  ('00000000-0000-0000-0000-000000000001', 'Бухгалтерия', 'Финансовый учёт и расчёты'),
  ('00000000-0000-0000-0000-000000000001', 'HR-отдел', 'Подбор и адаптация сотрудников'),
  ('00000000-0000-0000-0000-000000000001', 'IT-отдел', 'Техническая поддержка и разработка'),
  ('00000000-0000-0000-0000-000000000001', 'Поддержка', 'Работа с обращениями клиентов');
```

---

### Шаг 6: Проверка

Запусти:
```bash
node scripts/check-db-state.js
```

Должно показать:
- ✅ Организации: Таксопарк "Линия"
- ✅ Профили: Анна Петрова
- ✅ Департаменты: 5 штук

---

### Шаг 7: Запуск приложения

```bash
pnpm dev:web
```

Открой http://localhost:5173

Войди:
- Email: `anna@taxiline.local`
- Password: `demo123`

---

## Быстрая проверка (SQL)

После всех шагов выполни в SQL Editor:
```sql
SELECT 
  p.full_name,
  p.email,
  p.role,
  o.name as organization,
  COUNT(DISTINCT d.id) as departments
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN departments d ON d.organization_id = o.id
WHERE p.email = 'anna@taxiline.local'
GROUP BY p.id, o.id;
```

Должно вернуть:
```
full_name   | email               | role     | organization      | departments
------------|---------------------|----------|-------------------|-------------
Анна Петрова | anna@taxiline.local | Оператор | Таксопарк "Линия" | 5
```

---

## Если что-то пошло не так

### Ошибка: "relation does not exist"
→ Миграция 002 не выполнена. Вернись к Шагу 1.

### Ошибка: "duplicate key value violates unique constraint"
→ Данные уже созданы. Это нормально, продолжай дальше.

### Ошибка: "Invalid login credentials"
→ Проверь email/password. Убедись что пользователь подтверждён (Auto Confirm User был включён).

### Ошибка: "Row Level Security policy violation"
→ Проверь что профиль создан с правильным organization_id и user_id совпадает с ID из Authentication.

---

## Готово!

После успешного входа ты увидишь:
- Страницу чатов (пока пустую)
- Боковую панель навигации
- Возможность создать новый чат

Phase 2 будет полностью готов после создания первого чата.
