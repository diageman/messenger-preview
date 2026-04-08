import * as React from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './hooks/auth/useAuth';
import { SettingsApplier } from './components/SettingsApplier';
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

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, authLoading, profileLoading, profileError } = useAuth();

  // Ждём восстановления сессии
  if (authLoading) {
    return <PageLoading message="Восстановление сессии..." />;
  }

  // Нет сессии — на страницу авторизации
  if (!session) {
    return <Navigate replace to="/auth" />;
  }

  // Сессия есть, ждём профиль
  if (profileLoading) {
    return <PageLoading message="Загрузка профиля..." />;
  }

  // Профиль не найден — показываем ошибку вместо белого экрана
  if (profileError) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-app">
        <div className="flex flex-col items-center gap-4 text-center px-8">
          <p className="text-text-primary font-semibold">Профиль не найден</p>
          <p className="text-sm text-text-muted">{profileError}</p>
          <p className="text-xs text-text-muted">Проверьте таблицу profiles в Supabase Dashboard</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Layout() {
  const { authLoading } = useAuth();

  if (authLoading) {
    return <PageLoading message="Восстановление сессии..." />;
  }

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
        <SettingsApplier />
        <AppContent />
      </AuthProvider>
    </Suspense>
  );
}

export default App;
