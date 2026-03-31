/**
 * Hook для получения списка контактов (сотрудников организации)
 */

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/auth/useAuth';

export interface Contact {
  id: string;
  full_name: string;
  role: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
  organization_id: string;
}

export function useContacts() {
  const { profile } = useAuth();
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchContacts = React.useCallback(async (isRefresh = false) => {
    if (!profile) return;

    // Don't set loading on refresh, keep old contacts visible
    if (!isRefresh) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .neq('id', profile.id) // Исключаем текущего пользователя
        .order('full_name');

      if (error) throw error;
      setContacts((data || []) as Contact[]);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err);
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [profile]);

  React.useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    refresh: fetchContacts,
  };
}
