/**
 * useAuthV2 - V2 스키마 기반 인증 Hook
 * 
 * users_v2 테이블을 활용한 최적화된 인증 상태 관리
 * - Soft delete 지원 (deleted_at)
 * - JSONB metadata 활용
 * - 개선된 캐시 전략
 */

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import type { Tables, TablesUpdate } from '@/lib/database.types'
import type { AuthError, Session, User } from '@supabase/supabase-js'

// V2 사용자 타입
type UserV2 = Tables<'users_v2'>
type UserV2Update = TablesUpdate<'users_v2'>

// 인증 상태 타입
interface AuthStateV2 {
  user: User | null
  profile: UserV2 | null
  session: Session | null
  loading: boolean
  error: AuthError | null
}

// 권한 타입
type Role = 'guest' | 'pending' | 'member' | 'vice-leader' | 'leader' | 'admin'

/**
 * V2 사용자 프로필 조회 Hook
 */
export function useUserProfileV2(userId?: string) {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()
      return session
    },
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false
  })

  const targetUserId = userId || session?.user?.id

  return useQuery<UserV2, Error>({
    queryKey: ['user-profile-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')

      const { data, error } = await supabaseClient
        .from('users_v2')
        .select('*')
        .eq('id', targetUserId)
        .eq('is_active', true)
        .is('deleted_at', null) // Soft delete 체크
        .single()

      if (error) throw error
      return data
    },
    enabled: !!targetUserId,
    staleTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * V2 인증 상태 Hook
 */
export function useAuthV2() {
  const queryClient = useQueryClient()
  const [authState, setAuthState] = useState<AuthStateV2>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null
  })

  // 세션 조회
  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data: { session }, error } = await supabaseClient.auth.getSession()
      if (error) throw error
      return session
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  })

  // 프로필 조회 (세션이 있을 때만)
  const { data: profile, isLoading: profileLoading, error: profileError } = useUserProfileV2(
    session?.user?.id
  )

  // 인증 상태 업데이트
  useEffect(() => {
    setAuthState({
      user: session?.user || null,
      profile: profile || null,
      session: session || null,
      loading: sessionLoading || (session?.user && profileLoading),
      error: (sessionError as AuthError) || (profileError as AuthError) || null
    })
  }, [session, profile, sessionLoading, profileLoading, sessionError, profileError])

  // 실시간 인증 상태 구독
  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        // 세션 쿼리 무효화
        queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })
        
        if (session?.user) {
          // 프로필 쿼리 무효화
          queryClient.invalidateQueries({ queryKey: ['user-profile-v2', session.user.id] })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [queryClient])

  // 인증 메서드들
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }, [])

  const signUp = useCallback(async (
    email: string, 
    password: string,
    metadata?: { name?: string; department?: string }
  ) => {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabaseClient.auth.signOut()
    
    // 모든 캐시 클리어
    queryClient.clear()
    
    return { error }
  }, [queryClient])

  // 권한 체크 메서드들 (메모이제이션)
  const permissions = useMemo(() => {
    const role = profile?.role as Role | undefined

    return {
      role,
      isMember: role && ['member', 'vice-leader', 'leader', 'admin'].includes(role),
      isAdmin: role && ['admin'].includes(role),
      isLeader: role && ['leader', 'admin'].includes(role),
      isViceLeader: role && ['vice-leader', 'leader', 'admin'].includes(role),
      canViewDetails: role && ['member', 'vice-leader', 'leader', 'admin'].includes(role),
      canDownload: role && ['member', 'vice-leader', 'leader', 'admin'].includes(role),
      canMessage: role && ['member', 'vice-leader', 'leader', 'admin'].includes(role),
      canComment: role && ['member', 'vice-leader', 'leader', 'admin'].includes(role),
      canLike: role && ['member', 'vice-leader', 'leader', 'admin'].includes(role),
      canReport: role && ['member', 'vice-leader', 'leader', 'admin'].includes(role),
      canAccessAdmin: role && ['vice-leader', 'leader', 'admin'].includes(role),
      canManageMembers: role && ['leader', 'admin'].includes(role),
      canEditAllContent: role && ['leader', 'admin'].includes(role)
    }
  }, [profile?.role])

  return {
    // 상태
    user: authState.user,
    profile: authState.profile,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.session,
    
    // 권한
    ...permissions,
    
    // 메서드
    signIn,
    signUp,
    signOut
  }
}

/**
 * V2 프로필 업데이트 Hook
 */
export function useUpdateProfileV2() {
  const queryClient = useQueryClient()
  const { user } = useAuthV2()

  return useMutation<UserV2, Error, UserV2Update>({
    mutationFn: async (updates) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabaseClient
        .from('users_v2')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (updates) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['user-profile-v2', user?.id] })
      
      const previousProfile = queryClient.getQueryData<UserV2>(['user-profile-v2', user?.id])
      
      if (previousProfile) {
        queryClient.setQueryData(['user-profile-v2', user?.id], {
          ...previousProfile,
          ...updates,
          updated_at: new Date().toISOString()
        })
      }
      
      return { previousProfile }
    },
    onError: (err, updates, context) => {
      // 롤백
      if (context?.previousProfile) {
        queryClient.setQueryData(['user-profile-v2', user?.id], context.previousProfile)
      }
    },
    onSettled: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['user-profile-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['profile-v2'] })
    }
  })
}

/**
 * 사용자 활동 점수 업데이트 Hook
 */
export function useUpdateActivityScore() {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, { userId: string; increment: number }>({
    mutationFn: async ({ userId, increment }) => {
      const { error } = await supabaseClient
        .rpc('increment_activity_score_v2', {
          user_id: userId,
          score_increment: increment
        })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      // 해당 사용자 프로필만 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['user-profile-v2', variables.userId] 
      })
    }
  })
}

/**
 * 권한 확인 Hook
 */
export function usePermissionV2(permission: Role): boolean {
  const { profile, loading } = useAuthV2()

  const hasPermission = useMemo(() => {
    if (loading) return false
    
    const userRole = profile?.role as Role | undefined
    if (!userRole) return false

    const roleHierarchy: Record<Role, number> = {
      guest: 0,
      pending: 1,
      member: 2,
      'vice-leader': 3,
      leader: 4,
      admin: 5
    }

    return roleHierarchy[userRole] >= roleHierarchy[permission]
  }, [profile?.role, permission, loading])

  return hasPermission
}

/**
 * 인증 가드 Hook
 */
export function useRequireAuthV2(requiredRole?: Role) {
  const { isAuthenticated, profile, loading } = useAuthV2()

  const { hasAccess, isChecking } = useMemo(() => {
    if (loading) return { hasAccess: false, isChecking: true }
    
    if (!isAuthenticated) {
      return { hasAccess: false, isChecking: false }
    }

    if (!requiredRole) {
      return { hasAccess: true, isChecking: false }
    }

    const userRole = profile?.role as Role | undefined
    if (!userRole) return { hasAccess: false, isChecking: false }

    const roleHierarchy: Record<Role, number> = {
      guest: 0,
      pending: 1,
      member: 2,
      'vice-leader': 3,
      leader: 4,
      admin: 5
    }

    const hasPermission = roleHierarchy[userRole] >= roleHierarchy[requiredRole]
    return { hasAccess: hasPermission, isChecking: false }
  }, [isAuthenticated, profile?.role, requiredRole, loading])

  useEffect(() => {
    if (!isChecking && !hasAccess && typeof window !== 'undefined') {
      if (!isAuthenticated) {
        window.location.href = '/login'
      } else {
        window.location.href = '/unauthorized'
      }
    }
  }, [isChecking, hasAccess, isAuthenticated])

  return { isChecking, hasAccess }
}