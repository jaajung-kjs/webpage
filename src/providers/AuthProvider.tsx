/**
 * AuthProvider - 인증 Context Provider (V2 Fixed)
 * 
 * Supabase Auth 세션과 users_v2 프로필을 모두 제공
 * 로그인 문제 해결: 세션 상태와 프로필 상태 통합
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient, connectionCore } from '@/lib/core/connection-core'
import { userMessageSubscriptionManager } from '@/lib/realtime/UserMessageSubscriptionManager'
import type { User, Session } from '@supabase/supabase-js'
import type { Tables } from '@/lib/database.types'
import { UserRole, UserV2, UserV2Update } from '@/hooks/types/v2-types'

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
  
  // 권한 체크 (boolean 값)
  isMember: boolean
  isAdmin: boolean
  isLeader: boolean
  isViceLeader: boolean
  canModerate: boolean
  canViewDetails: boolean
  canDownload: boolean
  canMessage: boolean
  canComment: boolean
  canLike: boolean
  canReport: boolean
  canAccessAdmin: boolean
  canManageMembers: boolean
  canEditAllContent: boolean
  
  // 권한 체크 헬퍼
  hasPermission: (requiredRole: UserRole) => boolean
  
  // 기본 인증 메서드
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: UserV2Update) => Promise<{ error: any }>
  resendEmailConfirmation: (email: string) => Promise<{ error: any }>
  
  // 확장된 인증 메서드
  sendPasswordResetEmail: (email: string) => void
  sendPasswordResetEmailAsync: (email: string) => Promise<boolean>
  updatePassword: (newPassword: string) => void
  updatePasswordAsync: (newPassword: string) => Promise<boolean>
  reauthenticate: (credentials: { email: string; password: string }) => void
  reauthenticateAsync: (credentials: { email: string; password: string }) => Promise<boolean>
  deleteAccount: () => void
  updateLastLogin: () => Promise<void>
  
  // 호환성을 위한 deprecated 메서드
  incrementActivityScore: (params?: { points?: number; action_type?: string }) => void
  
  // React Query 뮤테이션 상태
  isUpdatingProfile: boolean
  isSendingPasswordReset: boolean
  isUpdatingPassword: boolean
  isReauthenticating: boolean
  isDeletingAccount: boolean
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
        
        // 초기 세션이 있으면 메시지 구독 초기화 (중복 방지)
        if (session?.user && !userMessageSubscriptionManager.isActive()) {
          try {
            console.log('[AuthProvider] Initial session found, initializing message subscriptions')
            await userMessageSubscriptionManager.initialize(session.user.id, () => queryClient)
          } catch (error) {
            console.error('[AuthProvider] Initial message subscription initialization failed:', error)
            // 실패해도 앱은 계속 실행
          }
        } else if (session?.user) {
          console.log('[AuthProvider] Initial session found, but message subscriptions already active')
        }
      } catch (err) {
        console.error('Initial session error:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // ConnectionCore 클라이언트 변경 감지 (재연결 시)
    const unsubscribeConnectionChange = connectionCore.onClientChange(async (newClient) => {
      console.log('[AuthProvider] ConnectionCore client changed, updating UserMessageSubscriptionManager')
      
      // UserMessageSubscriptionManager의 QueryClient 참조 업데이트 (재연결만 처리)
      if (user?.id && userMessageSubscriptionManager.isActive()) {
        console.log('[AuthProvider] Updating QueryClient reference for reconnection')
        await userMessageSubscriptionManager.initialize(user.id, () => queryClient)
        console.log('[AuthProvider] UserMessageSubscriptionManager QueryClient updated')
      }
    })

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
          // 로그인 시 메시지 구독 초기화 (중복 방지)
          if (!userMessageSubscriptionManager.isActive()) {
            try {
              console.log('[AuthProvider] SIGNED_IN: User not subscribed, initializing message subscriptions')
              await userMessageSubscriptionManager.initialize(session.user.id, () => queryClient)
            } catch (error) {
              console.error('[AuthProvider] SIGNED_IN: Message subscription initialization failed:', error)
            }
          } else {
            console.log('[AuthProvider] SIGNED_IN: User already subscribed, skipping initialization')
          }
        } else if (event === 'USER_UPDATED' && session?.user) {
          // 사용자 정보 업데이트 시에는 구독 재초기화 불필요
          console.log('[AuthProvider] USER_UPDATED: Skipping message subscription re-initialization')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      unsubscribeConnectionChange()
    }
  }, [queryClient]) // user?.id 제거 - 초기화는 한 번만 실행하고 onAuthStateChange에서 사용자 변경 처리

  // React Query 뮤테이션들
  
  // 프로필 업데이트 뮤테이션 (Optimistic Update)
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: UserV2Update) => {
      if (!user?.id) throw new Error('User not authenticated')
      
      const { data, error } = await supabaseClient()
        .from('users_v2')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .is('deleted_at', null)
        .select()
        .single()
      
      if (error) throw error
      return data as Tables<'users_v2'>
    },
    onMutate: async (updates) => {
      // 이전 데이터 백업
      await queryClient.cancelQueries({ queryKey: ['user-profile-v2', user?.id] })
      const previousProfile = queryClient.getQueryData<Tables<'users_v2'>>(['user-profile-v2', user?.id])
      
      // Optimistic Update
      if (previousProfile) {
        queryClient.setQueryData<Tables<'users_v2'>>(['user-profile-v2', user?.id], {
          ...previousProfile,
          ...updates,
          updated_at: new Date().toISOString()
        })
      }
      
      return { previousProfile }
    },
    onError: (err, _, context) => {
      // 에러 시 롤백
      if (context?.previousProfile) {
        queryClient.setQueryData(['user-profile-v2', user?.id], context.previousProfile)
      }
    },
    onSuccess: (data) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['members-v2'] })
      queryClient.invalidateQueries({ queryKey: ['user-activities-v2', user?.id] })
    }
  })

  // 비밀번호 재설정 이메일 전송
  const sendPasswordResetEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) throw error
      return true
    }
  })

  // 비밀번호 업데이트
  const updatePasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabaseClient().auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      return true
    }
  })

  // 재인증
  const reauthenticateMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabaseClient().auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return true
    }
  })

  // 계정 삭제 (Soft Delete)
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      
      const { error } = await supabaseClient()
        .from('users_v2')
        .update({ 
          deleted_at: new Date().toISOString(),
          email: `deleted_${user.id}@deleted.com`, // 이메일 무효화
          name: 'Deleted User'
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      // Auth 사용자도 삭제 (관리자 권한 필요 시 생략)
      // await supabaseClient().auth.admin.deleteUser(user.id)
    },
    onSuccess: () => {
      queryClient.clear()
      // 로그아웃 처리는 signOut을 호출하여 진행
    }
  })

  // 권한 체크 계산
  const isAuthenticated = !!(session && user && profile)
  const role = profile?.role as UserRole | undefined
  
  const isMember = hasPermission('member', role)
  const isAdmin = role === 'admin'
  const isLeader = role === 'leader' || role === 'admin'
  const isViceLeader = hasPermission('vice-leader', role)
  const canModerate = hasPermission('vice-leader', role)
  const canViewDetails = hasPermission('member', role)
  const canDownload = hasPermission('member', role)
  const canMessage = hasPermission('member', role)
  const canComment = hasPermission('member', role)
  const canLike = hasPermission('member', role)
  const canReport = hasPermission('member', role)
  const canAccessAdmin = hasPermission('vice-leader', role)
  const canManageMembers = hasPermission('vice-leader', role)
  const canEditAllContent = hasPermission('admin', role)
  
  // 권한 체크 헬퍼
  const hasPermissionCheck = (requiredRole: UserRole): boolean => {
    return hasPermission(requiredRole, role)
  }

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

  const updateProfile = async (updates: UserV2Update) => {
    try {
      await updateProfileMutation.mutateAsync(updates)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  // 마지막 로그인 시간 업데이트
  const updateLastLogin = async () => {
    if (!user?.id) return
    
    await supabaseClient()
      .from('users_v2')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('deleted_at', null)
  }

  // 확장된 인증 메서드들
  const sendPasswordResetEmail = (email: string) => {
    sendPasswordResetEmailMutation.mutate(email)
  }

  const sendPasswordResetEmailAsync = async (email: string) => {
    return await sendPasswordResetEmailMutation.mutateAsync(email)
  }

  const updatePassword = (newPassword: string) => {
    updatePasswordMutation.mutate(newPassword)
  }

  const updatePasswordAsync = async (newPassword: string) => {
    return await updatePasswordMutation.mutateAsync(newPassword)
  }

  const reauthenticate = (credentials: { email: string; password: string }) => {
    reauthenticateMutation.mutate(credentials)
  }

  const reauthenticateAsync = async (credentials: { email: string; password: string }) => {
    return await reauthenticateMutation.mutateAsync(credentials)
  }

  const deleteAccount = () => {
    deleteAccountMutation.mutate()
  }

  // 호환성을 위한 deprecated 메서드
  const incrementActivityScore = (params?: { points?: number; action_type?: string }) => {
    console.warn('incrementActivityScore is deprecated. Activity scores are now handled automatically by DB triggers.')
    // 사용자 정보 갱신 (호환성 유지)
    queryClient.invalidateQueries({ queryKey: ['user-profile-v2', user?.id] })
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
    
    // 권한 체크 (boolean 값)
    isMember,
    isAdmin,
    isLeader,
    isViceLeader,
    canModerate,
    canViewDetails,
    canDownload,
    canMessage,
    canComment,
    canLike,
    canReport,
    canAccessAdmin,
    canManageMembers,
    canEditAllContent,
    
    // 권한 체크 헬퍼
    hasPermission: hasPermissionCheck,
    
    // 기본 인증 메서드
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendEmailConfirmation,
    
    // 확장된 인증 메서드
    sendPasswordResetEmail,
    sendPasswordResetEmailAsync,
    updatePassword,
    updatePasswordAsync,
    reauthenticate,
    reauthenticateAsync,
    deleteAccount,
    updateLastLogin,
    
    // 호환성을 위한 deprecated 메서드
    incrementActivityScore,
    
    // React Query 뮤테이션 상태
    isUpdatingProfile: updateProfileMutation.isPending,
    isSendingPasswordReset: sendPasswordResetEmailMutation.isPending,
    isUpdatingPassword: updatePasswordMutation.isPending,
    isReauthenticating: reauthenticateMutation.isPending,
    isDeletingAccount: deleteAccountMutation.isPending
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
      
      // 권한 체크 (boolean 값)
      isMember: false,
      isAdmin: false,
      isLeader: false,
      isViceLeader: false,
      canModerate: false,
      canViewDetails: false,
      canDownload: false,
      canMessage: false,
      canComment: false,
      canLike: false,
      canReport: false,
      canAccessAdmin: false,
      canManageMembers: false,
      canEditAllContent: false,
      
      // 권한 체크 헬퍼
      hasPermission: () => false,
      
      // 기본 인증 메서드 (no-op functions for build time)
      signIn: async () => ({ error: new Error('Not available during build') }),
      signUp: async () => ({ error: new Error('Not available during build') }),
      signOut: async () => ({ error: new Error('Not available during build') }),
      updateProfile: async () => ({ error: new Error('Not available during build') }),
      resendEmailConfirmation: async () => ({ error: new Error('Not available during build') }),
      
      // 확장된 인증 메서드
      sendPasswordResetEmail: () => {},
      sendPasswordResetEmailAsync: async () => false,
      updatePassword: () => {},
      updatePasswordAsync: async () => false,
      reauthenticate: () => {},
      reauthenticateAsync: async () => false,
      deleteAccount: () => {},
      updateLastLogin: async () => {},
      
      // 호환성을 위한 deprecated 메서드
      incrementActivityScore: () => {},
      
      // React Query 뮤테이션 상태
      isUpdatingProfile: false,
      isSendingPasswordReset: false,
      isUpdatingPassword: false,
      isReauthenticating: false,
      isDeletingAccount: false
    } as AuthContextValue
  }
  return context
}