/**
 * Hook для получения списка контактов (сотрудников организации)
 * 
 * ОСОБЕННОСТИ:
 * - Контакты загружаются в фоне, но НЕ показываются пока не начнётся поиск
 * - Поиск работает по ФИО, email, телефону
 * - Админ может удалять контакты
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
  is_admin: boolean;
}

export function useContacts() {
  const { profile } = useAuth();
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchContacts = React.useCallback(async (isRefresh = false) => {
    if (!profile?.organization_id || profile.organization_id.length < 30) {
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .neq('id', profile.id)
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

  const deleteContact = React.useCallback(async (contactId: string) => {
    if (!profile?.is_admin) {
      throw new Error('Нет прав для удаления контактов');
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
    setContacts(prev => prev.filter(c => c.id !== contactId));
  }, [profile]);

  const searchContacts = React.useCallback((query: string): Contact[] => {
    const trimmedQuery = query?.trim().toLowerCase() || '';
    
    // Админ видит все контакты при пустом запросе
    if (trimmedQuery.length === 0) {
      return profile?.is_admin ? contacts : [];
    }

    // Фильтрация для всех при наличии запроса
    return contacts.filter(contact => {
      if (contact.full_name.toLowerCase().includes(trimmedQuery)) return true;
      if (contact.email.toLowerCase().includes(trimmedQuery)) return true;
      if (contact.phone && contact.phone.includes(trimmedQuery)) return true;
      if (contact.role.toLowerCase().includes(trimmedQuery)) return true;
      return false;
    });
  }, [contacts, profile?.is_admin]);

  return {
    contacts,
    loading,
    error,
    isAdmin: profile?.is_admin ?? false,
    refresh: fetchContacts,
    deleteContact,
    searchContacts,
  };
}