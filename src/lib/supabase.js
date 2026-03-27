import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zgoyfmdgqxbrxfoankvl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb3lmbWRncXhicnhmb2Fua3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDczOTUsImV4cCI6MjA4OTUyMzM5NX0.FWE2ajU73sy45kyhJHIQGwwsKaDihZ82E6uMn-fd7ac'

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'worky-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
})
