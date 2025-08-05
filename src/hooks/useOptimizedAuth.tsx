/**
 * Optimized Auth Hook
 * 
 * SessionManager를 활용한 최적화된 인증 훅
 * - 불필요한 리렌더링 방지
 * - 캐시된 프로필 사용
 * - 중앙화된 실시간 구독
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { sessionManager } from '@/lib/utils/session-manager'
import { supabase } from '@/lib/supabase/client'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Tables } from '@/lib/supabase/client'

type UserProfile = Tables<'users'>

interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  isMember: boolean
  isAdmin: boolean
  isLeader: boolean
}

interface AuthStateWithMethods extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, name: string, department?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: any } | undefined>
  refreshSession: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
  resendEmailConfirmation: (email: string) => Promise<{ error: AuthError | null }>
}

export function useOptimizedAuth(): AuthStateWithMethods {
  const [state, setState] = useState<AuthState>(() => {
    const sessionState = sessionManager.getState()
    
    return {
      user: sessionState.session?.user || null,
      profile: sessionState.profile,
      session: sessionState.session,
      loading: sessionState.loading,
      isAuthenticated: !!sessionState.session,
      isMember: sessionManager.isMember(),
      isAdmin: sessionManager.isAdmin(),
      isLeader: sessionManager.isLeader()
    }
  })
  
  useEffect(() => {
    // SessionManager 구독
    const unsubscribe = sessionManager.subscribe((sessionState) => {
      setState({
        user: sessionState.session?.user || null,
        profile: sessionState.profile,
        session: sessionState.session,
        loading: sessionState.loading,
        isAuthenticated: !!sessionState.session,
        isMember: sessionManager.isMember(),
        isAdmin: sessionManager.isAdmin(),
        isLeader: sessionManager.isLeader()
      })
    })
    
    return unsubscribe
  }, [])
  
  // Auth methods
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, department?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          department: department || '미지정'
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await sessionManager.signOut()
    return { error: null }
  }, [])

  const refreshSession = useCallback(async () => {
    await sessionManager.refreshSession()
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const success = await sessionManager.updateProfile(updates)
    return { error: success ? null : 'Failed to update profile' }
  }, [])

  const resendEmailConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    })
    return { error }
  }, [])
  
  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
    updateProfile,
    resendEmailConfirmation
  }
}

// 액션을 포함한 확장 훅
export function useOptimizedAuthWithActions() {
  const authState = useOptimizedAuth()
  
  const refreshSession = useCallback(async () => {
    return sessionManager.refreshSession()
  }, [])
  
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    return sessionManager.updateProfile(updates)
  }, [])
  
  const signOut = useCallback(async () => {
    await sessionManager.signOut()
  }, [])
  
  // 권한 체크 함수들 (메모이제이션)
  const checkPermission = useMemo(() => ({
    canViewDetails: authState.isMember,
    canDownload: authState.isMember,
    canMessage: authState.isMember,
    canComment: authState.isMember,
    canLike: authState.isMember,
    canReport: authState.isMember,
    canAccessAdmin: authState.isAdmin,
    canManageMembers: authState.isAdmin,
    canEditAllContent: authState.isLeader
  }), [authState.isMember, authState.isAdmin, authState.isLeader])
  
  return {
    ...authState,
    refreshSession,
    updateProfile,
    signOut,
    checkPermission
  }
}

// 권한 기반 조건부 렌더링 훅
export function usePermission(permission: 'member' | 'admin' | 'leader'): boolean {
  const { isMember, isAdmin, isLeader } = useOptimizedAuth()
  
  switch (permission) {
    case 'member':
      return isMember
    case 'admin':
      return isAdmin
    case 'leader':
      return isLeader
    default:
      return false
  }
}

// 로그인 필수 페이지용 가드 훅
export function useRequireAuth(requiredRole?: 'member' | 'admin' | 'leader') {
  const auth = useOptimizedAuth()
  const [isChecking, setIsChecking] = useState(true)
  
  useEffect(() => {
    if (!auth.loading) {
      setIsChecking(false)
      
      // 인증되지 않은 경우
      if (!auth.isAuthenticated) {
        window.location.href = '/login'
        return
      }
      
      // 필요한 권한이 없는 경우
      if (requiredRole) {
        const hasPermission = 
          (requiredRole === 'member' && auth.isMember) ||
          (requiredRole === 'admin' && auth.isAdmin) ||
          (requiredRole === 'leader' && auth.isLeader)
        
        if (!hasPermission) {
          window.location.href = '/unauthorized'
        }
      }
    }
  }, [auth, requiredRole])
  
  return {
    isChecking: isChecking || auth.loading,
    hasAccess: auth.isAuthenticated && (!requiredRole || 
      (requiredRole === 'member' && auth.isMember) ||
      (requiredRole === 'admin' && auth.isAdmin) ||
      (requiredRole === 'leader' && auth.isLeader))
  }
}