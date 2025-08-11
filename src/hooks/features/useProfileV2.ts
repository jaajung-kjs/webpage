/**
 * useProfileV2 - V2 스키마 기반 프로필 관리 Hook
 * 
 * users_v2 테이블과 관련 RPC 함수를 사용하는 프로필 시스템
 * 
 * 주요 기능:
 * - 사용자 프로필 조회 및 업데이트
 * - 활동 점수 및 레벨 관리
 * - 사용자 통계 조회
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useMemo } from 'react'

type UserV2 = Tables<'users_v2'>
type UserV2Insert = TablesInsert<'users_v2'>
type UserV2Update = TablesUpdate<'users_v2'>

/**
 * 사용자 프로필 조회 Hook
 * 
 * users_v2 테이블에서 사용자 정보를 조회
 * 
 * @param userId - 조회할 사용자 ID (없으면 현재 사용자)
 */
export function useUserProfileV2(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery<UserV2 | null, Error>({
    queryKey: ['user-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null

      const { data, error } = await supabaseClient
        .from('users_v2')
        .select('*')
        .eq('id', targetUserId)
        .is('deleted_at', null)
        .single()

      if (error) {
        console.error('Error fetching user v2:', error)
        throw error
      }

      return data
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false
  })
}



/**
 * 사용자 레벨 계산 Hook
 * 
 * calculate_user_level_v2 RPC를 사용하여 레벨 계산
 */
export function useUserLevelV2(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery<number, Error>({
    queryKey: ['user-level-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return 0

      const { data, error } = await supabaseClient
        .rpc('calculate_user_level_v2', {
          p_user_id: targetUserId
        })

      if (error) {
        console.error('Error calculating user level:', error)
        throw error
      }

      return data || 0
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
}

/**
 * 사용자 활동 점수 계산 Hook
 * 
 * calculate_activity_score RPC를 사용하여 활동 점수 계산
 */
export function useUserActivityScoreV2(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery<number, Error>({
    queryKey: ['user-activity-score-v2', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return 0

      const { data, error } = await supabaseClient
        .rpc('calculate_activity_score', {
          p_user_id: targetUserId
        })

      if (error) {
        console.error('Error calculating activity score:', error)
        throw error
      }

      return data || 0
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
}

/**
 * 여러 사용자 프로필 조회 Hook
 * 
 * @param userIds - 조회할 사용자 ID 배열
 */
export function useUsersProfilesV2(userIds: string[]) {
  return useQuery<UserV2[], Error>({
    queryKey: ['users-v2', userIds],
    queryFn: async () => {
      if (!userIds.length) return []

      const { data, error } = await supabaseClient
        .from('users_v2')
        .select('*')
        .in('id', userIds)
        .is('deleted_at', null)

      if (error) throw error
      return data || []
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

/**
 * 프로필 목록 조회 Hook (회원 목록용)
 * 
 * 페이지네이션과 필터링을 지원하는 프로필 목록 조회
 * 
 * @param options - 조회 옵션 (페이지, 필터 등)
 */
export function useProfileListV2(options?: {
  page?: number
  limit?: number
  role?: string
  search?: string
  orderBy?: 'name' | 'activity_score' | 'created_at'
  order?: 'asc' | 'desc'
}) {
  const {
    page = 1,
    limit = 20,
    role,
    search,
    orderBy = 'name',
    order = 'asc'
  } = options || {}

  return useQuery<UserV2[], Error>({
    queryKey: ['profile-v2-list', page, limit, role, search, orderBy, order],
    queryFn: async () => {
      let query = supabaseClient
        .from('users_v2')
        .select('*')
        .is('deleted_at', null)

      // 필터 적용
      if (role) {
        query = query.eq('role', role)
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      }

      // 정렬
      query = query.order(orderBy, { ascending: order === 'asc' })

      // 페이지네이션
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2분
    refetchOnWindowFocus: false
  })
}

/**
 * 프로필 업데이트 Hook
 * 
 * users_v2 테이블 업데이트
 */
export function useUpdateProfileV2() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<UserV2, Error, UserV2Update>({
    mutationFn: async (updates) => {
      if (!user) throw new Error('User is not authenticated')

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
    onSuccess: (data) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['user-v2'] })
      queryClient.invalidateQueries({ queryKey: ['profile-v2'] })
      toast.success('프로필이 업데이트되었습니다.')
    },
    onError: (error) => {
      console.error('Profile update error:', error)
      toast.error('프로필 업데이트에 실패했습니다.')
    }
  })
}

/**
 * @deprecated 활동 점수는 이제 DB 트리거에서 자동으로 처리됩니다.
 * 
 * 모든 활동 점수 증가/차감은 DB 레벨에서 다음과 같이 자동 처리됩니다:
 * - 게시글 작성/삭제: content_v2 트리거
 * - 댓글 작성/삭제: comments_v2 함수 및 트리거
 * - 좋아요/북마크: interactions_v2 트리거
 * - 활동 참가/취소/출석: activity_participants_v2 함수
 * 
 * 프론트엔드에서 직접 호출할 필요가 없습니다.
 */

/**
 * 사용자 상호작용 통계 조회 Hook
 * 
 * get_user_interactions_v2 RPC 사용
 */
export function useUserInteractionsV2(
  userId?: string,
  targetType?: string,
  interactionType?: string
) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery<any, Error>({
    queryKey: ['user-interactions-v2', targetUserId, targetType, interactionType],
    queryFn: async () => {
      if (!targetUserId) return null

      // 임시로 빈 배열 반환 (get_user_interactions_v2 함수가 없음)
      return []
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

/**
 * 사용자 활동 이력 조회 Hook
 * 
 * get_user_activity_history_v2 RPC 사용
 */
export function useUserActivityHistoryV2(userId?: string, includePast: boolean = false) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery<any, Error>({
    queryKey: ['user-activity-history-v2', targetUserId, includePast],
    queryFn: async () => {
      if (!targetUserId) return null

      const { data, error } = await supabaseClient
        .rpc('get_user_activity_history_v2', {
          p_user_id: targetUserId,
          p_include_past: includePast
        })

      if (error) throw error
      return data
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

/**
 * 사용자 최근 활동 조회 Hook
 * 
 * get_user_recent_activities_v2 RPC 사용
 */
export function useUserRecentActivitiesV2(userId?: string, limit: number = 10) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery<any, Error>({
    queryKey: ['user-recent-activities-v2', targetUserId, limit],
    queryFn: async () => {
      if (!targetUserId) return []

      const { data, error } = await supabaseClient
        .rpc('get_user_recent_activities_v2', {
          p_user_id: targetUserId,
          p_limit: limit
        })

      if (error) {
        console.error('Error fetching recent activities:', error)
        throw error
      }

      return data || []
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}



/**
 * 프로필 프리페치 Hook
 * 
 * 사용자가 프로필을 볼 가능성이 있을 때 미리 데이터를 가져옴
 * 
 * @param userId - 프리페치할 사용자 ID
 */
export function usePrefetchProfileV2(userId: string) {
  const queryClient = useQueryClient()

  return () => {
    queryClient.prefetchQuery({
      queryKey: ['user-v2', userId],
      queryFn: async () => {
        const { data, error } = await supabaseClient
          .from('users_v2')
          .select('*')
          .eq('id', userId)
          .is('deleted_at', null)
          .single()

        if (error) throw error
        return data
      },
      staleTime: 5 * 60 * 1000
    })
  }
}

/**
 * Avatar 업로드 Hook
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<string, Error, File>({
    mutationFn: async (file) => {
      if (!user) throw new Error('User is not authenticated')
      
      // 파일 이름 생성
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`
      
      // Supabase Storage에 업로드
      const { data, error } = await supabaseClient.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error
      
      // Public URL 생성
      const { data: { publicUrl } } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(fileName)

      return publicUrl
    },
    onSuccess: (avatarUrl) => {
      // 사용자 프로필의 avatar_url 업데이트
      queryClient.invalidateQueries({ queryKey: ['user-v2'] })
      toast.success('프로필 사진이 업데이트되었습니다.')
    },
    onError: (error) => {
      console.error('Avatar upload error:', error)
      toast.error('프로필 사진 업로드에 실패했습니다.')
    }
  })
}


/**
 * Complete user profile with all data combined
 * This is a wrapper for backward compatibility with the test page
 * 
 * @param userId - User ID
 * @param includeAchievements - Whether to include achievements (deprecated) 
 * @param limit - Limit for activities (not used in V2)
 * @param includeStats - Whether to include stats
 */
export function useUserProfileComplete(
  userId?: string, 
  includeAchievements?: boolean, 
  limit?: number, 
  includeStats?: boolean
) {
  const profileQuery = useUserProfileV2(userId)
  const { data: statsData, isLoading: isStatsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['user-stats-v2', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required')
      
      // DB 함수 사용으로 롤백
      const { data, error } = await supabaseClient
        .rpc('get_user_stats_v2', {
          p_user_id: userId
        })

      if (error) {
        console.error('Error fetching user stats:', error)
        throw error
      }

      return data
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3분
    gcTime: 8 * 60 * 1000, // 8분
    refetchOnWindowFocus: false
  })
  const activitiesQuery = useUserRecentActivitiesV2(userId, limit)

  // 최근 활동 데이터 포맷 변환 (RPC 함수가 중첩된 형태로 반환하므로 평탄화)
  const formattedActivities = useMemo(() => {
    if (!activitiesQuery.data) return []
    
    // RPC 함수가 중첩된 배열 형태로 반환하는 경우 처리
    if (Array.isArray(activitiesQuery.data) && activitiesQuery.data.length > 0) {
      // 첫 번째 요소가 객체이고 get_user_recent_activities_v2 키를 가진 경우
      if (activitiesQuery.data[0]?.get_user_recent_activities_v2) {
        return activitiesQuery.data[0].get_user_recent_activities_v2
      }
      // 이미 평탄화된 데이터인 경우
      return activitiesQuery.data
    }
    
    return []
  }, [activitiesQuery.data])

  return {
    data: profileQuery.data ? {
      profile: profileQuery.data,
      stats: statsData,
      recent_activities: formattedActivities,
      achievements: [],
      achievement_stats: null
    } : null,
    isLoading: profileQuery.isLoading || activitiesQuery.isLoading || isStatsLoading,
    error: profileQuery.error || activitiesQuery.error || statsError,
    refetch: () => {
      profileQuery.refetch()
      refetchStats()
      activitiesQuery.refetch()
    }
  }
}

// Legacy aliases for backward compatibility
export const useUserProfile = useUserProfileV2  
export const useUserActivities = useUserActivityHistoryV2
export const useProfileList = useProfileListV2
export const useUserProfilesComplete = useUsersProfilesV2

