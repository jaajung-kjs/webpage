/**
 * useAuthV2 - V2 스키마 기반 인증 및 사용자 관리 Hook
 * 
 * 주요 개선사항:
 * - users_v2 테이블 사용
 * - Soft delete 지원 (deleted_at)
 * - 활동 점수 자동 업데이트
 * - Optimistic Updates
 * - 개선된 캐시 전략
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth as useProviderAuth } from '@/providers'
import { supabaseClient } from '@/lib/core/connection-core'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { UserV2, UserV2Insert, UserV2Update, UserRole } from '@/hooks/types/v2-types'

// 권한 체크 헬퍼
export const hasPermission = (requiredRole: UserRole, userRole?: UserRole): boolean => {
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

export function useAuthV2() {
  const supabase = supabaseClient
  const { user } = useProviderAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  // 현재 사용자 정보 조회 (Soft delete 고려)
  const { data: currentUser, isLoading, error } = useQuery<UserV2 | null>({
    queryKey: ['user-v2', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      
      const { data, error } = await supabase
        .from('users_v2')
        .select('*')
        .eq('id', user.id)
        .is('deleted_at', null)
        .single()
      
      if (error) throw error
      return data as UserV2
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })

  // 사용자 프로필 업데이트 (Optimistic Update)
  const updateProfile = useMutation({
    mutationFn: async (updates: UserV2Update) => {
      if (!user?.id) throw new Error('User not authenticated')
      
      const { data, error } = await supabase
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
      return data as UserV2
    },
    onMutate: async (updates) => {
      // 이전 데이터 백업
      await queryClient.cancelQueries({ queryKey: ['user-v2', user?.id] })
      const previousUser = queryClient.getQueryData<UserV2>(['user-v2', user?.id])
      
      // Optimistic Update
      if (previousUser) {
        queryClient.setQueryData<UserV2>(['user-v2', user?.id], {
          ...previousUser,
          ...updates,
          updated_at: new Date().toISOString()
        })
      }
      
      return { previousUser }
    },
    onError: (err, _, context) => {
      // 에러 시 롤백
      if (context?.previousUser) {
        queryClient.setQueryData(['user-v2', user?.id], context.previousUser)
      }
    },
    onSuccess: (data) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['members-v2'] })
      queryClient.invalidateQueries({ queryKey: ['user-activities-v2', user?.id] })
    }
  })

  // 활동 점수 증가 (RPC 함수 활용)
  const incrementActivityScore = useMutation({
    mutationFn: async ({ points = 1, action_type = 'general' }: { points?: number, action_type?: string } = {}) => {
      if (!user?.id) throw new Error('User not authenticated')
      
      const { data, error } = await supabase
        .rpc('increment_activity_score_v2', {
          p_user_id: user.id,
          p_action_type: action_type,
          p_points: points
        })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // 사용자 정보 갱신
      queryClient.invalidateQueries({ queryKey: ['user-v2', user?.id] })
    }
  })

  // 마지막 로그인 시간 업데이트
  const updateLastLogin = useCallback(async () => {
    if (!user?.id) return
    
    await supabase
      .from('users_v2')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('deleted_at', null)
  }, [user?.id, supabase])

  // 로그아웃 (개선된 에러 핸들링)
  const signOut = useMutation({
    mutationFn: async () => {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.warn('Supabase signOut API error:', error)
          // 403이나 네트워크 에러여도 로컬 세션은 정리해야 함
          if (error.status === 403 || error.message?.includes('network')) {
            console.log('Forcing local session cleanup due to network/permission error')
            return // 에러를 throw하지 않고 정상 처리로 간주
          }
          throw error
        }
      } catch (err: any) {
        console.warn('SignOut network error, forcing local cleanup:', err)
        // 네트워크 에러나 403은 로컬에서 정리하고 성공으로 처리
        if (err.status === 403 || err.code === 'network_error' || err.name === 'NetworkError') {
          return
        }
        throw err
      }
    },
    onSettled: () => {
      // 성공/실패와 관계없이 항상 로컬 세션 정리
      console.log('Clearing local session data')
      queryClient.clear()
      
      // 현재 경로가 보호된 경로인지 확인하고 적절한 경로로 리다이렉트
      const currentPath = window.location.pathname
      const protectedPaths = ['/profile', '/admin', '/settings', '/activities']
      
      if (protectedPaths.some(path => currentPath.startsWith(path))) {
        router.push('/')
      } else {
        router.refresh() // 현재 페이지에서 상태만 새로고침
      }
    },
    onError: (error: any) => {
      console.error('SignOut error details:', error)
      // 에러가 발생해도 사용자에게는 로그아웃이 완료된 것으로 보이도록 함
    }
  })

  // 사용자 삭제 (Soft Delete)
  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      
      const { error } = await supabase
        .from('users_v2')
        .update({ 
          deleted_at: new Date().toISOString(),
          email: `deleted_${user.id}@deleted.com`, // 이메일 무효화
          name: 'Deleted User'
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      // Auth 사용자도 삭제
      await supabase.auth.admin.deleteUser(user.id)
    },
    onSuccess: () => {
      queryClient.clear()
      router.push('/')
    }
  })

  // 권한 체크 헬퍼 함수들
  const isAdmin = useCallback(() => {
    return currentUser?.role === 'admin'
  }, [currentUser])

  const isLeader = useCallback(() => {
    return currentUser?.role === 'leader' || currentUser?.role === 'admin'
  }, [currentUser])

  const isViceLeader = useCallback(() => {
    return hasPermission('vice-leader', currentUser?.role as UserRole)
  }, [currentUser])

  const isMember = useCallback(() => {
    return hasPermission('member', currentUser?.role as UserRole)
  }, [currentUser])

  const canModerate = useCallback(() => {
    return hasPermission('vice-leader', currentUser?.role as UserRole)
  }, [currentUser])

  return {
    // 상태
    user: currentUser,
    isLoading,
    error,
    isAuthenticated: !!user && !!currentUser,
    
    // 권한 체크
    isAdmin,
    isLeader,
    isViceLeader,
    isMember,
    canModerate,
    hasPermission: (requiredRole: UserRole) => hasPermission(requiredRole, currentUser?.role as UserRole),
    
    // 액션
    updateProfile: updateProfile.mutate,
    updateProfileAsync: updateProfile.mutateAsync,
    incrementActivityScore: incrementActivityScore.mutate,
    updateLastLogin,
    signOut: signOut.mutate,
    deleteAccount: deleteAccount.mutate,
    
    // 뮤테이션 상태
    isUpdatingProfile: updateProfile.isPending,
    isSigningOut: signOut.isPending,
    isDeletingAccount: deleteAccount.isPending,
  }
}

// 권한 보호 Hook
export function useRequireAuth(requiredRole: UserRole = 'member') {
  const { user, isLoading, hasPermission } = useAuthV2()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !hasPermission(requiredRole)) {
      router.push('/login')
    }
  }, [isLoading, hasPermission, requiredRole, router])

  return { user, isLoading }
}

// 관리자 전용 Hook
export function useRequireAdmin() {
  return useRequireAuth('admin')
}

// 운영진 전용 Hook  
export function useRequireModerator() {
  return useRequireAuth('vice-leader')
}