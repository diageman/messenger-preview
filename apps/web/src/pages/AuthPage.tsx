import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@messenger/ui';
import { Input } from '@messenger/ui';
import { Car } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { motion } from 'framer-motion';

type AuthMode = 'signin' | 'signup';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, session, authLoading } = useAuth();
  const [mode, setMode] = React.useState<AuthMode>('signin');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false); // Prevent double submit

  // Redirect if already authenticated
  // Wait for authLoading to finish to avoid redirect loops
  React.useEffect(() => {
    if (session && !authLoading) {
      navigate('/', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submission
    if (submitted) return;
    
    setError(null);
    setSubmitted(true);
    setLoading(true);

    try {
      const { error } = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

      if (error) {
        setError(error.message);
        setLoading(false);
        setSubmitted(false); // Allow retry
      }
      // После успеха:
      // - signIn → redirect через useEffect (session changed)
      // - signUp → redirect через useEffect (session changed)
      // setLoading(false) не вызываем, ждём redirect
    } catch (err: any) {
      setError('Произошла ошибка');
      setLoading(false);
      setSubmitted(false); // Allow retry
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg-app px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-yellow to-accent-yellow/80">
            <Car className="h-8 w-8 text-black" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Мессенджер</h1>
          <p className="mt-1 text-sm text-text-muted">Парк Онлайн</p>
        </div>

        {/* Auth Form */}
        <div className="rounded-xl border border-border-soft bg-bg-elevated p-6">
          {/* Mode Tabs */}
          <div className="mb-6 flex rounded-lg bg-bg-panel p-1">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Регистрация
            </button>
          </div>

          <h2 className="mb-6 text-lg font-semibold text-text-primary">
            {mode === 'signin' ? 'Вход в систему' : 'Создать аккаунт'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  ФИО
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иванов Иван"
                  className="h-11 bg-bg-panel"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="h-11 bg-bg-panel"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Пароль
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? '••••••••••' : '••••••••'}
                className="h-11 bg-bg-panel"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-error/10 p-3 text-sm text-error">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="default"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? (mode === 'signin' ? 'Вход...' : 'Регистрация...')
                : (mode === 'signin' ? 'Войти' : 'Создать аккаунт')}
            </Button>
          </form>

          {/* Demo Credentials (only for signin) */}
          {mode === 'signin' && (
            <div className="mt-6 rounded-lg bg-bg-panel p-4">
              <p className="mb-2 text-xs font-medium text-text-secondary">
                Демо доступ:
              </p>
              <div className="space-y-1 text-xs text-text-muted">
                <p>
                  <span className="text-text-secondary">Email:</span>{' '}
                  <code className="rounded bg-bg-elevated px-1">anna@taxiline.local</code>
                </p>
                <p>
                  <span className="text-text-secondary">Пароль:</span>{' '}
                  <code className="rounded bg-bg-elevated px-1">demo123</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Корпоративный мессенджер для таксопарка
        </p>
      </motion.div>
    </div>
  );
}
