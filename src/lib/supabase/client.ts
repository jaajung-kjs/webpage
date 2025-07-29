/**
 * Supabase Client Configuration
 * 
 * 🚨 CRITICAL: This is the ONLY place where Supabase client is initialized
 * ✅ Use this client throughout the app - NEVER create new instances
 * ✅ Type-safe with auto-generated database types
 * ❌ NEVER import @supabase/supabase-js directly in components
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'kepco-ai-auth',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'kepco-ai-community'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Type exports for convenience
export type { Database } from '../database.types'
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Helper function to handle Supabase errors consistently
export function handleSupabaseError(error: any): string {
  if (error?.message) {
    // Common error messages mapping
    const errorMap: Record<string, string> = {
      'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'Email not confirmed': '이메일 인증이 필요합니다.',
      'User already registered': '이미 가입된 이메일입니다.',
      'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
      'duplicate key value violates unique constraint': '이미 존재하는 데이터입니다.',
      'new row violates row-level security policy': '권한이 없습니다.',
    }
    
    // Check if error message contains any of the mapped errors
    for (const [key, value] of Object.entries(errorMap)) {
      if (error.message.includes(key)) {
        return value
      }
    }
    
    return error.message
  }
  
  return '알 수 없는 오류가 발생했습니다.'
}

// Re-export useful types from Supabase
export type {
  User,
  Session,
  AuthError,
  AuthResponse,
  AuthTokenResponse
} from '@supabase/supabase-js'