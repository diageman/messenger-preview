import * as React from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './hooks/auth/useAuth';
import { SettingsApplier } from './components/SettingsApplier';
import { Suspense, useEffect } from 'react';
import { useAuthStore } from './store/authStore';

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

/**
 * Инициализирует auth store ОДИН раз при старте приложения.
 * supabase.auth.getUser() — авторитетный источник identity.
 */
function AppBootstrap() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  return null;
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, authLoading, profileLoading } = useAuth();

  // Ждем, пока восстановится сессия ИЛИ пока грузится профиль
  // Это предотвращает редирект на /auth в моменты промежуточных состояний
  if (authLoading || (session && profileLoading)) {
    return <PageLoading message="Загрузка профиля..." />;
  }

  if (!session) {
    return <Navigate replace to="/auth" />;
  }

  return <>{children}</>;
}

function Layout() {
  const { authLoading } = useAuth();

  // Wait for auth to load before rendering layout
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
      <AppBootstrap />
      <AuthProvider>
        <SettingsApplier />
        <AppContent />
      </AuthProvider>
    </Suspense>
  );
}

export default App;
