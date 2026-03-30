# MESSENGER PROJECT CONTEXT

## Project Overview
Corporate messenger for taxi park (таксопарк)
Dark premium UI with yellow accents
Supabase backend (Auth + Postgres + Realtime)

## Completed Phases

### Phase 1A: Supabase Foundation ✅
**Files:**
- `apps/web/src/lib/supabase.ts` - Supabase client
- `apps/web/src/hooks/auth/useAuth.tsx` - Auth context & hooks
- `apps/web/src/pages/AuthPage.tsx` - Login page
- `apps/web/src/App.tsx` - Auth guard & routing
- `supabase/migrations/001_phase1a_core.sql` - Core schema

**Database Tables:**
- `organizations` - Multi-tenancy
- `profiles` - User profiles (extends auth.users)
- `departments` - Organizational structure
- `department_members` - Department membership
- `user_settings` - User preferences
- `user_presence` - Online status tracking

**Features:**
- Sign in / Sign out
- Session persistence
- Profile fetching
- RLS policies for org isolation
- Protected routes

### Phase 1B: Setup Scripts ✅
**Files:**
- `SUPABASE_SETUP.md` - Setup guide
- `PHASE1_QUICKREF.md` - Quick reference
- `scripts/test-supabase.js` - Connection test
- `scripts/seed-demo-data.js` - Demo data seed

**Configuration:**
- `.env` configured with Supabase URL and anon key
- User created: `anna@taxiline.local` / `demo123`

### Phase 2: Chats & Messages ✅
**Files:**
- `supabase/migrations/002_phase2_chats.sql` - Chats schema (EXECUTED)
- `apps/web/src/hooks/chats/useChats.ts` - Chat hooks
- `apps/web/src/pages/ChatsPage.tsx` - Updated with real data

**Database Tables:**
- `chats` - Chat rooms (direct/group/channel)
- `chat_members` - Chat membership
- `messages` - Chat messages
- `chat_reads` - Read receipts
- `attachments` - File attachments
- `archived_chats` - User-scoped archive

**Features:**
- Fetch chats with members
- Fetch messages per chat
- Send messages
- Realtime subscriptions for new messages
- Mark as read
- Create direct/group chats

## Current Status

### ✅ Working:
- Supabase connection
- Auth migration executed
- Chats migration executed
- All tables created
- RLS policies configured
- Typecheck passes
- Build successful

### ⚠️ Issue:
- App shows "Загрузка..." (loading) indefinitely
- Possible causes:
  1. No user in auth.users
  2. No profile in profiles table
  3. fetchProfile fails silently

### 🔧 Debug Steps:
1. Check browser console (F12) for errors
2. Verify user exists: Dashboard → Authentication → Users
3. Check profiles table: Table Editor → profiles
4. If no profile, create one manually

## Next Actions

### Immediate:
1. Debug loading issue
2. Create user profile if missing
3. Test login flow

### Phase 3 (Next):
1. Realtime presence (online/offline status)
2. Typing indicators
3. File uploads to Supabase Storage
4. Message reactions

### Phase 4:
1. Contacts page with real data
2. Teams/Departments page
3. Announcements page
4. Signals/Notifications page

## Tech Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **Styling:** Tailwind CSS 4
- **State:** React Context + Hooks
- **Package Manager:** pnpm
- **Architecture:** Monorepo (apps/web, packages/*)

## Key Commands
```bash
pnpm dev:web          # Start dev server
pnpm build:web        # Build for production
pnpm supabase:test    # Test Supabase connection
pnpm supabase:seed    # Seed demo data
pnpm -r typecheck     # Type check all packages
```

## Environment Variables
```env
VITE_SUPABASE_URL=https://tvzzgivzkdswfrrjprlz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Important Notes
- User ID needed for profile creation
- RLS requires user to be in organization
- Direct chats use `create_direct_chat()` function
- Realtime uses Supabase channels
