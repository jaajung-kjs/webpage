/**
 * useMembersV2 - V2 스키마 기반 회원 관리 Hook
 * 
 * 주요 개선사항:
 * - users_v2 테이블 사용
 * - 통합 활동 통계 (content_v2, interactions_v2 기반)
 * - 실시간 동기화 지원
 * - 최적화된 쿼리 및 캐싱
 * - TypeScript 완전 지원
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { Database } from '@/lib/database.types'
import { UserRole, UserV2, UserV2Insert, UserV2Update } from '@/hooks/types/v2-types'

type Tables = Database['public']['Tables']

// 통계가 포함된 회원 데이터 타입
export interface MemberWithStatsV2 extends UserV2 {
  stats: {
    content_count: number
    comment_count: number
    like_received_count: number
    bookmark_count: number
    view_count: number
    activity_score: number
  }
  recent_activity?: {
    last_content_at?: string
    last_comment_at?: string
    last_login_at?: string
  }
}

// 회원 목록 필터 옵션
export interface MemberFilterV2 {
  role?: UserRole
  isActive?: boolean
  department?: string
  searchQuery?: string
  joinedAfter?: string
  joinedBefore?: string
}

// 정렬 옵션
export type MemberSortByV2 = 'name' | 'created_at' | 'last_login_at' | 'activity_score'
export type SortOrderV2 = 'asc' | 'desc'

/**
 * V2 회원 목록 조회 Hook
 * 
 * @param filter 필터 옵션
 * @param sortBy 정렬 기준
 * @param sortOrder 정렬 순서
 * @param limit 조회 제한 수
 * @param includeStats 통계 포함 여부
 */
export function useMembersV2(
  filter?: MemberFilterV2,
  sortBy: MemberSortByV2 = 'created_at',
  sortOrder: SortOrderV2 = 'desc',
  limit?: number,
  includeStats: boolean = true
) {
  return useQuery<MemberWithStatsV2[], Error>({
    queryKey: ['members-v2', filter, sortBy, sortOrder, limit, includeStats],
    queryFn: async () => {
      // 기본 사용자 데이터 조회
      let query = supabaseClient
        .from('users_v2')
        .select(`
          *
        `)
      
      // 삭제된 사용자 제외
      query = query.is('deleted_at', null)
      
      // 필터 적용
      if (filter?.role) {
        query = query.eq('role', filter.role)
      }
      
      if (filter?.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive)
      }
      
      if (filter?.department) {
        query = query.eq('department', filter.department)
      }
      
      if (filter?.searchQuery) {
        query = query.or(`name.ilike.%${filter.searchQuery}%,email.ilike.%${filter.searchQuery}%`)
      }
      
      if (filter?.joinedAfter) {
        query = query.gte('created_at', filter.joinedAfter)
      }
      
      if (filter?.joinedBefore) {
        query = query.lte('created_at', filter.joinedBefore)
      }
      
      // 정렬
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      
      // 제한
      if (limit) {
        query = query.limit(limit)
      }
      
      const { data: users, error } = await query
      
      if (error) throw error
      
      if (!includeStats || !users?.length) {
        return (users || []).map(user => ({
          ...user,
          stats: {
            content_count: 0,
            comment_count: 0,
            like_received_count: 0,
            bookmark_count: 0,
            view_count: 0,
            activity_score: 0
          }
        })) as MemberWithStatsV2[]
      }
      
      // 사용자 ID 목록
      const userIds = users.map(user => user.id)
      
      // 각 사용자의 통계 데이터 조회 (병렬)
      const [contentStats, interactionStats] = await Promise.all([
        // 콘텐츠 통계
        supabaseClient
          .from('content_v2')
          .select('author_id')
          .in('author_id', userIds)
          .is('deleted_at', null)
          .then(({ data }) => {
            const counts: Record<string, number> = {}
            data?.forEach(content => {
              counts[content.author_id] = (counts[content.author_id] || 0) + 1
            })
            return counts
          }),
        
        // 상호작용 통계를 각 사용자별로 조회
        Promise.all(
          userIds.map(userId => 
            supabaseClient
              .rpc('get_user_interactions_v2', {
                p_user_id: userId,
                p_target_type: undefined,
                p_interaction_type: undefined
              })
              .then(({ data }) => ({ 
                user_id: userId, 
                interactions: data || [] 
              }))
          )
        )
      ])
      
      // 댓글 통계
      const { data: commentStats } = await supabaseClient
        .from('comments_v2')
        .select('author_id')
        .in('author_id', userIds)
        .is('deleted_at', null)
      
      const commentCounts: Record<string, number> = {}
      commentStats?.forEach(comment => {
        commentCounts[comment.author_id] = (commentCounts[comment.author_id] || 0) + 1
      })
      
      // 데이터 결합
      return users.map(user => {
        const userInteractionData = Array.isArray(interactionStats) 
          ? interactionStats.find((stat: any) => stat.user_id === user.id)
          : null
        
        // 상호작용 데이터에서 통계 추출
        const interactions = (userInteractionData?.interactions as any[]) || []
        const likeReceivedCount = interactions.filter((i: any) => i.interaction_type === 'like').length
        const bookmarkCount = interactions.filter((i: any) => i.interaction_type === 'bookmark').length
        const viewCount = interactions.filter((i: any) => i.interaction_type === 'view').length
        
        const contentCount = contentStats[user.id] || 0
        const commentCount = commentCounts[user.id] || 0
        
        // 활동 점수 계산 (가중치 적용)
        const activityScore = 
          contentCount * 10 + 
          commentCount * 2 + 
          likeReceivedCount * 1 + 
          bookmarkCount * 3 + 
          Math.floor(viewCount / 10)
        
        return {
          ...user,
          stats: {
            content_count: contentCount,
            comment_count: commentCount,
            like_received_count: likeReceivedCount,
            bookmark_count: bookmarkCount,
            view_count: viewCount,
            activity_score: activityScore
          },
          recent_activity: {
            last_login_at: user.last_login_at
          }
        } as MemberWithStatsV2
      })
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분 (구 cacheTime)
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * 단일 회원 상세 정보 조회 Hook
 */
export function useMemberV2(userId: string, includeStats: boolean = true) {
  return useQuery<MemberWithStatsV2 | null, Error>({
    queryKey: ['member-v2', userId, includeStats],
    queryFn: async () => {
      if (!userId) return null
      
      const { data: user, error } = await supabaseClient
        .from('users_v2')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      
      if (!includeStats) {
        return {
          ...user,
          stats: {
            content_count: 0,
            comment_count: 0,
            like_received_count: 0,
            bookmark_count: 0,
            view_count: 0,
            activity_score: 0
          }
        } as MemberWithStatsV2
      }
      
      // 통계 데이터 조회
      const [contentCount, commentCount, interactionStats] = await Promise.all([
        // 콘텐츠 수
        supabaseClient
          .from('content_v2')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', userId)
          .is('deleted_at', null)
          .then(({ count }) => count || 0),
        
        // 댓글 수
        supabaseClient
          .from('comments_v2')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', userId)
          .is('deleted_at', null)
          .then(({ count }) => count || 0),
        
        // 상호작용 통계
        supabaseClient
          .rpc('get_user_interactions_v2', {
            p_user_id: userId,
            p_target_type: undefined,
            p_interaction_type: undefined
          })
          .then(({ data }) => {
            const interactions = (data as any[]) || []
            return {
              like_received_count: interactions.filter((i: any) => i.interaction_type === 'like').length,
              bookmark_count: interactions.filter((i: any) => i.interaction_type === 'bookmark').length,
              view_count: interactions.filter((i: any) => i.interaction_type === 'view').length
            }
          })
      ])
      
      const activityScore = 
        contentCount * 10 + 
        commentCount * 2 + 
        (interactionStats.like_received_count || 0) * 1 + 
        (interactionStats.bookmark_count || 0) * 3 + 
        Math.floor((interactionStats.view_count || 0) / 10)
      
      return {
        ...user,
        stats: {
          content_count: contentCount,
          comment_count: commentCount,
          like_received_count: interactionStats.like_received_count || 0,
          bookmark_count: interactionStats.bookmark_count || 0,
          view_count: interactionStats.view_count || 0,
          activity_score: activityScore
        },
        recent_activity: {
          last_login_at: user.last_login_at
        }
      } as MemberWithStatsV2
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false
  })
}

/**
 * 회원 역할 변경 Hook (옵티미스틱 업데이트)
 */
export function useUpdateMemberRoleV2() {
  const queryClient = useQueryClient()
  const { user: currentUser, profile } = useAuth()
  
  return useMutation<
    UserV2,
    Error,
    { userId: string; newRole: UserRole },
    { previousData?: any }
  >({
    mutationFn: async ({ userId, newRole }) => {
      // 권한 체크
      if (!currentUser || !['admin', 'leader', 'vice-leader'].includes(profile?.role || '')) {
        throw new Error('권한이 없습니다.')
      }
      
      // 자기 자신의 역할 변경 제한
      if (userId === currentUser.id) {
        throw new Error('자신의 역할은 변경할 수 없습니다.')
      }
      
      const { data, error } = await supabaseClient
        .from('users_v2')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async ({ userId, newRole }) => {
      // 이전 쿼리들 취소
      await queryClient.cancelQueries({ queryKey: ['members-v2'] })
      await queryClient.cancelQueries({ queryKey: ['member-v2', userId] })
      
      // 이전 데이터 스냅샷
      const previousListData = queryClient.getQueryData(['members-v2'])
      const previousMemberData = queryClient.getQueryData(['member-v2', userId])
      
      // 옵티미스틱 업데이트 - 목록
      queryClient.setQueryData(['members-v2'], (old: any) => {
        if (!old) return old
        return old.map((member: MemberWithStatsV2) =>
          member.id === userId
            ? { ...member, role: newRole, updated_at: new Date().toISOString() }
            : member
        )
      })
      
      // 옵티미스틱 업데이트 - 단일 회원
      queryClient.setQueryData(['member-v2', userId], (old: any) => {
        if (!old) return old
        return { ...old, role: newRole, updated_at: new Date().toISOString() }
      })
      
      return { previousData: { previousListData, previousMemberData } }
    },
    onError: (error, variables, context) => {
      // 에러 시 롤백
      if (context?.previousData?.previousListData) {
        queryClient.setQueryData(['members-v2'], context.previousData.previousListData)
      }
      if (context?.previousData?.previousMemberData) {
        queryClient.setQueryData(['member-v2', variables.userId], context.previousData.previousMemberData)
      }
      
      console.error('Role update error:', error)
      toast.error(error.message || '역할 변경에 실패했습니다.')
    },
    onSuccess: (data, variables) => {
      const roleLabels: Record<UserRole, string> = {
        'admin': '관리자',
        'leader': '동아리장',
        'vice-leader': '운영진',
        'member': '회원',
        'pending': '대기중',
        'guest': '게스트'
      }
      
      toast.success(`역할이 ${roleLabels[variables.newRole]}로 변경되었습니다.`)
    },
    onSettled: (data, error, variables) => {
      // 최종 캐시 동기화
      queryClient.invalidateQueries({ queryKey: ['members-v2'] })
      queryClient.invalidateQueries({ queryKey: ['member-v2', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['profile-v2', variables.userId] })
    }
  })
}

/**
 * 회원 활성화/비활성화 Hook
 */
export function useToggleMemberActiveV2() {
  const queryClient = useQueryClient()
  const { user: currentUser, profile } = useAuth()
  
  return useMutation<
    UserV2,
    Error,
    { userId: string; isActive: boolean }
  >({
    mutationFn: async ({ userId, isActive }) => {
      // 권한 체크
      if (!currentUser || !['admin', 'leader'].includes(profile?.role || '')) {
        throw new Error('권한이 없습니다.')
      }
      
      const { data, error } = await supabaseClient
        .from('users_v2')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['members-v2'] })
      queryClient.invalidateQueries({ queryKey: ['member-v2', variables.userId] })
      
      toast.success(`회원이 ${variables.isActive ? '활성화' : '비활성화'}되었습니다.`)
    },
    onError: (error) => {
      console.error('Member toggle active error:', error)
      toast.error(error.message || '회원 상태 변경에 실패했습니다.')
    }
  })
}

/**
 * 회원 검색 Hook
 */
export function useSearchMembersV2(
  searchQuery: string,
  filters?: Omit<MemberFilterV2, 'searchQuery'>,
  limit: number = 20
) {
  return useQuery<MemberWithStatsV2[], Error>({
    queryKey: ['members-v2-search', searchQuery, filters, limit],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) {
        return []
      }
      
      let query = supabaseClient
        .from('users_v2')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%`)
        .is('deleted_at', null)
        .limit(limit)
      
      // 추가 필터 적용
      if (filters?.role) {
        query = query.eq('role', filters.role)
      }
      
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }
      
      if (filters?.department) {
        query = query.eq('department', filters.department)
      }
      
      const { data: users, error } = await query
      
      if (error) throw error
      
      // 간단한 통계만 포함 (검색 성능을 위해)
      return (users || []).map(user => ({
        ...user,
        stats: {
          content_count: 0,
          comment_count: 0,
          like_received_count: 0,
          bookmark_count: 0,
          view_count: 0,
          activity_score: 0
        }
      })) as MemberWithStatsV2[]
    },
    enabled: searchQuery.length >= 2,
    staleTime: 1 * 60 * 1000, // 1분
    refetchOnWindowFocus: false
  })
}

/**
 * 회원 통계 요약 Hook
 */
export function useMembersStatsV2() {
  return useQuery<{
    total: number
    active: number
    newThisMonth: number
    roleDistribution: Record<UserRole, number>
    topContributors: Array<{
      id: string
      name: string
      avatar_url: string | null
      activity_score: number
    }>
  }, Error>({
    queryKey: ['members-v2-stats'],
    queryFn: async () => {
      // 전체 회원 수
      const { count: total, error: totalError } = await supabaseClient
        .from('users_v2')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
      
      if (totalError) throw totalError
      
      // 활성 회원 수
      const { count: active, error: activeError } = await supabaseClient
        .from('users_v2')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null)
      
      if (activeError) throw activeError
      
      // 이번 달 신규 회원
      const thisMonthStart = new Date()
      thisMonthStart.setDate(1)
      thisMonthStart.setHours(0, 0, 0, 0)
      
      const { count: newThisMonth, error: newError } = await supabaseClient
        .from('users_v2')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thisMonthStart.toISOString())
        .is('deleted_at', null)
      
      if (newError) throw newError
      
      // 역할별 분포
      const { data: roleData, error: roleError } = await supabaseClient
        .from('users_v2')
        .select('role')
        .is('deleted_at', null)
      
      if (roleError) throw roleError
      
      const roleDistribution = (roleData || []).reduce((acc, user) => {
        const role = (user.role || 'guest') as UserRole
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {} as Record<UserRole, number>)
      
      // 상위 기여자 (간단히 최근 가입자로 대체 - 실제로는 activity_score 기반)
      const { data: topContributors, error: topError } = await supabaseClient
        .from('users_v2')
        .select('id, name, avatar_url')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (topError) throw topError
      
      return {
        total: total || 0,
        active: active || 0,
        newThisMonth: newThisMonth || 0,
        roleDistribution,
        topContributors: (topContributors || []).map(user => ({
          ...user,
          activity_score: 0 // TODO: 실제 계산 로직 추가
        }))
      }
    },
    staleTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false
  })
}