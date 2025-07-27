import { supabaseSimple } from './supabase-simple'
import { Database } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface AuthUser {
  id: string
  email: string
  emailConfirmed: boolean
  profile: Profile | null
}

// Sign up with email and password
export async function signUp(email: string, password: string, name: string, department: string = '전력관리처') {
  if (!supabaseSimple) {
    return { data: null, error: new Error('Supabase not configured') }
  }
  
  try {
    const { data, error } = await supabaseSimple.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name,
          department,
        },
      },
    })

    if (error) throw error

    // Profile is automatically created by handle_new_user() trigger
    // No need to manually create profile here

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  // console.log('Sign in attempt initiated', email)
  
  if (!supabaseSimple) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Supabase client not configured')
    }
    return { data: null, error: new Error('Supabase not configured') }
  }
  
  try {
    // console.log('Calling supabase.auth.signInWithPassword')
    const { data, error } = await supabaseSimple.auth.signInWithPassword({
      email,
      password,
    })

    // console.log('Supabase auth response received', {
    //   hasData: !!data,
    //   hasUser: !!data?.user,
    //   hasSession: !!data?.session,
    //   error: error?.message,
    //   errorName: error?.name
    // })

    if (error) {
      // 개발 환경에서만 에러 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.warn('Authentication failed:', error.message)
      }
      
      // 모든 에러를 그대로 반환 (LoginDialog에서 처리)
      return { data: null, error }
    }
    
    // console.log('Sign in successful', email)
    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Sign in exception:', error)
    }
    return { data: null, error }
  }
}

// Sign out
export async function signOut() {
  if (!supabaseSimple) {
    return { error: new Error('Supabase not configured') }
  }
  
  try {
    const { error } = await supabaseSimple.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

// Cache for user data to prevent excessive API calls
let userCache: { data: AuthUser | null; timestamp: number } | null = null
const CACHE_DURATION = 30000 // 30 seconds

// Get current user with profile
export async function getCurrentUser(forceRefresh = false): Promise<AuthUser | null> {
  if (!supabaseSimple) {
    console.warn('Supabase client not configured')
    return null
  }
  
  // Return cached data if available and not expired
  if (!forceRefresh && userCache && Date.now() - userCache.timestamp < CACHE_DURATION) {
    return userCache.data
  }
  
  try {
    const { data: { user }, error: userError } = await supabaseSimple.auth.getUser()
    
    if (userError) {
      // Only log non-session errors to reduce console noise
      if (userError.message !== 'Auth session missing!') {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error getting user from auth:', userError.message)
        }
      }
      userCache = { data: null, timestamp: Date.now() }
      return null
    }
    
    if (!user) {
      userCache = { data: null, timestamp: Date.now() }
      return null
    }

    // Check cache first for profile data (disabled for MVP)
    let profile: Profile | null = null
    
    if (!profile) {
      try {
        const { data: profileData, error: profileError } = await supabaseSimple
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.warn('Profile not found or error', { error: profileError })
          // Continue without profile if it doesn't exist
          profile = null
        } else {
          profile = profileData || null
          // Cache profile for 10 minutes
          if (profile) {
            // Note: Cache disabled for MVP
          }
        }
      } catch (profileError) {
        console.warn('Profile query failed', { error: profileError })
        profile = null
      }
    }

    const userData: AuthUser = {
      id: user.id,
      email: user.email!,
      emailConfirmed: !!user.email_confirmed_at,
      profile,
    }
    
    // Cache the result
    userCache = { data: userData, timestamp: Date.now() }
    
    return userData
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to get current user:', error)
    }
    userCache = { data: null, timestamp: Date.now() }
    return null
  }
}

// Clear user cache (used when user data changes)
export function clearUserCache(userId?: string) {
  userCache = null
  
  // Clear profile cache for specific user or all profiles
  if (userId) {
    // Note: Cache disabled for MVP
  } else {
    // Note: Cache disabled for MVP
  }
}

// Update user profile
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  if (!supabaseSimple) {
    return { data: null, error: new Error('Supabase not configured') }
  }
  
  try {
    const { data, error } = await supabaseSimple
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    
    // Clear cache after profile update
    clearUserCache(userId)
    
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Update last active timestamp (removed - field not in database schema)
// export async function updateLastActive(userId: string) {
//   // Field 'last_active' is not defined in profiles table
// }