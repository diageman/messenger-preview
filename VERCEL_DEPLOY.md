# VERCEL DEPLOY GUIDE

## Quick Deploy (5 минут)

### 1. Push to GitHub

```bash
# В корне проекта
git init
git add .
git commit -m "MVP ready for preview deploy"
git remote add origin https://github.com/YOUR_USERNAME/messenger-preview.git
git push -u origin main
```

### 2. Vercel Setup

1. Открой https://vercel.com/new
2. Нажми **"Import Git Repository"**
3. Выбери репозиторий: `messenger-preview`
4. Нажми **"Import"**

### 3. Configure in Vercel

**Settings → Build & Development Settings:**

| Setting | Value |
|---------|-------|
| **Root Directory** | `./` (оставить пустым) |
| **Build Command** | `pnpm --filter web build` |
| **Output Directory** | `apps/web/dist` |
| **Install Command** | `pnpm install` |

**Settings → Environment Variables:**

Добавь 2 переменные:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://tvzzgivzkdswfrrjprlz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (полный ключ из .env) |

### 4. Deploy

1. Нажми **"Deploy"**
2. Жди ~2-3 минуты
3. Получишь URL: `https://messenger-preview-xxxx.vercel.app`

---

## Manual Deploy (без GitHub)

```bash
# 1. Установи Vercel CLI
npm i -g vercel

# 2. Залогинься
vercel login

# 3. Deploy
cd c:\Users\Дмитрий\Desktop\Приложения\Мессенджер
vercel --prod
```

Vercel спросит:
- **Set up and deploy?** → Yes
- **Which scope?** → Выбери свой аккаунт
- **Link to existing project?** → No
- **What's your project's name?** → messenger-preview
- **In which directory is your code located?** → `./`
- **Want to override settings?** → No

Потом добавь env vars через Vercel Dashboard.

---

## Post-Deploy Checklist

```
[ ] 1. Открыть production URL
[ ] 2. Кликнуть "Регистрация"
[ ] 3. Ввести:
       Name: Тестовый Пользователь
       Email: test@test.local
       Password: test123
[ ] 4. Проверить: redirect на /chats
[ ] 5. Открыть второй браузер
[ ] 6. Зарегистрировать второго пользователя
[ ] 7. Контакты → должны видеть друг друга
[ ] 8. Создать direct chat
[ ] 9. Отправить сообщение
[ ] 10. Проверить: приходит без F5
[ ] 11. Проверить: unread badge работает
[ ] 12. F5: session восстанавливается
```

---

## Troubleshooting

**Build failed:**
```
→ Проверь: pnpm --filter web build локально работает?
→ Проверь: все packages установлены?
→ Проверь: node_modules в .gitignore?
```

**Blank page after deploy:**
```
→ Проверь: Environment Variables добавлены в Vercel
→ Проверь: VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
→ Проверь: Supabase проект доступен публично
```

**404 на роутах:**
```
→ vercel.json уже настроен с rewrites
→ Проверь: vercel.json закоммичен и отправлен
```

**Realtime не работает:**
```
→ Проверь: Supabase Realtime enabled для messages table
→ Dashboard → Database → Replication → Source
```

---

## Current Project Structure (VERIFIED)

```
messenger/
├── apps/
│   ├── web/                    # ✅ DEPLOY THIS
│   │   ├── dist/               # Build output
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── desktop/                # ❌ Ignore for web deploy
│   └── mobile/                 # ❌ Ignore for web deploy
├── packages/                   # ✅ Auto-built by pnpm
│   ├── ui/
│   ├── shared/
│   ├── theme/
│   └── features/
├── vercel.json                 # ✅ Deploy config
├── package.json                # ✅ Root scripts
└── pnpm-workspace.yaml         # ✅ Workspace config
```

---

## Build Verification

**Local build test:**
```bash
cd c:\Users\Дмитрий\Desktop\Приложения\Мессенджер
pnpm build:web
# ✅ Should complete in ~3s
# Output: apps/web/dist/
```

**Current status:**
- ✅ Typecheck: passed
- ✅ Build: passed (2.79s)
- ✅ Output directory: `apps/web/dist`
- ✅ vercel.json created
- ✅ Env vars configured

---

## Next Steps

1. **Push to GitHub** (Section 1)
2. **Deploy on Vercel** (Section 2-3)
3. **Run Post-Deploy Checklist** (Section 4)
4. **Report any blockers**

**READY FOR PREVIEW DEPLOY** 🚀
