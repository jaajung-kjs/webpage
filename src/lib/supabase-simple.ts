import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Simple Supabase client with minimal configuration
const supabaseUrl = 'https://ajwgnloatyuqwkqwrrzj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqd2dubG9hdHl1cXdrcXdycnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDMwMTcsImV4cCI6MjA2OTAxOTAxN30.RW5-Vvrcs-PtpdbQS2lAEJlgd1OpRFPMNJtf7_LZCRA'

export const supabaseSimple = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})