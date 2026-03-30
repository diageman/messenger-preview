# SUPABASE SETUP GUIDE

## 1. Создание проекта

1. Перейди на https://supabase.com
2. Нажми "Start your project" или "New Project"
3. Заполни:
   - **Organization**: Выбери или создай новую
   - **Project name**: `messenger-taxipark` (или любое другое)
   - **Database password**: Запомни или сохрани в менеджере паролей
   - **Region**: Выбери ближайшую к тебе (Europe - Frankfurt для РФ)
4. Нажми "Create new project"

⏱️ Создание проекта займёт 2-5 минут

---

## 2. Получение credentials

После создания проекта:

1. Перейди в **Settings** (шестерёнка внизу слева)
2. Выбери **API** в меню
3. Скопируй два значения:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 3. Настройка .env файла

Открой файл `apps/web/.env` и вставь свои значения:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Важно**: 
- Используй именно `anon` key, не `service_role` key
- `anon` key безопасен для client-side использования (RLS защищает данные)

---

## 4. Выполнение миграции базы данных

### Вариант A: Через Supabase Dashboard (рекомендуется)

1. В Supabase Dashboard перейди в **SQL Editor** (левое меню)
2. Нажми **New query**
3. Скопируй содержимое файла `supabase/migrations/001_phase1a_core.sql`
4. Вставь в SQL Editor
5. Нажми **Run** (или Ctrl+Enter / Cmd+Enter)
6. Проверь что все таблицы создались без ошибок

### Вариант B: Через Supabase CLI (для продвинутых)

```bash
# Установи Supabase CLI
npm install -g supabase

# Залогинься
supabase login

# Привяжи проект
supabase link --project-ref xxxxxxxxxxxxxxx

# Примени миграции
supabase db push
```

---

## 5. Создание первого пользователя

### Через Dashboard:

1. Перейди в **Authentication** → **Users**
2. Нажми **Add user** → **Create new user**
3. Заполни:
   - **Email**: `anna@taxiline.local`
   - **Password**: `demo123`
   - **Auto Confirm User**: ✅ Включи (для dev-среды)
4. Нажми **Create user**

### Через SQL (альтернатива):

```sql
-- Создадим тестового пользователя через auth.users
-- Примечание: в production используй Dashboard или API

-- Сначала создадим organization
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Таксопарк "Линия"', 'taxi-line');

-- Создадим профиль для пользователя
-- User ID получишь после создания через Dashboard
INSERT INTO profiles (id, organization_id, full_name, role, email, status)
VALUES (
  'USER_ID_ИЗ_AUTH',  -- Замени на ID из Authentication → Users
  '00000000-0000-0000-0000-000000000001',
  'Анна Петрова',
  'Старший оператор',
  'anna@taxiline.local',
  'online'
);
```

---

## 6. Проверка подключения

После настройки:

1. Запусти приложение:
   ```bash
   pnpm dev:web
   ```

2. Открой http://localhost:5173

3. Должна открыться страница `/auth`

4. Введи credentials:
   - Email: `anna@taxiline.local`
   - Password: `demo123`

5. Если всё настроено правильно — произойдёт вход и редирект на главную

---

## 7. Troubleshooting

### Ошибка: "Invalid API key"
- Проверь что используешь `anon` key, не `service_role`
- Проверь что ключ скопирован полностью (без пробелов)

### Ошибка: "Email not confirmed"
- В Dashboard: Authentication → Users → найди пользователя → три точки → Confirm user
- Или создай нового с галочкой "Auto Confirm User"

### Ошибка: "Row Level Security policy violation"
- Проверь что миграции выполнились успешно
- Проверь что пользователь принадлежит к организации
- Проверь что RLS policies созданы корректно

### Ошибка: "Missing environment variables"
- Проверь что `.env` файл в `apps/web/.env`
- Проверь что переменные называются точно `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
- Перезапусти dev server после изменения .env

---

## 8. Следующие шаги

После успешной настройки:

1. ✅ Phase 1A завершена
2. ⏭️ Phase 2: Chats & Messages
3. ⏭️ Phase 3: Realtime subscriptions
4. ⏭️ Phase 4: Attachments & Storage

---

## 9. Полезные ссылки

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Discord](https://discord.supabase.com)
