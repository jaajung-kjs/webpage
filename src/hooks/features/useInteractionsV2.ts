/**
 * useInteractionsV2 - V2 스키마 기반 사용자 상호작용 관리 Hook
 * 
 * 주요 개선사항:
 * - interactions_v2 테이블 사용 (통합 상호작용 관리)
 * - 다형성 지원 (content, user, comment 대상)
 * - 실시간 상호작용 토글
 * - Optimistic Updates
 * - 지능적 캐시 무효화
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers'
import { supabaseClient } from '@/lib/core/connection-core'
import { useCallback } from 'react'
import {
  InteractionV2,
  InteractionV2Insert,
  UserV2,
  ContentV2,
  InteractionType
} from '@/hooks/types/v2-types'

// Target types for interactions
export type TargetType = 'content' | 'user' | 'comment'

// 확장된 상호작용 타입 (관계 포함)
export interface InteractionWithRelations extends InteractionV2 {
  user?: Pick<UserV2, 'id' | 'name' | 'avatar_url'>
  target?: {
    id: string
    title?: string
    name?: string
    type: TargetType
  }
}

// 상호작용 통계
export interface InteractionStats {
  likes: number
  bookmarks: number
  follows: number
  reports: number
  views: number
}

// 사용자 상호작용 상태
export interface UserInteractionState {
  liked: boolean
  bookmarked: boolean
  followed: boolean
  reported: boolean
}

// 상호작용 필터
export interface InteractionFilter {
  targetType?: TargetType
  interactionType?: InteractionType
  targetId?: string
  userId?: string
}

export function useInteractionsV2() {
  const supabase = supabaseClient
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 특정 대상의 상호작용 통계 조회
  const useInteractionStats = (targetId: string, targetType: TargetType = 'content') => {
    return useQuery({
      queryKey: ['interaction-stats-v2', targetId, targetType],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('interactions_v2')
          .select('interaction_type')
          .eq('target_id', targetId)
          .eq('target_type', targetType)

        if (error) throw error

        const stats: InteractionStats = {
          likes: data?.filter(i => i.interaction_type === 'like').length || 0,
          bookmarks: data?.filter(i => i.interaction_type === 'bookmark').length || 0,
          follows: data?.filter(i => i.interaction_type === 'follow').length || 0,
          reports: data?.filter(i => i.interaction_type === 'report').length || 0,
          views: data?.filter(i => i.interaction_type === 'view').length || 0,
        }

        return stats
      },
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 사용자의 상호작용 상태 조회
  const useUserInteractions = (targetId: string, targetType: TargetType = 'content') => {
    return useQuery({
      queryKey: ['user-interactions-v2', user?.id, targetId, targetType],
      queryFn: async () => {
        if (!user?.id) return null

        const { data, error } = await supabase
          .from('interactions_v2')
          .select('interaction_type')
          .eq('user_id', user.id)
          .eq('target_id', targetId)
          .eq('target_type', targetType)

        if (error) throw error

        const state: UserInteractionState = {
          liked: data?.some(i => i.interaction_type === 'like') || false,
          bookmarked: data?.some(i => i.interaction_type === 'bookmark') || false,
          followed: data?.some(i => i.interaction_type === 'follow') || false,
          reported: data?.some(i => i.interaction_type === 'report') || false,
        }

        return state
      },
      enabled: !!user?.id,
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 사용자의 상호작용 목록 조회 (무한 스크롤)
  const useUserInteractionHistory = (
    interactionType?: InteractionType,
    targetType?: TargetType,
    pageSize = 20
  ) => {
    return useInfiniteQuery({
      queryKey: ['user-interaction-history-v2', user?.id, interactionType, targetType],
      initialPageParam: 0,
      queryFn: async ({ pageParam = 0 }) => {
        if (!user?.id) throw new Error('User not authenticated')

        let query = supabase
          .from('interactions_v2')
          .select(`
            *,
            target_content:content_v2!target_id(id, title, content_type, author:users_v2!author_id(name)),
            target_user:users_v2!target_id(id, name, avatar_url)
          `, { count: 'exact' })
          .eq('user_id', user.id)
          .range(pageParam, pageParam + pageSize - 1)
          .order('created_at', { ascending: false })

        if (interactionType) query = query.eq('interaction_type', interactionType)
        if (targetType) query = query.eq('target_type', targetType)

        const { data, error, count } = await query

        if (error) throw error

        return {
          interactions: data || [],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      enabled: !!user?.id,
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 상호작용 토글 (RPC 함수 사용)
  const toggleInteraction = useMutation({
    mutationFn: async ({
      targetId,
      targetType = 'content',
      interactionType
    }: {
      targetId: string
      targetType?: TargetType
      interactionType: InteractionType
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .rpc('toggle_interaction_v2', {
          p_user_id: user.id,
          p_target_type: targetType,
          p_target_id: targetId,
          p_interaction_type: interactionType
        })

      if (error) throw error
      return data
    },
    onMutate: async ({ targetId, targetType, interactionType }) => {
      // 이전 데이터 백업
      const statsKey = ['interaction-stats-v2', targetId, targetType]
      const userKey = ['user-interactions-v2', user?.id, targetId, targetType]
      
      await queryClient.cancelQueries({ queryKey: statsKey })
      await queryClient.cancelQueries({ queryKey: userKey })
      
      const previousStats = queryClient.getQueryData<InteractionStats>(statsKey)
      const previousUserState = queryClient.getQueryData<UserInteractionState>(userKey)

      // Optimistic Update - 통계
      if (previousStats) {
        const newStats = { ...previousStats }
        const isCurrentlyActive = previousUserState?.[getInteractionStateKey(interactionType)] || false
        
        if (interactionType === 'like') newStats.likes += isCurrentlyActive ? -1 : 1
        else if (interactionType === 'bookmark') newStats.bookmarks += isCurrentlyActive ? -1 : 1
        else if (interactionType === 'follow') newStats.follows += isCurrentlyActive ? -1 : 1
        else if (interactionType === 'report') newStats.reports += isCurrentlyActive ? -1 : 1
        
        queryClient.setQueryData(statsKey, newStats)
      }

      // Optimistic Update - 사용자 상태
      if (previousUserState) {
        const newUserState = { ...previousUserState }
        const stateKey = getInteractionStateKey(interactionType)
        newUserState[stateKey] = !newUserState[stateKey]
        queryClient.setQueryData(userKey, newUserState)
      }

      return { previousStats, previousUserState, targetId, targetType }
    },
    onError: (err, variables, context) => {
      // 롤백
      if (context) {
        const { previousStats, previousUserState, targetId, targetType } = context
        if (previousStats) {
          queryClient.setQueryData(['interaction-stats-v2', targetId, targetType], previousStats)
        }
        if (previousUserState) {
          queryClient.setQueryData(['user-interactions-v2', user?.id, targetId, targetType], previousUserState)
        }
      }
    },
    onSuccess: (data, variables) => {
      // 관련 쿼리 무효화
      const { targetId, targetType, interactionType } = variables
      
      queryClient.invalidateQueries({ queryKey: ['interaction-stats-v2', targetId, targetType] })
      queryClient.invalidateQueries({ queryKey: ['user-interactions-v2', user?.id, targetId, targetType] })
      queryClient.invalidateQueries({ queryKey: ['user-interaction-history-v2', user?.id] })
      
      // 콘텐츠 캐시도 무효화 (상호작용 카운트 업데이트)
      if (targetType === 'content') {
        queryClient.invalidateQueries({ queryKey: ['content-v2', targetId] })
        queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
      }
      
      // 팔로우의 경우 사용자 관련 캐시도 무효화
      if (interactionType === 'follow' && targetType === 'user') {
        queryClient.invalidateQueries({ queryKey: ['user-followers-v2', targetId] })
        queryClient.invalidateQueries({ queryKey: ['user-following-v2', user?.id] })
      }
    }
  })

  // 대량 상호작용 생성 (북마크 폴더 등에 유용)
  const bulkCreateInteractions = useMutation({
    mutationFn: async (interactions: Omit<InteractionV2Insert, 'user_id'>[]) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('interactions_v2')
        .insert(
          interactions.map(interaction => ({
            ...interaction,
            user_id: user.id
          }))
        )
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['user-interaction-history-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['user-interactions-v2', user?.id] })
    }
  })

  // 상호작용 삭제 (신고 취소 등)
  const removeInteraction = useMutation({
    mutationFn: async ({
      targetId,
      targetType,
      interactionType
    }: {
      targetId: string
      targetType: TargetType
      interactionType: InteractionType
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('interactions_v2')
        .delete()
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('interaction_type', interactionType)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      const { targetId, targetType } = variables
      
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['interaction-stats-v2', targetId, targetType] })
      queryClient.invalidateQueries({ queryKey: ['user-interactions-v2', user?.id, targetId, targetType] })
      queryClient.invalidateQueries({ queryKey: ['user-interaction-history-v2', user?.id] })
    }
  })

  // 사용자의 북마크 콘텐츠 조회
  const useBookmarkedContents = (pageSize = 20) => {
    return useInfiniteQuery({
      queryKey: ['bookmarked-contents-v2', user?.id],
      initialPageParam: 0,
      queryFn: async ({ pageParam = 0 }) => {
        if (!user?.id) throw new Error('User not authenticated')

        const { data, error, count } = await supabase
          .from('interactions_v2')
          .select(`
            created_at,
            target_content:content_v2!target_id(
              id,
              title,
              content_type,
              summary,
              created_at,
              author:users_v2!author_id(id, name, avatar_url)
            )
          `, { count: 'exact' })
          .eq('user_id', user.id)
          .eq('target_type', 'content')
          .eq('interaction_type', 'bookmark')
          .range(pageParam, pageParam + pageSize - 1)
          .order('created_at', { ascending: false })

        if (error) throw error

        return {
          contents: data?.map(item => ({
            ...(item.target_content as any || {}),
            bookmarked_at: item.created_at
          })).filter(item => item.id) || [],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      enabled: !!user?.id,
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 사용자가 팔로우하는 사용자 목록
  const useFollowing = (userId?: string, pageSize = 20) => {
    const targetUserId = userId || user?.id

    return useInfiniteQuery({
      queryKey: ['user-following-v2', targetUserId],
      initialPageParam: 0,
      queryFn: async ({ pageParam = 0 }) => {
        if (!targetUserId) throw new Error('User ID required')

        const { data, error, count } = await supabase
          .from('interactions_v2')
          .select(`
            created_at,
            target_user:users_v2!target_id(id, name, avatar_url, bio, role)
          `, { count: 'exact' })
          .eq('user_id', targetUserId)
          .eq('target_type', 'user')
          .eq('interaction_type', 'follow')
          .range(pageParam, pageParam + pageSize - 1)
          .order('created_at', { ascending: false })

        if (error) throw error

        return {
          users: data?.map(item => ({
            ...(item.target_user as any || {}),
            followed_at: item.created_at
          })).filter(item => item.id) || [],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      enabled: !!targetUserId,
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 사용자의 팔로워 목록
  const useFollowers = (userId?: string, pageSize = 20) => {
    const targetUserId = userId || user?.id

    return useInfiniteQuery({
      queryKey: ['user-followers-v2', targetUserId],
      initialPageParam: 0,
      queryFn: async ({ pageParam = 0 }) => {
        if (!targetUserId) throw new Error('User ID required')

        const { data, error, count } = await supabase
          .from('interactions_v2')
          .select(`
            created_at,
            follower:users_v2!user_id(id, name, avatar_url, bio, role)
          `, { count: 'exact' })
          .eq('target_id', targetUserId)
          .eq('target_type', 'user')
          .eq('interaction_type', 'follow')
          .range(pageParam, pageParam + pageSize - 1)
          .order('created_at', { ascending: false })

        if (error) throw error

        return {
          users: data?.map(item => ({
            ...item.follower,
            following_since: item.created_at
          })).filter(Boolean) || [],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      enabled: !!targetUserId,
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  return {
    // Query Hooks
    useInteractionStats,
    useUserInteractions,
    useUserInteractionHistory,
    useBookmarkedContents,
    useFollowing,
    useFollowers,

    // Mutations
    toggleInteraction: toggleInteraction.mutate,
    toggleInteractionAsync: toggleInteraction.mutateAsync,
    bulkCreateInteractions: bulkCreateInteractions.mutate,
    bulkCreateInteractionsAsync: bulkCreateInteractions.mutateAsync,
    removeInteraction: removeInteraction.mutate,
    removeInteractionAsync: removeInteraction.mutateAsync,

    // 상태
    isToggling: toggleInteraction.isPending,
    isBulkCreating: bulkCreateInteractions.isPending,
    isRemoving: removeInteraction.isPending,
  }
}

// 헬퍼 함수: 상호작용 타입을 사용자 상태 키로 변환
function getInteractionStateKey(interactionType: InteractionType): keyof UserInteractionState {
  switch (interactionType) {
    case 'like': return 'liked'
    case 'bookmark': return 'bookmarked'
    case 'follow': return 'followed'
    case 'report': return 'reported'
    default: throw new Error(`Unknown interaction type: ${interactionType}`)
  }
}

// 상호작용 타입별 아이콘 및 텍스트 헬퍼
export const INTERACTION_CONFIG = {
  like: {
    icon: '👍',
    text: '좋아요',
    color: 'text-red-500',
    activeColor: 'text-red-600'
  },
  bookmark: {
    icon: '🔖',
    text: '북마크',
    color: 'text-blue-500',
    activeColor: 'text-blue-600'
  },
  follow: {
    icon: '👤',
    text: '팔로우',
    color: 'text-green-500',
    activeColor: 'text-green-600'
  },
  report: {
    icon: '🚨',
    text: '신고',
    color: 'text-orange-500',
    activeColor: 'text-orange-600'
  },
  view: {
    icon: '👁️',
    text: '조회',
    color: 'text-gray-500',
    activeColor: 'text-gray-600'
  }
} as const