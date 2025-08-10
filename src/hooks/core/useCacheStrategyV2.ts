/**
 * useCacheStrategyV2 - V2 최적화된 캐시 전략
 * 
 * TanStack Query 캐시 최적화 및 관리 전략
 * - 지능적 캐시 무효화
 * - 프리페치 전략
 * - 메모리 사용량 최적화
 * - 백그라운드 동기화
 */

'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthV2 } from '../features/useAuthV2'

// 캐시 키 생성 유틸리티
export const CacheKeys = {
  // 인증 관련
  auth: ['auth'] as const,
  session: ['auth', 'session'] as const,
  userProfile: (userId: string) => ['user-profile-v2', userId] as const,
  
  // 콘텐츠 관련  
  content: ['content-v2'] as const,
  contentList: (filter: any) => ['content-v2', 'list', filter] as const,
  contentDetail: (contentId: string, userId?: string) => ['content-v2', contentId, userId] as const,
  contentPopular: (types?: string[], timeRange?: string) => ['content-v2', 'popular', types, timeRange] as const,
  
  // 댓글 관련
  comments: ['comments-v2'] as const,
  commentsList: (contentId: string, userId?: string) => ['comments-v2', contentId, userId] as const,
  commentCount: (contentId: string) => ['comment-count-v2', contentId] as const,
  
  // 상호작용 관련
  interactions: ['interactions-v2'] as const,
  userInteractions: (userId: string, targetId: string) => ['user-interactions-v2', userId, targetId] as const,
  
  // 프로필 관련
  profile: ['profile-v2'] as const,
  profileComplete: (userId: string) => ['profile-v2', userId] as const,
  profileList: (filter: any) => ['profile-v2-list', filter] as const,
  
  // 알림 관련
  notifications: ['notifications-v2'] as const,
  userNotifications: (userId: string) => ['notifications-v2', userId] as const
} as const

/**
 * 캐시 전략 관리 Hook
 */
export function useCacheStrategyV2() {
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthV2()

  /**
   * 지능적 캐시 무효화
   * 관련된 쿼리들만 선택적으로 무효화
   */
  const invalidateRelated = useCallback((
    action: 'content-create' | 'content-update' | 'content-delete' | 
           'comment-create' | 'comment-update' | 'comment-delete' |
           'interaction-toggle' | 'profile-update' | 'auth-change',
    data?: {
      contentId?: string
      contentType?: string
      userId?: string
      targetType?: 'content' | 'comment'
    }
  ) => {
    switch (action) {
      case 'content-create':
        // 새 콘텐츠 생성 시
        queryClient.invalidateQueries({ queryKey: CacheKeys.content })
        if (data?.contentType) {
          queryClient.invalidateQueries({ 
            queryKey: ['content-v2', 'list'],
            predicate: (query) => {
              const filter = query.queryKey[2] as any
              return !filter?.contentType || filter.contentType.includes(data.contentType)
            }
          })
        }
        break

      case 'content-update':
        // 콘텐츠 수정 시
        if (data?.contentId) {
          queryClient.invalidateQueries({ 
            queryKey: CacheKeys.contentDetail(data.contentId) 
          })
        }
        queryClient.invalidateQueries({ queryKey: CacheKeys.content })
        break

      case 'content-delete':
        // 콘텐츠 삭제 시
        if (data?.contentId) {
          queryClient.removeQueries({ 
            queryKey: CacheKeys.contentDetail(data.contentId) 
          })
        }
        queryClient.invalidateQueries({ queryKey: CacheKeys.content })
        break

      case 'comment-create':
      case 'comment-update':
      case 'comment-delete':
        // 댓글 관련 변경 시
        if (data?.contentId) {
          queryClient.invalidateQueries({ 
            queryKey: CacheKeys.commentsList(data.contentId) 
          })
          queryClient.invalidateQueries({ 
            queryKey: CacheKeys.commentCount(data.contentId) 
          })
          // 콘텐츠의 댓글 수 업데이트를 위해
          queryClient.invalidateQueries({ 
            queryKey: CacheKeys.contentDetail(data.contentId) 
          })
        }
        break

      case 'interaction-toggle':
        // 상호작용 토글 시 (좋아요, 북마크 등)
        if (data?.contentId && data?.targetType) {
          if (data.targetType === 'content') {
            queryClient.invalidateQueries({ 
              queryKey: CacheKeys.contentDetail(data.contentId) 
            })
          } else if (data.targetType === 'comment') {
            queryClient.invalidateQueries({ 
              queryKey: CacheKeys.commentsList(data.contentId) 
            })
          }
        }
        break

      case 'profile-update':
        // 프로필 업데이트 시
        if (data?.userId) {
          queryClient.invalidateQueries({ 
            queryKey: CacheKeys.userProfile(data.userId) 
          })
          queryClient.invalidateQueries({ 
            queryKey: CacheKeys.profileComplete(data.userId) 
          })
        }
        queryClient.invalidateQueries({ queryKey: CacheKeys.profile })
        break

      case 'auth-change':
        // 인증 상태 변경 시
        queryClient.invalidateQueries({ queryKey: CacheKeys.auth })
        if (data?.userId) {
          queryClient.invalidateQueries({ 
            queryKey: CacheKeys.userProfile(data.userId) 
          })
          queryClient.invalidateQueries({ 
            queryKey: CacheKeys.userNotifications(data.userId) 
          })
        }
        break
    }
  }, [queryClient])

  /**
   * 프리페치 전략
   * 사용자가 볼 가능성이 높은 데이터를 미리 캐싱
   */
  const prefetchContent = useCallback((contentId: string) => {
    queryClient.prefetchQuery({
      queryKey: CacheKeys.contentDetail(contentId, (user as any)?.id),
      queryFn: async () => {
        // useContentV2의 queryFn과 동일한 로직
        // 실제 구현에서는 공통 함수로 분리 필요
        return null // placeholder
      },
      staleTime: 10 * 60 * 1000, // 10분
    })
  }, [queryClient, (user as any)?.id])

  const prefetchComments = useCallback((contentId: string) => {
    queryClient.prefetchQuery({
      queryKey: CacheKeys.commentsList(contentId, (user as any)?.id),
      queryFn: async () => {
        // useCommentsV2의 queryFn과 동일한 로직
        return null // placeholder
      },
      staleTime: 5 * 60 * 1000, // 5분
    })
  }, [queryClient, (user as any)?.id])

  const prefetchProfile = useCallback((userId: string) => {
    queryClient.prefetchQuery({
      queryKey: CacheKeys.profileComplete(userId),
      queryFn: async () => {
        // useUserProfileV2의 queryFn과 동일한 로직
        return null // placeholder
      },
      staleTime: 10 * 60 * 1000, // 10분
    })
  }, [queryClient])

  /**
   * 메모리 최적화
   * 오래된 캐시 데이터 정리
   */
  const optimizeMemory = useCallback(() => {
    // 30분 이상 사용되지 않은 캐시 정리
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30분

    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.state.dataUpdatedAt < now - maxAge && !query.getObserversCount()) {
        queryClient.removeQueries({ queryKey: query.queryKey })
      }
    })
  }, [queryClient])

  /**
   * 백그라운드 동기화
   * 중요한 데이터를 백그라운드에서 정기적으로 업데이트
   */
  const backgroundSync = useCallback(() => {
    if (!isAuthenticated || !user) return

    // 사용자 프로필 동기화
    queryClient.refetchQueries({ 
      queryKey: CacheKeys.userProfile((user as any).id),
      type: 'active'
    })

    // 알림 동기화
    queryClient.refetchQueries({ 
      queryKey: CacheKeys.userNotifications((user as any).id),
      type: 'active' 
    })

    // 인기 콘텐츠 동기화
    queryClient.refetchQueries({ 
      queryKey: ['content-v2', 'popular'],
      type: 'active'
    })
  }, [queryClient, isAuthenticated, user])

  /**
   * 연결 상태별 캐시 전략
   */
  const handleConnectionChange = useCallback((isOnline: boolean) => {
    if (isOnline) {
      // 온라인 복귀 시 중요한 데이터 동기화
      backgroundSync()
    } else {
      // 오프라인 시 불필요한 refetch 중단
      queryClient.setDefaultOptions({
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false
        }
      })
    }
  }, [queryClient, backgroundSync])

  /**
   * 배치 업데이트
   * 여러 관련 작업을 한 번에 처리
   */
  const batchUpdate = useCallback(async (operations: Array<() => Promise<void>>) => {
    // 배치 시작 - 자동 refetch 비활성화
    queryClient.setDefaultOptions({
      queries: {
        refetchOnWindowFocus: false,
        refetchOnMount: false
      }
    })

    try {
      // 모든 작업 병렬 실행
      await Promise.allSettled(operations.map(op => op()))
    } finally {
      // 배치 종료 - 설정 복원
      queryClient.setDefaultOptions({
        queries: {
          refetchOnWindowFocus: true,
          refetchOnMount: true
        }
      })

      // 필요한 쿼리들 무효화
      queryClient.invalidateQueries()
    }
  }, [queryClient])

  // 정기적 메모리 최적화 (5분마다)
  useEffect(() => {
    const interval = setInterval(optimizeMemory, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [optimizeMemory])

  // 연결 상태 모니터링
  useEffect(() => {
    const handleOnline = () => handleConnectionChange(true)
    const handleOffline = () => handleConnectionChange(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleConnectionChange])

  // 백그라운드 동기화 (1분마다)
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(backgroundSync, 60 * 1000)
    return () => clearInterval(interval)
  }, [backgroundSync, isAuthenticated])

  return {
    // 캐시 키 생성기
    cacheKeys: CacheKeys,
    
    // 캐시 무효화
    invalidateRelated,
    
    // 프리페치
    prefetchContent,
    prefetchComments,
    prefetchProfile,
    
    // 메모리 최적화
    optimizeMemory,
    
    // 백그라운드 동기화
    backgroundSync,
    
    // 배치 업데이트
    batchUpdate,
    
    // 연결 상태 핸들러
    handleConnectionChange
  }
}

/**
 * 쿼리 옵션 프리셋
 * 일관된 캐시 정책 적용을 위한 프리셋
 */
export const QueryOptionsPresets = {
  // 실시간성이 중요한 데이터 (댓글, 알림 등) - GlobalRealtimeManager handles updates
  realtime: {
    staleTime: 2 * 60 * 1000, // 2 minutes (Real-time handles updates)
    refetchOnWindowFocus: false, // Real-time handles updates
    refetchOnReconnect: true, // Keep for network recovery
    retry: 1
  },

  // 정적 데이터 (콘텐츠 상세 등)
  static: {
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2
  },

  // 목록 데이터 (콘텐츠 목록, 회원 목록 등)
  list: {
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 15 * 60 * 1000, // 15분
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2
  },

  // 사용자별 데이터 (프로필, 개인 설정 등)
  user: {
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 20 * 60 * 1000, // 20분
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2
  },

  // 통계 및 분석 데이터
  analytics: {
    staleTime: 15 * 60 * 1000, // 15분
    gcTime: 60 * 60 * 1000, // 1시간
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1
  }
} as const

/**
 * 쿼리 성능 모니터링 Hook
 */
export function useQueryPerformanceMonitor() {
  const queryClient = useQueryClient()

  const getQueryStats = useCallback(() => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()

    const stats = {
      total: queries.length,
      active: queries.filter(q => q.getObserversCount() > 0).length,
      inactive: queries.filter(q => q.getObserversCount() === 0).length,
      stale: queries.filter(q => q.isStale()).length,
      loading: queries.filter(q => q.state.status === 'pending').length,
      error: queries.filter(q => q.state.status === 'error').length
    }

    return stats
  }, [queryClient])

  const getSlowQueries = useCallback((threshold = 1000) => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()

    return queries
      .filter(query => {
        const fetchTime = query.state.dataUpdatedAt - (query.state.fetchFailureReason as any)?.timestamp || 0
        return fetchTime > threshold
      })
      .map(query => ({
        queryKey: query.queryKey,
        fetchTime: query.state.dataUpdatedAt - (query.state.fetchFailureReason as any)?.timestamp || 0,
        observers: query.getObserversCount()
      }))
      .sort((a, b) => b.fetchTime - a.fetchTime)
  }, [queryClient])

  return {
    getQueryStats,
    getSlowQueries
  }
}