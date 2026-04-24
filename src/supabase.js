// src/supabase.js
import { createClient } from '@supabase/supabase-js';
import { isUxTestMode } from './appMode';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!isUxTestMode && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = isUxTestMode ? null : createClient(supabaseUrl, supabaseAnonKey);
