/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Type helpers
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Database types (will be auto-generated later)
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          role: string;
          avatar_url: string | null;
          phone: string | null;
          email: string;
          status: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          full_name: string;
          role: string;
          avatar_url?: string | null;
          phone?: string | null;
          email: string;
          status?: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          role?: string;
          avatar_url?: string | null;
          phone?: string | null;
          email?: string;
          status?: 'online' | 'busy' | 'away' | 'dnd' | 'offline';
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      department_members: {
        Row: {
          department_id: string;
          user_id: string;
          role: 'head' | 'member';
          joined_at: string;
        };
        Insert: {
          department_id: string;
          user_id: string;
          role?: 'head' | 'member';
          joined_at?: string;
        };
        Update: {
          department_id?: string;
          user_id?: string;
          role?: 'head' | 'member';
          joined_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          preferences: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          preferences?: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          preferences?: Json;
          updated_at?: string;
        };
      };
      user_presence: {
        Row: {
          user_id: string;
          last_seen_at: string;
          is_online: boolean;
        };
        Insert: {
          user_id: string;
          last_seen_at?: string;
          is_online?: boolean;
        };
        Update: {
          user_id?: string;
          last_seen_at?: string;
          is_online?: boolean;
        };
      };
    };
  };
}
