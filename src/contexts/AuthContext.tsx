'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase, AUTH_STORAGE_KEY } from '@/lib/api.modern'
import { AuthUser, getCurrentUser, clearUserCache } from '@/lib/auth'
import { AUTH_CONSTANTS, authLog } from '@/lib/constants/auth'
import { AuthMonitorLite } from '@/lib/utils/auth-monitor.lite'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signUp: (email: string, password: string, name: string, department?: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: Partial<any>) => Promise<{ data: any; error: any }>
  resendEmailConfirmation: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 핵심 refs만 유지
  const isUpdatingRef = useRef(false)
  const refreshRetryCountRef = useRef(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updateCountRef = useRef(0) // 간단한 카운터로 루프 감지

  // 최적화된 디바운스 업데이트
  const debouncedAuthUpdate = useCallback(async (forceRefresh: boolean = false, source?: string) => {
    // 간단한 루프 체크
    updateCountRef.current++
    if (AuthMonitorLite.checkLoop(updateCountRef.current)) {
      return
    }
    
    // 타이머 정리
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    // 디바운스 실행
    updateTimeoutRef.current = setTimeout(async () => {
      if (isUpdatingRef.current) {
        authLog.info('Auth update already in progress')
        return
      }
      
      isUpdatingRef.current = true
      
      try {
        const freshUser = await getCurrentUser(forceRefresh)
        setUser(freshUser)
        refreshRetryCountRef.current = 0
        
        AuthMonitorLite.log('auth:updated', { userId: freshUser?.id, source })
      } catch (error) {
        authLog.error('Auth update failed:', error)
      } finally {
        isUpdatingRef.current = false
      }
    }, AUTH_CONSTANTS.AUTH_UPDATE_DEBOUNCE_MS)
  }, [])

  // 초기화 - 간소화
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await getCurrentUser(false)
        setUser(user)
      } catch (error) {
        authLog.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    if (!supabase) {
      setLoading(false)
      return
    }
    
    // 이벤트 리스너 최적화
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 중요 이벤트만 처리
        switch (event) {
          case 'SIGNED_IN':
          case 'USER_UPDATED':
            debouncedAuthUpdate(true, event)
            break
            
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              refreshRetryCountRef.current = 0
              debouncedAuthUpdate(false, event)
            } else if (!session) {
              // 토큰 갱신 실패 처리
              refreshRetryCountRef.current++
              
              if (refreshRetryCountRef.current >= AUTH_CONSTANTS.MAX_REFRESH_RETRIES) {
                authLog.error('Max refresh retries reached')
                setUser(null)
                clearUserCache()
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem(AUTH_STORAGE_KEY)
                }
                refreshRetryCountRef.current = 0
              } else {
                // Exponential backoff
                const delay = AUTH_CONSTANTS.REFRESH_BACKOFF_BASE_MS * Math.pow(2, refreshRetryCountRef.current - 1)
                setTimeout(() => debouncedAuthUpdate(true, 'retry'), delay)
              }
            }
            break
            
          case 'SIGNED_OUT':
            setUser(null)
            clearUserCache()
            refreshRetryCountRef.current = 0
            break
            
          case 'INITIAL_SESSION':
            if (!user && session?.user) {
              debouncedAuthUpdate(false, event)
            }
            break
        }
      }
    )

    // 루프 카운터 리셋 (5초마다)
    const resetInterval = setInterval(() => {
      updateCountRef.current = 0
    }, AUTH_CONSTANTS.LOOP_DETECTION_WINDOW_MS)

    return () => {
      subscription.unsubscribe()
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      clearInterval(resetInterval)
    }
  }, [debouncedAuthUpdate, user])

  // 메서드들은 그대로 유지 (최적화 불필요)
  const signIn = useCallback(async (email: string, password: string) => {
    const { signIn } = await import('@/lib/auth')
    return signIn(email, password)
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, department?: string) => {
    const { signUp } = await import('@/lib/auth')
    return signUp(email, password, name, department)
  }, [])

  const signOut = useCallback(async () => {
    const { signOut } = await import('@/lib/auth')
    const result = await signOut()
    if (!result.error) {
      setUser(null)
      clearUserCache()
    }
    return result
  }, [])

  const updateProfile = useCallback(async (updates: Partial<any>) => {
    if (!user) return { data: null, error: 'No user logged in' }
    
    const { updateProfile } = await import('@/lib/auth')
    const result = await updateProfile(user.id, updates)
    
    if (result.data && user) {
      setUser({
        ...user,
        profile: result.data,
      })
    }
    
    return result
  }, [user])

  const resendEmailConfirmation = useCallback(async (email: string) => {
    try {
      if (!supabase) {
        return { error: new Error('Supabase client not available') }
      }
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      return { error }
    } catch (error: any) {
      return { error }
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendEmailConfirmation,
  }), [user, loading, signIn, signUp, signOut, updateProfile, resendEmailConfirmation])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}