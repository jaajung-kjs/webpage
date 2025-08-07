/**
 * Profile System V2 - Hooks
 * 
 * 새로운 통합 프로필 시스템을 위한 React Query hooks
 * 기존 시스템과 병행 운영 가능
 * 
 * @see /src/types/profile-v2.ts - 타입 정의
 * @see /supabase/migrations/20250128_profile_v2_phase1.sql - DB 스키마
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { calculateActivityLevel } from '@/lib/activityLevels'
import type {
  UserProfileComplete,
  ProfileUpdateRequest,
  ProfileListItem,
  ProfileSummary,
  AchievementProgress
} from '@/types/profile-v2'

/**
 * 통합 프로필 조회 Hook
 * 
 * 단일 RPC 호출로 모든 프로필 데이터를 가져옴
 * - 프로필 정보
 * - 통계 데이터
 * - 최근 활동
 * - 업적 진행률 (2025-08-07 추가)
 * 
 * @param userId - 조회할 사용자 ID (없으면 현재 사용자)
 * @param includeActivities - 최근 활동 포함 여부 (기본: true)
 * @param activitiesLimit - 최근 활동 개수 제한 (기본: 10)
 * @param includeAchievements - 업적 데이터 포함 여부 (기본: true)
 */
export function useUserProfileComplete(
  userId?: string,
  includeActivities: boolean = true,
  activitiesLimit: number = 10,
  includeAchievements: boolean = true
) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery<UserProfileComplete, Error>({
    queryKey: ['profile-v2', targetUserId, includeActivities, activitiesLimit, includeAchievements],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')

      const { data, error } = await supabaseClient
        .rpc('get_user_profile_complete_v2', {
          target_user_id: targetUserId,
          include_activities: includeActivities,
          activities_limit: activitiesLimit,
          include_achievements: includeAchievements
        })

      if (error) {
        console.error('Error fetching profile v2:', error)
        throw error
      }

      // RPC는 JSON을 반환하므로 타입 단언
      return data as unknown as UserProfileComplete
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분 (구 cacheTime)
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * 프로필 통계만 조회하는 Hook
 * 
 * Materialized View를 직접 조회하여 통계만 빠르게 가져옴
 * 
 * @param userId - 조회할 사용자 ID
 * 
 * @deprecated Materialized View가 아직 생성되지 않음. V2 마이그레이션 후 사용
 */
// export function useUserStatsV2(userId?: string) {
//   const { user } = useAuth()
//   const targetUserId = userId || user?.id

//   return useQuery({
//     queryKey: ['profile-v2-stats', targetUserId],
//     queryFn: async () => {
//       if (!targetUserId) throw new Error('User ID is required')

//       const { data, error } = await supabaseClient
//         .from('user_complete_stats')
//         .select('*')
//         .eq('user_id', targetUserId)
//         .single()

//       if (error) throw error
//       return data
//     },
//     enabled: !!targetUserId,
//     staleTime: 5 * 60 * 1000,
//     refetchOnWindowFocus: false
//   })
// }

/**
 * 여러 사용자의 전체 프로필 조회 Hook (회원 목록용)
 * 
 * @param userIds - 조회할 사용자 ID 배열
 * @param options - 조회 옵션
 */
export function useUserProfilesComplete(
  userIds: string[],
  options?: {
    includeActivities?: boolean
    includeAchievements?: boolean
    activitiesLimit?: number
  }
) {
  const {
    includeActivities = false,
    includeAchievements = true,
    activitiesLimit = 0
  } = options || {}

  return useQuery<UserProfileComplete[], Error>({
    queryKey: ['users-profiles-complete', userIds, includeActivities, includeAchievements],
    queryFn: async () => {
      if (!userIds.length) return []

      // 병렬로 각 사용자의 프로필 조회
      const promises = userIds.map(userId =>
        supabaseClient
          .rpc('get_user_profile_complete_v2', {
            target_user_id: userId,
            include_activities: includeActivities,
            activities_limit: activitiesLimit,
            include_achievements: includeAchievements
          })
          .then(({ data, error }) => {
            if (error) throw error
            return data as unknown as UserProfileComplete
          })
      )

      return Promise.all(promises)
    },
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false
  })
}

/**
 * 여러 사용자의 간단한 통계 조회 Hook (회원 목록용)
 * 
 * @param userIds - 조회할 사용자 ID 배열
 */
export function useUsersSimpleStats(userIds: string[]) {
  return useQuery<Array<{
    user_id: string
    posts_count: number
    comments_count: number
    activities_joined: number
  }>, Error>({
    queryKey: ['users-simple-stats', userIds],
    queryFn: async () => {
      if (!userIds.length) return []

      const { data, error } = await supabaseClient
        .rpc('get_users_simple_stats', {
          p_user_ids: userIds
        })

      if (error) throw error
      return data as any
    },
    enabled: userIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2분
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
export function useProfileList(options?: {
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

  return useQuery<ProfileListItem[], Error>({
    queryKey: ['profile-v2-list', page, limit, role, search, orderBy, order],
    queryFn: async () => {
      let query = supabaseClient
        .from('users')
        .select(`
          id,
          name,
          email,
          avatar_url,
          department,
          role,
          activity_score,
          last_seen_at,
          metadata,
          created_at,
          bio
        `)

      // 필터 적용
      if (role) {
        query = query.eq('role', role as any)
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
      return data as ProfileListItem[]
    },
    staleTime: 2 * 60 * 1000, // 2분
    refetchOnWindowFocus: false
  })
}

/**
 * 프로필 업데이트 Hook
 * 
 * 기존 시스템과 호환되는 프로필 업데이트
 */
export function useUpdateProfileV2() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<any, Error, ProfileUpdateRequest>({
    mutationFn: async (updates) => {
      if (!user) throw new Error('User is not authenticated')

      const { data, error } = await supabaseClient
        .from('users')
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
      // 캐시 무효화 - 새 시스템과 기존 시스템 모두
      queryClient.invalidateQueries({ queryKey: ['profile-v2'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('프로필이 업데이트되었습니다.')
    },
    onError: (error) => {
      console.error('Profile update error:', error)
      toast.error('프로필 업데이트에 실패했습니다.')
    }
  })
}

/**
 * Materialized View 갱신 Hook
 * 
 * 관리자용: 통계 데이터를 수동으로 갱신
 * 
 * @deprecated refresh_user_stats RPC가 아직 생성되지 않음
 */
// export function useRefreshStats() {
//   const queryClient = useQueryClient()

//   return useMutation({
//     mutationFn: async () => {
//       const { error } = await supabaseClient
//         .rpc('refresh_user_stats')

//       if (error) throw error
//     },
//     onSuccess: () => {
//       // 통계 관련 캐시 무효화
//       queryClient.invalidateQueries({ queryKey: ['profile-v2'] })
//       queryClient.invalidateQueries({ queryKey: ['profile-v2-stats'] })
//       toast.success('통계가 갱신되었습니다.')
//     },
//     onError: (error) => {
//       console.error('Stats refresh error:', error)
//       toast.error('통계 갱신에 실패했습니다.')
//     }
//   })
// }

/**
 * 프로필 요약 정보 Hook (대시보드용)
 * 
 * 여러 사용자의 요약 정보를 한 번에 조회
 * 
 * @param userIds - 조회할 사용자 ID 배열
 */
export function useProfileSummaries(userIds: string[]) {
  return useQuery<ProfileSummary[], Error>({
    queryKey: ['profile-v2-summaries', userIds],
    queryFn: async () => {
      if (!userIds.length) return []

      // 여러 사용자 정보를 병렬로 조회
      const promises = userIds.map(async (userId) => {
        const { data } = await supabaseClient
          .rpc('get_user_profile_complete_v2', {
            target_user_id: userId,
            include_activities: false,
            activities_limit: 0
          })

        if (!data) return null

        const profileData = data as unknown as UserProfileComplete
        
        // activity_score를 기반으로 활동 레벨 계산
        const activityScore = profileData.profile?.activity_score || 0
        const activityLevel = calculateActivityLevel(activityScore)
        
        return {
          user: {
            id: profileData.profile?.id || '',
            name: profileData.profile?.name || '익명',
            avatar_url: profileData.profile?.avatar_url || null,
            role: profileData.profile?.role || 'member'
          },
          stats: {
            totalContent: profileData.stats?.total_content_count || 
                         ((profileData.stats?.posts_count || 0) + 
                          (profileData.stats?.cases_count || 0) + 
                          (profileData.stats?.announcements_count || 0) + 
                          (profileData.stats?.resources_count || 0) + 
                          (profileData.stats?.activities_count || 0)),
            totalEngagement: (profileData.stats?.total_likes_received || 0) + 
                           (profileData.stats?.comments_count || 0),
            activityLevel: activityLevel  // beginner, intermediate, advanced, expert
          }
        } as ProfileSummary
      })

      const results = await Promise.all(promises)
      return results.filter(Boolean) as ProfileSummary[]
    },
    enabled: userIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10분
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
export function usePrefetchProfile(userId: string) {
  const queryClient = useQueryClient()

  return () => {
    queryClient.prefetchQuery({
      queryKey: ['profile-v2', userId, true, 10],
      queryFn: async () => {
        const { data, error } = await supabaseClient
          .rpc('get_user_profile_complete_v2', {
            target_user_id: userId,
            include_activities: true,
            activities_limit: 10
          })

        if (error) throw error
        return data as unknown as UserProfileComplete
      },
      staleTime: 5 * 60 * 1000
    })
  }
}

/**
 * 업적 진행률 조회 Hook
 * 
 * 사용자의 모든 업적과 진행률을 조회
 * 
 * @param userId - 조회할 사용자 ID (없으면 현재 사용자)
 */
export function useAchievementProgress(userId?: string) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  return useQuery<AchievementProgress[], Error>({
    queryKey: ['achievement-progress', targetUserId],
    queryFn: async () => {
      if (!targetUserId) throw new Error('User ID is required')

      const { data, error } = await supabaseClient
        .rpc('get_user_achievement_progress' as any, {
          p_user_id: targetUserId
        })

      if (error) {
        console.error('Error fetching achievement progress:', error)
        throw error
      }

      return data as AchievementProgress[]
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false
  })
}

/**
 * 업적 체크 및 업데이트 Hook
 * 
 * 사용자의 업적을 체크하고 업데이트
 */
export function useCheckAchievements() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation<any, Error, void>({
    mutationFn: async () => {
      if (!user) throw new Error('User is not authenticated')

      const { data, error } = await supabaseClient
        .rpc('check_and_update_achievements' as any, {
          p_user_id: user.id
        })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['achievement-progress'] })
      queryClient.invalidateQueries({ queryKey: ['profile-v2'] })
      
      // 새로운 업적이 있으면 알림
      if (data.new_achievements && data.new_achievements.length > 0) {
        toast.success(`🎉 새로운 업적 ${data.new_achievements.length}개를 달성했습니다!`)
      }
    },
    onError: (error) => {
      console.error('Achievement check error:', error)
      toast.error('업적 체크에 실패했습니다.')
    }
  })
}