/**
 * useAuth - 인증 상태 관리 Hook
 * 
 * AuthManager의 React 바인딩
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { authManager, AuthState } from '@/lib/core/auth-manager'
import type { AuthError } from '@supabase/supabase-js'

/**
 * 인증 상태를 관리하는 메인 Hook
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>(() => 
    authManager.getState()
  )

  useEffect(() => {
    // 인증 상태 구독
    const unsubscribe = authManager.subscribe(setState)
    return unsubscribe
  }, [])

  // 인증 메서드들
  const signIn = useCallback(async (email: string, password: string) => {
    return authManager.signIn(email, password)
  }, [])

  const signUp = useCallback(async (
    email: string, 
    password: string,
    metadata?: { name?: string; department?: string }
  ) => {
    return authManager.signUp(email, password, metadata)
  }, [])

  const signOut = useCallback(async () => {
    return authManager.signOut()
  }, [])

  const updateProfile = useCallback(async (updates: any) => {
    return authManager.updateProfile(updates)
  }, [])

  const resendEmailConfirmation = useCallback(async (email: string) => {
    return authManager.resendEmailConfirmation(email)
  }, [])

  // 권한 체크 메모이제이션
  const permissions = useMemo(() => ({
    isMember: authManager.isMember(),
    isAdmin: authManager.isAdmin(),
    isLeader: authManager.isLeader(),
    canViewDetails: authManager.isMember(),
    canDownload: authManager.isMember(),
    canMessage: authManager.isMember(),
    canComment: authManager.isMember(),
    canLike: authManager.isMember(),
    canReport: authManager.isMember(),
    canAccessAdmin: authManager.isAdmin(),
    canManageMembers: authManager.isAdmin(),
    canEditAllContent: authManager.isLeader()
  }), [state.profile?.role])

  return {
    // 상태
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: authManager.isAuthenticated(),
    
    // 권한
    ...permissions,
    
    // 메서드
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendEmailConfirmation
  }
}

/**
 * 간단한 인증 확인 Hook
 */
export function useIsAuthenticated(): boolean {
  const [isAuthenticated, setIsAuthenticated] = useState(() => 
    authManager.isAuthenticated()
  )

  useEffect(() => {
    const unsubscribe = authManager.subscribe((state) => {
      setIsAuthenticated(!!state.session)
    })
    return unsubscribe
  }, [])

  return isAuthenticated
}

/**
 * 사용자 정보만 가져오는 Hook
 */
export function useUser() {
  const [user, setUser] = useState(() => {
    const state = authManager.getState()
    return state.user
  })

  useEffect(() => {
    const unsubscribe = authManager.subscribe((state) => {
      setUser(state.user)
    })
    return unsubscribe
  }, [])

  return user
}

/**
 * 프로필 정보만 가져오는 Hook
 */
export function useProfile() {
  const [profile, setProfile] = useState(() => {
    const state = authManager.getState()
    return state.profile
  })

  useEffect(() => {
    const unsubscribe = authManager.subscribe((state) => {
      setProfile(state.profile)
    })
    return unsubscribe
  }, [])

  return profile
}

/**
 * 권한 확인 Hook
 */
export function usePermission(permission: 'member' | 'admin' | 'leader'): boolean {
  const [hasPermission, setHasPermission] = useState(() => {
    switch (permission) {
      case 'member':
        return authManager.isMember()
      case 'admin':
        return authManager.isAdmin()
      case 'leader':
        return authManager.isLeader()
      default:
        return false
    }
  })

  useEffect(() => {
    const unsubscribe = authManager.subscribe(() => {
      switch (permission) {
        case 'member':
          setHasPermission(authManager.isMember())
          break
        case 'admin':
          setHasPermission(authManager.isAdmin())
          break
        case 'leader':
          setHasPermission(authManager.isLeader())
          break
      }
    })
    return unsubscribe
  }, [permission])

  return hasPermission
}

/**
 * 인증 필수 페이지용 가드 Hook
 */
export function useRequireAuth(requiredRole?: 'member' | 'admin' | 'leader') {
  const { isAuthenticated, isMember, isAdmin, isLeader, loading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (!loading) {
      setIsChecking(false)
      
      // 인증되지 않은 경우
      if (!isAuthenticated) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return
      }
      
      // 권한 확인
      let access = true
      if (requiredRole) {
        access = 
          (requiredRole === 'member' && isMember) ||
          (requiredRole === 'admin' && isAdmin) ||
          (requiredRole === 'leader' && isLeader)
        
        if (!access && typeof window !== 'undefined') {
          window.location.href = '/unauthorized'
        }
      }
      
      setHasAccess(access)
    }
  }, [isAuthenticated, isMember, isAdmin, isLeader, loading, requiredRole])

  return {
    isChecking: isChecking || loading,
    hasAccess
  }
}