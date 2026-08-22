import { createClient } from '@supabase/supabase-js'

const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL?.trim()
const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null

