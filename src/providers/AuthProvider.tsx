/**
 * AuthProvider - 인증 Context Provider (V2 Fixed)
 * 
 * Supabase Auth 세션과 users_v2 프로필을 모두 제공
 * 로그인 문제 해결: 세션 상태와 프로필 상태 통합
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { userMessageSubscriptionManager } from '@/lib/realtime/UserMessageSubscriptionManager'
import type { User, Session } from '@supabase/supabase-js'
import type { Tables } from '@/lib/database.types'
import { UserRole } from '@/hooks/types/v2-types'

// 권한 체크 헬퍼
const hasPermission = (requiredRole: UserRole, userRole?: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    'guest': 0,
    'pending': 1,
    'member': 2,
    'vice-leader': 3,
    'leader': 4,
    'admin': 5
  }
  
  if (!userRole) return false
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// 인증 Context 타입
interface AuthContextValue {
  // Supabase Auth 상태
  user: User | null
  session: Session | null
  
  // users_v2 프로필 상태
  profile: Tables<'users_v2'> | null
  
  // 통합 상태
  loading: boolean
  error: any
  isAuthenticated: boolean
  isSigningOut: boolean
  
  // 권한 체크
  isMember: boolean
  isAdmin: boolean
  isLeader: boolean
  canViewDetails: boolean
  canDownload: boolean
  canMessage: boolean
  canComment: boolean
  canLike: boolean
  canReport: boolean
  canAccessAdmin: boolean
  canManageMembers: boolean
  canEditAllContent: boolean
  
  // 메서드 (실제 구현)
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: any) => Promise<{ error: any }>
  resendEmailConfirmation: (email: string) => Promise<{ error: any }>
}

// Context
const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * 인증 Provider 컴포넌트 - 완전 재구현
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const queryClient = useQueryClient()

  // users_v2 프로필 조회
  const { data: profile, isLoading: profileLoading, error } = useQuery<Tables<'users_v2'> | null>({
    queryKey: ['user-profile-v2', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data, error } = await supabaseClient()
        .from('users_v2')
        .select('*')
        .eq('id', user.id)
        .is('deleted_at', null)
        .single()
      
      if (error) {
        console.error('Profile fetch error:', error)
        return null
      }
      return data as Tables<'users_v2'>
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })

  // 세션 초기화 및 변화 감지
  useEffect(() => {
    // 초기 세션 가져오기
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabaseClient().auth.getSession()
        if (error) {
          console.error('Session fetch error:', error)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        // 초기 세션이 있으면 메시지 구독 초기화 (에러 처리 포함)
        if (session?.user) {
          try {
            await userMessageSubscriptionManager.initialize(session.user.id, queryClient)
          } catch (error) {
            console.error('[AuthProvider] Message subscription initialization failed:', error)
            // 실패해도 앱은 계속 실행
          }
        }
      } catch (err) {
        console.error('Initial session error:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabaseClient().auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // 프로필 캐시 무효화
        if (event === 'SIGNED_OUT') {
          // 로그아웃 시 메시지 구독 정리
          userMessageSubscriptionManager.cleanup()
          queryClient.clear()
        } else if (event === 'SIGNED_IN' && session?.user) {
          // 로그인 시 프로필 새로고침
          queryClient.invalidateQueries({ queryKey: ['user-profile-v2', session.user.id] })
          // 로그인 시 메시지 구독 초기화 (에러 처리 포함)
          try {
            await userMessageSubscriptionManager.initialize(session.user.id, queryClient)
          } catch (error) {
            console.error('[AuthProvider] SIGNED_IN: Message subscription initialization failed:', error)
            // 실패해도 앱은 계속 실행
          }
        } else if (event === 'USER_UPDATED' && session?.user) {
          // 사용자 정보 업데이트 시 재초기화 (에러 처리 포함)
          try {
            await userMessageSubscriptionManager.initialize(session.user.id, queryClient)
          } catch (error) {
            console.error('[AuthProvider] USER_UPDATED: Message subscription initialization failed:', error)
            // 실패해도 앱은 계속 실행
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [queryClient])

  // 권한 체크 계산
  const isAuthenticated = !!(session && user && profile)
  const role = profile?.role as UserRole | undefined
  
  const isMember = hasPermission('member', role)
  const isAdmin = role === 'admin'
  const isLeader = role === 'leader' || role === 'admin'
  const canViewDetails = hasPermission('member', role)
  const canDownload = hasPermission('member', role)
  const canMessage = hasPermission('member', role)
  const canComment = hasPermission('member', role)
  const canLike = hasPermission('member', role)
  const canReport = hasPermission('member', role)
  const canAccessAdmin = hasPermission('vice-leader', role)
  const canManageMembers = hasPermission('vice-leader', role)
  const canEditAllContent = hasPermission('admin', role)

  // 인증 메서드들
  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseClient().auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabaseClient().auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    return { error }
  }

  const signOut = async () => {
    if (isSigningOut) {
      console.log('SignOut already in progress, skipping')
      return { error: null }
    }
    
    setIsSigningOut(true)
    
    try {
      // 로그아웃 시 메시지 구독 정리 (signOut 전에 실행)
      userMessageSubscriptionManager.cleanup()
      
      const { error } = await supabaseClient().auth.signOut()
      if (error) {
        console.warn('AuthProvider signOut error:', error)
        // 403이나 네트워크 에러는 로컬에서 정리하고 성공으로 처리
        if (error.status === 403 || error.message?.includes('network') || error.message?.includes('Invalid session')) {
          console.log('Forcing local session cleanup in AuthProvider')
          // 로컬 세션 상태 강제 정리
          setSession(null)
          setUser(null)
          queryClient.clear()
          return { error: null } // 성공으로 처리
        }
        return { error }
      }
      return { error: null }
    } catch (err: any) {
      console.warn('AuthProvider signOut network error:', err)
      // 네트워크 에러는 로컬 세션만 정리
      if (err.name === 'NetworkError' || err.code === 'network_error') {
        setSession(null)
        setUser(null)
        queryClient.clear()
        return { error: null }
      }
      return { error: err }
    } finally {
      setIsSigningOut(false)
    }
  }

  const updateProfile = async (updates: Partial<Tables<'users_v2'>>) => {
    if (!user?.id) return { error: new Error('User not authenticated') }
    
    const { error } = await supabaseClient()
        .from('users_v2')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .is('deleted_at', null)
    
    if (!error) {
      // 프로필 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['user-profile-v2', user.id] })
    }
    
    return { error }
  }

  const resendEmailConfirmation = async (email: string) => {
    const { error } = await supabaseClient().auth.resend({
      type: 'signup',
      email
    })
    return { error }
  }

  const contextValue: AuthContextValue = {
    // Supabase Auth 상태
    user,
    session,
    
    // users_v2 프로필 상태
    profile: profile ?? null,
    
    // 통합 상태
    loading: loading || profileLoading,
    error,
    isAuthenticated,
    isSigningOut,
    
    // 권한
    isMember,
    isAdmin,
    isLeader,
    canViewDetails,
    canDownload,
    canMessage,
    canComment,
    canLike,
    canReport,
    canAccessAdmin,
    canManageMembers,
    canEditAllContent,
    
    // 메서드
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendEmailConfirmation
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 인증 Context 사용 Hook - V2 Fixed
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    // Return default values for build-time rendering
    return {
      // 상태
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      isSigningOut: false,
      
      // 권한
      isMember: false,
      isAdmin: false,
      isLeader: false,
      canViewDetails: false,
      canDownload: false,
      canMessage: false,
      canComment: false,
      canLike: false,
      canReport: false,
      canAccessAdmin: false,
      canManageMembers: false,
      canEditAllContent: false,
      
      // 메서드 (no-op functions for build time)
      signIn: async () => ({ error: new Error('Not available during build') }),
      signUp: async () => ({ error: new Error('Not available during build') }),
      signOut: async () => ({ error: new Error('Not available during build') }),
      updateProfile: async () => ({ error: new Error('Not available during build') }),
      resendEmailConfirmation: async () => ({ error: new Error('Not available during build') })
    } as AuthContextValue
  }
  return context
}