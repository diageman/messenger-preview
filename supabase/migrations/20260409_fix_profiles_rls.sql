-- ВРЕМЕННЫЙ FIX: Функция для загрузки профилей БЕЗ RLS ограничений.
-- SECURITY DEFINER выполняет функцию от имени DEFINER (postgres), обходя RLS.
-- Это позволяет embedded JOIN (fetchMessages) работать даже при блокирующей RLS политике.
-- После применения 20260409_fix_profiles_rls.sql эту функцию можно удалить.

CREATE OR REPLACE FUNCTION public.get_profiles_for_messages(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, full_name, avatar_url
  FROM public.profiles
  WHERE id = ANY(user_ids);
$$;

-- Также пересоздаём RLS политику для profiles — разрешаем чтение всем авторизованным
DROP POLICY IF EXISTS org_profiles_visible ON public.profiles;

CREATE POLICY profiles_readable_by_auth ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');
