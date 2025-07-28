import { supabase, AUTH_STORAGE_KEY } from './api.modern'
import { Database } from './database.types'
import { AUTH_CONSTANTS, authLog } from './constants/auth'
import { AuthMonitorLite } from './utils/auth-monitor.lite'

type User = Database['public']['Tables']['users']['Row']

export interface AuthUser {
  id: string
  email: string
  emailConfirmed: boolean
  role?: string
  profile: User | null
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
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  if (!supabase) {
    authLog.warn('Supabase client not configured')
    return { data: null, error: new Error('Supabase not configured') }
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      authLog.warn('Authentication failed:', error.message)
      return { data: null, error }
    }
    
    // Update last login time on successful sign in
    if (data?.user?.id) {
      await updateLastLogin(data.user.id)
    }
    return { data, error: null }
  } catch (error) {
    authLog.warn('Sign in exception:', error)
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

// 간소화된 캐시 시스템
interface UserCache {
  data: AuthUser | null
  timestamp: number
  sessionExpiry?: number
}

let userCache: UserCache | null = null
let getCurrentUserPromise: Promise<AuthUser | null> | null = null

// JWT 만료 체크 (간소화)
function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) return true
  const now = Date.now() / 1000
  return now >= (expiresAt - AUTH_CONSTANTS.JWT_EXPIRY_BUFFER)
}

// 캐시 유효성 체크 (간소화)
function isCacheValid(cache: UserCache): boolean {
  const now = Date.now()
  const cacheAge = now - cache.timestamp
  
  // 캐시가 5분 이상 오래됨
  if (cacheAge > AUTH_CONSTANTS.DEFAULT_CACHE_DURATION) {
    return false
  }
  
  // 세션 만료 임박
  if (cache.sessionExpiry && isTokenExpired(cache.sessionExpiry)) {
    return false
  }
  
  return true
}

// Get current user - 최적화 버전
export async function getCurrentUser(forceRefresh = false): Promise<AuthUser | null> {
  if (!supabase) {
    authLog.warn('Supabase client not configured')
    return null
  }
  
  // Mutex 패턴 유지 (중복 호출 방지)
  if (getCurrentUserPromise && !forceRefresh) {
    AuthMonitorLite.log('getCurrentUser:waiting')
    return getCurrentUserPromise
  }
  
  // 캐시 확인
  if (!forceRefresh && userCache && isCacheValid(userCache)) {
    AuthMonitorLite.log('getCurrentUser:cache_hit')
    return userCache.data
  }
  
  getCurrentUserPromise = (async () => {
    try {
      // 세션 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        authLog.info('No session found')
        userCache = { data: null, timestamp: Date.now() }
        return null
      }
      
      // 캐시된 사용자 정보 사용 (프로필 없이)
      if (!forceRefresh && userCache?.data?.id === session.user.id) {
        return userCache.data
      }
      
      // 프로필 가져오기 (필요시)
      let profile: User | null = null
      
      if (forceRefresh || !userCache?.data?.profile) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userError) {
          authLog.warn('User profile not found')
          // 프로필 자동 생성 로직은 유지
          try {
            const userMetadata = session.user.user_metadata || {}
            const { data: newUser } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email!,
                name: userMetadata.name || session.user.email!.split('@')[0],
                department: userMetadata.department || null,
                role: 'member',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_seen_at: new Date().toISOString()
              })
              .select()
              .single()
            
            profile = newUser
          } catch {
            profile = null
          }
        } else {
          profile = userData
          // 강제 새로고침시에만 last_seen 업데이트
          if (forceRefresh) {
            updateLastActive(session.user.id).catch(() => {})
          }
        }
      } else {
        profile = userCache.data.profile
      }

      const userData: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        emailConfirmed: !!session.user.email_confirmed_at,
        role: profile?.role || 'member',
        profile,
      }
      
      // 캐시 업데이트
      userCache = { 
        data: userData, 
        timestamp: Date.now(),
        sessionExpiry: session.expires_at
      }
      
      AuthMonitorLite.log('getCurrentUser:success')
      return userData
    } catch (error) {
      authLog.error('Failed to get current user:', error)
      userCache = { data: null, timestamp: Date.now() }
      return null
    } finally {
      getCurrentUserPromise = null
    }
  })()
  
  return getCurrentUserPromise
}

// Clear user cache
export function clearUserCache() {
  userCache = null
}

// Quick session check
export async function hasSession(): Promise<boolean> {
  if (!supabase) return false
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch {
    return false
  }
}

// Update user profile
export async function updateProfile(userId: string, updates: Partial<User>) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') }
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    
    clearUserCache()
    
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// 통합된 사용자 활동 시간 업데이트
export async function updateUserActivity(userId: string) {
  if (!supabase) {
    return { error: new Error('Supabase not configured') }
  }
  
  try {
    const { error } = await supabase
      .from('users')
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', userId)
    
    if (error) throw error
    
    return { error: null }
  } catch (error) {
    return { error }
  }
}

// 하위 호환성을 위한 별칭
export const updateLastActive = updateUserActivity
export const updateLastLogin = updateUserActivity