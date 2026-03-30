import * as React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './hooks/auth/useAuth';
import { Suspense } from 'react';

// Lazy load pages
const ChatsPage = React.lazy(async () => ({ default: (await import('./pages/ChatsPage')).ChatsPage }));
const TeamsPage = React.lazy(async () => ({ default: (await import('./pages/TeamsPage')).TeamsPage }));
const ContactsPage = React.lazy(async () => ({ default: (await import('./pages/ContactsPage')).ContactsPage }));
const AnnouncementsPage = React.lazy(async () => ({ default: (await import('./pages/AnnouncementsPage')).AnnouncementsPage }));
const SignalsPage = React.lazy(async () => ({ default: (await import('./pages/SignalsPage')).SignalsPage }));
const SettingsPage = React.lazy(async () => ({ default: (await import('./pages/SettingsPage')).SettingsPage }));
const AuthPage = React.lazy(async () => ({ default: (await import('./pages/AuthPage')).AuthPage }));

// Loading fallback component
function PageLoading({ message = 'Загрузка...' }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-bg-app">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-yellow border-t-transparent" />
        <p className="text-sm text-text-muted">{message}</p>
      </div>
    </div>
  );
}

// Profile missing error component
function ProfileMissing() {
  const { signOut, profileError } = useAuth();
  
  return (
    <div className="flex h-full items-center justify-center bg-bg-app">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Профиль не найден</h2>
        <p className="text-sm text-text-muted">
          Ваш пользователь существует, но профиль не найден в базе данных.
        </p>
        {profileError && (
          <div className="rounded-lg bg-error/10 p-3 text-xs text-error">
            Ошибка: {profileError}
          </div>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Выйти
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium bg-accent-yellow text-black rounded hover:bg-accent-yellow/90"
          >
            Повторить
          </button>
        </div>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, authLoading, profileLoading, profile } = useAuth();

  // Still restoring session
  if (authLoading) {
    return <PageLoading message="Восстановление сессии..." />;
  }

  // No session - redirect to auth
  if (!session) {
    window.location.href = '/auth';
    return null;
  }

  // Session exists but profile is loading
  if (profileLoading) {
    return <PageLoading message="Загрузка профиля..." />;
  }

  // Session exists but profile is missing (RLS error, no row, etc.)
  if (!profile) {
    return <ProfileMissing />;
  }

  // Ready - session and profile both loaded
  return <>{children}</>;
}

function Layout() {
  return (
    <div className="flex h-screen bg-bg-app">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ChatsPage />} />
        <Route path="chats" element={<ChatsPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="signals" element={<SignalsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Suspense>
  );
}

export default App;
