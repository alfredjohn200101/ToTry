// The existing Supabase backend, reused as-is. Same project + the live ai-proxy.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export const SUPABASE_URL = 'https://oklvalcgxeoudgpldzkk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_YdBhqYPvyxeUH0E2z--84w_RXxrIuE3';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // On native, persist the session in AsyncStorage. On web, use the default (localStorage).
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
