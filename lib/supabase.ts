import { createClient } from '@supabase/supabase-js';

declare const __SAGE_SUPABASE_URL__: string;
declare const __SAGE_SUPABASE_ANON_KEY__: string;

type SageWindow = Window & {
  __SAGE_ENV__?: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  };
  SAGE_SUPABASE_URL?: string;
  SAGE_SUPABASE_ANON_KEY?: string;
};

const fromWindow = typeof window !== 'undefined' ? (window as SageWindow) : undefined;

export const supabaseUrl =
  fromWindow?.__SAGE_ENV__?.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof __SAGE_SUPABASE_URL__ !== 'undefined' && __SAGE_SUPABASE_URL__
    ? __SAGE_SUPABASE_URL__
    : fromWindow?.SAGE_SUPABASE_URL || '');

export const supabaseAnonKey =
  fromWindow?.__SAGE_ENV__?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof __SAGE_SUPABASE_ANON_KEY__ !== 'undefined' && __SAGE_SUPABASE_ANON_KEY__
    ? __SAGE_SUPABASE_ANON_KEY__
    : fromWindow?.SAGE_SUPABASE_ANON_KEY || '');

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;
