# PHASE 1 QUICK REFERENCE

## Setup Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Setup .env file
# Edit apps/web/.env with your Supabase credentials

# 3. Test connection
pnpm supabase:test

# 4. Run migrations (via Supabase Dashboard)
# Copy supabase/migrations/001_phase1a_core.sql to SQL Editor

# 5. Seed demo data
pnpm supabase:seed

# 6. Start development
pnpm dev:web
```

---

## File Structure

```
мессенджер/
├── apps/
│   └── web/
│       ├── .env                    # Supabase credentials
│       ├── .env.example            # Template
│       └── src/
│           ├── lib/
│           │   └── supabase.ts     # Supabase client
│           ├── hooks/
│           │   └── auth/
│           │       └── useAuth.tsx # Auth hook
│           └── pages/
│               └── AuthPage.tsx    # Login page
├── scripts/
│   ├── test-supabase.js            # Connection test
│   └── seed-demo-data.js           # Demo data seed
├── supabase/
│   └── migrations/
│       └── 001_phase1a_core.sql    # Database schema
├── SUPABASE_SETUP.md               # Setup guide
└── PHASE1_QUICKREF.md              # This file
```

---

## Environment Variables

```env
# apps/web/.env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Database Tables (Phase 1A)

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenancy |
| `profiles` | User profiles |
| `departments` | Organizational structure |
| `department_members` | Department membership |
| `user_settings` | User preferences |
| `user_presence` | Online status |

---

## Auth Flow

```
1. User enters email/password
   ↓
2. useAuth.signIn() calls supabase.auth.signInWithPassword()
   ↓
3. Supabase returns session + JWT
   ↓
4. AuthProvider stores session in context
   ↓
5. fetchProfile() gets user profile from database
   ↓
6. Redirect to / (protected route)
```

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `AuthProvider` | Context provider for auth state |
| `useAuth` | Hook for auth state and actions |
| `AuthPage` | Login form |
| `ProtectedRoute` | Route guard |

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Invalid API key | Use `anon` key, not `service_role` |
| Email not confirmed | Enable "Auto Confirm User" in Dashboard |
| RLS policy violation | Check user belongs to organization |
| Missing env vars | Check `.env` file exists and has correct names |

---

## Next Steps (Phase 1B)

1. ✅ Create Supabase project
2. ✅ Copy credentials to `.env`
3. ✅ Run migration SQL
4. ✅ Create test user
5. ✅ Run `pnpm supabase:test`
6. ✅ Run `pnpm supabase:seed`
7. ✅ Test login at `http://localhost:5173/auth`

---

## Next Steps (Phase 2)

After Phase 1 is working:

1. Create chats tables
2. Create messages tables
3. Implement chat CRUD
4. Implement message send/receive
5. Add realtime subscriptions
