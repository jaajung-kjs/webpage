/**
 * 무한 스크롤 최적화 Hook
 * 
 * 성능 최적화를 위한 무한 스크롤 관리
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useInView } from 'react-intersection-observer'
import { useEffect, useMemo } from 'react'
import { CACHE_PRESETS, PREFETCH_STRATEGIES } from '@/lib/cache/cache-strategy'

interface InfiniteScrollOptions<T> {
  queryKey: any[]
  queryFn: (params: { pageParam?: number }) => Promise<{ data: T[]; nextCursor?: number; hasMore?: boolean }>
  pageSize?: number
  staleTime?: number
  gcTime?: number
  enabled?: boolean
  prefetchDistance?: number
  maxPages?: number
}

/**
 * 최적화된 무한 스크롤 Hook
 * 
 * @example
 * const { data, ref, hasNextPage, isFetchingNextPage } = useOptimizedInfiniteScroll({
 *   queryKey: ['posts'],
 *   queryFn: async ({ pageParam = 0 }) => {
 *     const { data } = await supabaseClient
 *       .from('posts')
 *       .select()
 *       .range(pageParam * 10, (pageParam + 1) * 10 - 1)
 *     return { data, nextCursor: pageParam + 1, hasMore: data.length === 10 }
 *   },
 *   pageSize: 10
 * })
 */
export function useOptimizedInfiniteScroll<T>({
  queryKey,
  queryFn,
  pageSize = 10,
  staleTime = CACHE_PRESETS.frequent.staleTime,
  gcTime = CACHE_PRESETS.frequent.gcTime,
  enabled = true,
  prefetchDistance = PREFETCH_STRATEGIES.infiniteScroll.prefetchDistance,
  maxPages = PREFETCH_STRATEGIES.infiniteScroll.maxPages,
}: InfiniteScrollOptions<T>) {
  const queryClient = useQueryClient()
  
  // Intersection Observer를 사용한 스크롤 감지
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px', // 하단 100px 전에 미리 트리거
  })
  
  // 무한 쿼리
  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // 최대 페이지 수 제한
      if (allPages.length >= maxPages) return undefined
      
      // hasMore가 false면 다음 페이지 없음
      if (lastPage.hasMore === false) return undefined
      
      // nextCursor가 있으면 반환
      return lastPage.nextCursor
    },
    staleTime,
    gcTime,
    enabled,
    // 성능 최적화 옵션
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = infiniteQuery
  
  // 스크롤 시 다음 페이지 로드
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])
  
  // 프리페칭: 다음 페이지를 미리 가져오기
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && prefetchDistance > 0) {
      const currentPageCount = data?.pages.length || 0
      
      // 현재 페이지가 특정 지점에 도달하면 미리 가져오기
      if (currentPageCount > 0 && currentPageCount % prefetchDistance === 0) {
        // 다음 페이지를 백그라운드에서 프리페칩
        queryClient.prefetchInfiniteQuery({
          queryKey,
          queryFn,
          initialPageParam: 0,
          getNextPageParam: (lastPage, allPages) => {
            if (allPages.length >= maxPages) return undefined
            if (lastPage.hasMore === false) return undefined
            return lastPage.nextCursor
          },
          pages: prefetchDistance,
        })
      }
    }
  }, [data?.pages.length, hasNextPage, isFetchingNextPage, prefetchDistance])
  
  // 플래튼된 데이터 배열
  const flatData = useMemo(
    () => data?.pages.flatMap((page) => page.data) || [],
    [data]
  )
  
  // 총 아이템 수
  const totalItems = useMemo(
    () => flatData.length,
    [flatData]
  )
  
  // 페이지 수
  const pageCount = data?.pages.length || 0
  
  return {
    // 데이터
    data: flatData,
    allPages: data?.pages || [],
    totalItems,
    pageCount,
    
    // 상태
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    
    // 액션
    fetchNextPage,
    refetch,
    
    // Observer ref (스크롤 감지용)
    ref,
    inView,
  }
}

/**
 * 가상 스크롤 Hook
 * 
 * 대량 데이터를 효율적으로 렌더링하기 위한 가상 스크롤
 * react-window 또는 react-virtual과 함께 사용
 */
export function useVirtualInfiniteScroll<T>({
  queryKey,
  queryFn,
  pageSize = 10,
  overscan = 5, // 화면 밖 여분 렌더링 개수
  estimatedItemHeight = 100, // 예상 아이템 높이
  ...options
}: InfiniteScrollOptions<T> & {
  overscan?: number
  estimatedItemHeight?: number
}) {
  const result = useOptimizedInfiniteScroll({
    queryKey,
    queryFn,
    pageSize,
    ...options,
  })
  
  // 가상 스크롤 설정
  const virtualOptions = useMemo(
    () => ({
      count: result.totalItems,
      estimateSize: () => estimatedItemHeight,
      overscan,
      // 자동 스크롤 위치 복원
      getScrollElement: () => document.documentElement,
      scrollMargin: 0,
    }),
    [result.totalItems, estimatedItemHeight, overscan]
  )
  
  return {
    ...result,
    virtualOptions,
  }
}

/**
 * 방향별 무한 스크롤 Hook
 * 
 * 양방향 무한 스크롤 (위/아래 모두)
 */
export function useBidirectionalInfiniteScroll<T>({
  queryKey,
  queryFn,
  pageSize = 10,
  staleTime = CACHE_PRESETS.frequent.staleTime,
  gcTime = CACHE_PRESETS.frequent.gcTime,
  enabled = true,
}: InfiniteScrollOptions<T> & {
  previousCursor?: number
}) {
  const { ref: bottomRef, inView: bottomInView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  })
  
  const { ref: topRef, inView: topInView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  })
  
  const infiniteQuery = useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (firstPage: any) => firstPage.previousCursor,
    staleTime,
    gcTime,
    enabled,
  })
  
  const {
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
  } = infiniteQuery
  
  // 아래쪽 스크롤
  useEffect(() => {
    if (bottomInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [bottomInView, hasNextPage, isFetchingNextPage, fetchNextPage])
  
  // 위쪽 스크롤
  useEffect(() => {
    if (topInView && hasPreviousPage && !isFetchingPreviousPage) {
      fetchPreviousPage()
    }
  }, [topInView, hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage])
  
  return {
    ...infiniteQuery,
    bottomRef,
    topRef,
    bottomInView,
    topInView,
  }
}