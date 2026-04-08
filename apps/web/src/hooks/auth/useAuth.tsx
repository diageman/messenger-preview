/**
 * Auth hooks for Supabase authentication
 *
 * AUTH BOOTSTRAP FLOW:
 * 1. AuthProvider initializes with authLoading = true
 * 2. getSession() restores session from localStorage
 * 3. onAuthStateChange ONLY updates session state (NO async calls!)
 * 4. Separate useEffect fetches profile when session?.user?.id changes
 * 5. Profile fetch has its own loading state and error handling
 *
 * STATE MACHINE:
 * - authLoading: Supabase session is being restored
 * - profileLoading: Profile is being fetched from Supabase
 * - profileError: Profile fetch failed (RLS, missing row, etc.)
 * - ready: authLoading = false AND (profile != null OR profileError != null)
 * - unauthenticated: authLoading = false AND session = null
 */

import * as React from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  phone: string | null;
  email: string;
  status: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  session: any | null;
  profile: Profile | null;
  authLoading: boolean;
  profileLoading: boolean;
  profileError: string | null;
}

const AuthContext = React.createContext<AuthState & {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: {
    full_name?: string;
    role?: string;
    phone?: string;
    status?: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
  }) => Promise<{ error: Error | null }>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<AuthState['session']>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  // Ref для отслеживания userId — не вызывает re-render и исключает цикл
  const fetchedForUserId = React.useRef<string | null>(null);

  // =====================================================
  // FETCH PROFILE
  // =====================================================
  const fetchProfile = React.useCallback(async (userId: string) => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] Profile fetch error:', error.code, error.message);
        setProfileError(error.message);
        setProfile(null);
      } else if (data) {
        setProfile(data as Profile);
      }
    } catch (error: any) {
      console.error('[Auth] Profile fetch exception:', error.message);
      setProfileError(error.message || 'Failed to fetch profile');
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // =====================================================
  // INITIAL SESSION RESTORE
  // =====================================================
  React.useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] Session restore error:', error.message);
          if (isMounted) setAuthLoading(false);
          return;
        }
        if (isMounted) {
          setSession(session);
          setAuthLoading(false);
        }
      } catch (error: any) {
        console.error('[Auth] Session restore exception:', error.message);
        if (isMounted) setAuthLoading(false);
      }
    }

    restoreSession();
    return () => { isMounted = false; };
  }, []);

  // =====================================================
  // AUTH STATE CHANGES (NO ASYNC CALLS!)
  // =====================================================
  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[Auth] onAuthStateChange:', _event, newSession?.user?.id);
      setSession(newSession);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  // =====================================================
  // FETCH PROFILE WHEN USER ID CHANGES
  // Используем ref чтобы избежать цикла через profile в зависимостях
  // =====================================================
  React.useEffect(() => {
    const userId = session?.user?.id ?? null;

    if (userId && fetchedForUserId.current !== userId) {
      // Новый userId — грузим профиль
      fetchedForUserId.current = userId;
      console.log('[Auth] Fetching profile for user:', userId);
      fetchProfile(userId);
    } else if (!userId) {
      // Сессия пропала — сбрасываем
      fetchedForUserId.current = null;
      setProfile(null);
      setProfileLoading(false);
      setProfileError(null);
    }
  }, [session, fetchProfile]);

  // =====================================================
  // SIGN IN
  // =====================================================
  const signIn = React.useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[Auth] Sign in error:', error.message);
        return { error };
      }
      console.log('[Auth] Sign in successful');
      return { error: null };
    } catch (error: any) {
      console.error('[Auth] Sign in exception:', error.message);
      return { error: error as Error };
    }
  }, []);

  // =====================================================
  // SIGN UP
  // =====================================================
  const signUp = React.useCallback(async (email: string, password: string, fullName: string) => {
    try {
      if (!email || !email.includes('@')) return { error: new Error('Введите корректный email') };
      if (password.length < 6) return { error: new Error('Пароль должен быть не менее 6 символов') };

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) {
        console.error('[Auth] Sign up error:', authError.message);
        return { error: authError };
      }
      if (!authData.user) return { error: new Error('No user returned from signup') };

      console.log('[Auth] Sign up successful');
      return { error: null };
    } catch (error: any) {
      console.error('[Auth] Sign up exception:', error.message);
      return { error: error as Error };
    }
  }, []);

  // =====================================================
  // SIGN OUT
  // =====================================================
  const signOut = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      setProfileError(null);
      fetchedForUserId.current = null;
      console.log('[Auth] Sign out successful');
    } catch (error: any) {
      console.error('[Auth] Sign out error:', error.message);
    }
    navigate('/auth');
  }, [navigate]);

  // =====================================================
  // REFRESH PROFILE
  // =====================================================
  const refreshProfile = React.useCallback(async () => {
    if (session?.user?.id) {
      fetchedForUserId.current = null; // Сбрасываем чтобы разрешить повторный fetch
      await fetchProfile(session.user.id);
      fetchedForUserId.current = session.user.id;
    }
  }, [session, fetchProfile]);

  // =====================================================
  // UPDATE PROFILE
  // =====================================================
  const updateProfile = React.useCallback(async (updates: {
    full_name?: string;
    role?: string;
    phone?: string;
    status?: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
  }) => {
    if (!profile) {
      console.error('[Auth] No profile to update');
      return { error: new Error('No profile') };
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) {
        console.error('[Auth] Profile update error:', error.message);
        return { error };
      }
      console.log('[Auth] Profile updated successfully');
      fetchedForUserId.current = null;
      await fetchProfile(profile.id);
      fetchedForUserId.current = profile.id;
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Profile update exception:', err.message);
      return { error: err as Error };
    }
  }, [profile, fetchProfile]);

  // =====================================================
  // CONTEXT VALUE
  // =====================================================
  const value = React.useMemo(() => ({
    session, profile, authLoading, profileLoading, profileError,
    signIn, signUp, signOut, refreshProfile, updateProfile,
  }), [session, profile, authLoading, profileLoading, profileError,
       signIn, signUp, signOut, refreshProfile, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
