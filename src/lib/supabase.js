import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// DEBUG: confirm env vars are injected in Vercel preview (remove after fix confirmed)
console.log('[supabase] VITE_SUPABASE_URL:', supabaseUrl || '(undefined)')
console.log('[supabase] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '(set)' : '(undefined)')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
