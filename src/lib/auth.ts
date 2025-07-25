import { supabase } from './supabase'
import { Profile } from './supabase'

export interface AuthUser {
  id: string
  email: string
  emailConfirmed: boolean
  profile: Profile | null
}

// Sign up with email and password
export async function signUp(email: string, password: string, name: string, department: string = '전력관리처') {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') }
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
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
  console.log('🔐 signIn function called for:', email)
  
  if (!supabase) {
    console.error('❌ Supabase not configured')
    return { data: null, error: new Error('Supabase not configured') }
  }
  
  try {
    console.log('🔍 Calling supabase.auth.signInWithPassword...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('🔍 Supabase auth response:', {
      hasData: !!data,
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      error: error?.message,
      errorName: error?.name
    })

    if (error) {
      console.log('⚠️ Auth error received:', {
        message: error.message,
        name: error.name,
        status: error.status
      })
      
      // 모든 에러를 그대로 반환 (LoginDialog에서 처리)
      return { data: null, error }
    }
    
    console.log('✅ Sign in successful')
    return { data, error: null }
  } catch (error) {
    console.error('❌ Sign in exception:', error)
    return { data: null, error }
  }
}

// Sign out
export async function signOut() {
  if (!supabase) {
    return { error: new Error('Supabase not configured') }
  }
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

// Get current user with profile
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) {
    return null
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email!,
      emailConfirmed: !!user.email_confirmed_at,
      profile,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Update user profile
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') }
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Update last active timestamp (removed - field not in database schema)
// export async function updateLastActive(userId: string) {
//   // Field 'last_active' is not defined in profiles table
// }