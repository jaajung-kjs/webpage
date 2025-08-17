/**
 * 프리페칭 전략 Hook
 * 
 * 사용자의 다음 행동을 예측하여 데이터를 미리 가져오는 전략
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { supabaseClient } from '@/lib/core/connection-core'
import { PREFETCH_STRATEGIES, cacheKeys, getStaleTime } from '@/lib/cache/cache-strategy'
import type { Tables } from '@/lib/database.types'

/**
 * 콘텐츠 상세 페이지 프리페칭 Hook
 * 
 * 사용자가 링크에 hover할 때 상세 페이지 데이터를 미리 가져옴
 */
export function useContentPrefetch() {
  const queryClient = useQueryClient()
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const prefetchContent = useCallback(async (contentId: string) => {
    // 이미 캐시에 있으면 프리페치 안 함
    const cached = queryClient.getQueryData(cacheKeys.content.detail(contentId))
    if (cached) return
    
    // 프리페칭 수행
    await queryClient.prefetchQuery({
      queryKey: cacheKeys.content.detail(contentId),
      queryFn: async () => {
        const { data, error } = await supabaseClient()
        .from('content_v2')
          .select('*, author:users_v2!author_id(id, name, email)')
          .eq('id', contentId)
          .single()
        
        if (error) throw error
        return data
      },
      staleTime: getStaleTime('content'),
    })
  }, [queryClient])
  
  const handleMouseEnter = useCallback((contentId: string) => {
    // Debounce: 200ms hover 후 프리페치
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchContent(contentId)
    }, PREFETCH_STRATEGIES.onHover.delay)
  }, [prefetchContent])
  
  const handleMouseLeave = useCallback(() => {
    // hover 취소 시 timeout clear
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }
  }, [])
  
  return {
    handleMouseEnter,
    handleMouseLeave,
    prefetchContent,
  }
}

/**
 * 페이지네이션 프리페칭 Hook
 * 
 * 현재 페이지를 보고 있을 때 다음 페이지 데이터를 미리 가져옴
 */
export function usePaginationPrefetch({
  queryKey,
  currentPage,
  totalPages,
  queryFn,
}: {
  queryKey: any[]
  currentPage: number
  totalPages: number
  queryFn: (page: number) => Promise<any>
}) {
  const queryClient = useQueryClient()
  
  const prefetchNextPage = useCallback(async () => {
    if (!PREFETCH_STRATEGIES.pagination.prefetchNext) return
    
    const nextPage = currentPage + 1
    if (nextPage > totalPages) return
    
    // 최대 prefetch 페이지 수 제한
    const maxPrefetch = Math.min(
      currentPage + PREFETCH_STRATEGIES.pagination.maxPrefetchPages,
      totalPages
    )
    
    // 다음 페이지들 프리페칭
    for (let page = nextPage; page <= maxPrefetch; page++) {
      const pageQueryKey = [...queryKey, { page }]
      
      // 이미 캐시에 있으면 skip
      const cached = queryClient.getQueryData(pageQueryKey)
      if (cached) continue
      
      await queryClient.prefetchQuery({
        queryKey: pageQueryKey,
        queryFn: () => queryFn(page),
        staleTime: getStaleTime('content'),
      })
    }
  }, [queryClient, queryKey, currentPage, totalPages, queryFn])
  
  const prefetchPreviousPage = useCallback(async () => {
    if (!PREFETCH_STRATEGIES.pagination.prefetchPrevious) return
    
    const prevPage = currentPage - 1
    if (prevPage < 1) return
    
    const pageQueryKey = [...queryKey, { page: prevPage }]
    
    // 이미 캐시에 있으면 skip
    const cached = queryClient.getQueryData(pageQueryKey)
    if (cached) return
    
    await queryClient.prefetchQuery({
      queryKey: pageQueryKey,
      queryFn: () => queryFn(prevPage),
      staleTime: getStaleTime('content'),
    })
  }, [queryClient, queryKey, currentPage, queryFn])
  
  return {
    prefetchNextPage,
    prefetchPreviousPage,
  }
}

/**
 * 사용자 프로필 프리페칭 Hook
 * 
 * 사용자 아바타에 hover할 때 프로필 데이터를 미리 가져옴
 */
export function useProfilePrefetch() {
  const queryClient = useQueryClient()
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const prefetchProfile = useCallback(async (userId: string) => {
    // 이미 캐시에 있으면 프리페치 안 함
    const cached = queryClient.getQueryData(cacheKeys.profile.detail(userId))
    if (cached) return
    
    await queryClient.prefetchQuery({
      queryKey: cacheKeys.profile.detail(userId),
      queryFn: async () => {
        const { data, error } = await supabaseClient()
        .from('users_v2')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) throw error
        return data
      },
      staleTime: getStaleTime('profile'),
    })
  }, [queryClient])
  
  const handleMouseEnter = useCallback((userId: string) => {
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchProfile(userId)
    }, PREFETCH_STRATEGIES.onHover.delay)
  }, [prefetchProfile])
  
  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }
  }, [])
  
  return {
    handleMouseEnter,
    handleMouseLeave,
    prefetchProfile,
  }
}

/**
 * 라우트 프리페칭 Hook
 * 
 * 특정 라우트로 이동하기 전에 필요한 데이터를 미리 가져옴
 */
export function useRoutePrefetch() {
  const queryClient = useQueryClient()
  
  const prefetchRoute = useCallback(async (route: string) => {
    // 라우트별 필요한 데이터 프리페칭
    switch (route) {
      case '/community':
        // 커뮤니티 페이지: 최신 게시글 목록
        await queryClient.prefetchQuery({
          queryKey: cacheKeys.content.list({ content_type: 'community', page: 1 }),
          queryFn: async () => {
            const { data } = await supabaseClient()
        .from('content_v2')
              .select('*, author:users_v2!author_id(id, name, email)')
              .eq('content_type', 'community')
              .order('created_at', { ascending: false })
              .limit(10)
            return data
          },
          staleTime: getStaleTime('content'),
        })
        break
        
      case '/members':
        // 회원 페이지: 회원 목록
        await queryClient.prefetchQuery({
          queryKey: cacheKeys.members.list(),
          queryFn: async () => {
            const { data } = await supabaseClient()
        .from('users_v2')
              .select('*')
              .in('role', ['member', 'leader', 'vice-leader', 'admin'])
              .order('created_at', { ascending: false })
            return data
          },
          staleTime: getStaleTime('members'),
        })
        break
        
      case '/messages':
        // 메시지 페이지: 최근 대화 (V2에서는 아직 구현되지 않음)
        // await queryClient.prefetchQuery({
        //   queryKey: ['conversations'],
        //   queryFn: async () => {
        //     // TODO: V2 메시징 시스템 구현 후 활성화
        //     return []
        //   },
        //   staleTime: getStaleTime('messages'),
        // })
        break
    }
  }, [queryClient])
  
  return { prefetchRoute }
}

/**
 * 검색 결과 프리페칭 Hook
 * 
 * 검색어 입력 시 debounce 후 결과를 미리 가져옴
 */
export function useSearchPrefetch() {
  const queryClient = useQueryClient()
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const prefetchSearch = useCallback(async (query: string) => {
    if (query.length < 2) return
    
    const searchKey = ['search', query]
    
    // 이미 캐시에 있으면 skip
    const cached = queryClient.getQueryData(searchKey)
    if (cached) return
    
    await queryClient.prefetchQuery({
      queryKey: searchKey,
      queryFn: async () => {
        const { data } = await supabaseClient()
        .from('content_v2')
          .select('*, author:users_v2!author_id(id, name, email)')
          .textSearch('title', query)
          .limit(20)
        return data
      },
      staleTime: getStaleTime('search'),
    })
  }, [queryClient])
  
  const handleSearchInput = useCallback((query: string) => {
    // Debounce: 300ms 후 프리페칭
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      prefetchSearch(query)
    }, 300)
  }, [prefetchSearch])
  
  return {
    handleSearchInput,
    prefetchSearch,
  }
}

/**
 * 배치 프리페칭 Hook
 * 
 * 여러 관련 데이터를 한 번에 프리페칭
 */
export function useBatchPrefetch() {
  const queryClient = useQueryClient()
  
  const prefetchBatch = useCallback(async (queries: Array<{
    queryKey: any[]
    queryFn: () => Promise<any>
    staleTime?: number
  }>) => {
    // 병렬로 모든 쿼리 프리페칭
    await Promise.all(
      queries.map(({ queryKey, queryFn, staleTime }) => 
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: staleTime || getStaleTime('content'),
        })
      )
    )
  }, [queryClient])
  
  return { prefetchBatch }
}