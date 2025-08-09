/**
 * useSearchV2 - V2 스키마 기반 통합 검색 Hook
 * 
 * 주요 개선사항:
 * - search_content_v2 RPC 함수 사용 (Full-text search)
 * - 통합 검색 (콘텐츠, 사용자, 태그)
 * - 실시간 검색 제안
 * - 검색 히스토리 관리
 * - 고급 필터링
 * - 검색 분석 및 통계
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers'
import { supabaseClient } from '@/lib/core/connection-core'
import { Database } from '@/lib/database.types'
import { useState, useCallback, useMemo, useEffect } from 'react'
// Simple debounce implementation to avoid lodash dependency
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

type Tables = Database['public']['Tables']
type ContentV2 = Tables['content_v2']['Row']
type UserV2 = Tables['users_v2']['Row']
type TagV2 = Tables['tags_v2']['Row']

// 검색 결과 타입 (RPC 함수 반환 타입)
export interface SearchResult {
  id: string
  content_type: string
  title: string
  summary: string
  author_name: string
  relevance: number
  created_at: string
}

// 통합 검색 결과 타입
export interface UnifiedSearchResult {
  type: 'content' | 'user' | 'tag'
  id: string
  title: string
  subtitle?: string
  description?: string
  avatar?: string
  relevance: number
  metadata?: Record<string, any>
  created_at?: string
}

// 검색 필터
export interface SearchFilter {
  contentType?: string
  authorId?: string
  dateFrom?: string
  dateTo?: string
  tags?: string[]
  minRelevance?: number
  sortBy?: 'relevance' | 'created_at' | 'popularity'
}

// 검색 히스토리
export interface SearchHistoryItem {
  id: string
  query: string
  filters?: SearchFilter
  resultCount: number
  searchedAt: string
}

// 검색 제안
export interface SearchSuggestion {
  type: 'query' | 'tag' | 'user' | 'content'
  value: string
  label: string
  count?: number
  metadata?: Record<string, any>
}

// 검색 분석
export interface SearchAnalytics {
  totalSearches: number
  uniqueQueries: number
  popularQueries: Array<{ query: string; count: number }>
  popularTags: Array<{ tag: string; count: number }>
  searchTrends: Array<{ date: string; count: number }>
}

export function useSearchV2() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // 로컬 상태
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])

  // 로컬 스토리지에서 검색 히스토리 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`search-history-${user?.id || 'guest'}`)
      if (saved) {
        try {
          setSearchHistory(JSON.parse(saved))
        } catch (error) {
          console.error('Failed to parse search history:', error)
        }
      }
    }
  }, [user?.id])

  // 검색 히스토리 저장
  const saveSearchHistory = useCallback((item: Omit<SearchHistoryItem, 'id'>) => {
    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      ...item
    }

    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.query !== item.query)
      const updated = [newItem, ...filtered].slice(0, 20) // 최대 20개
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(`search-history-${user?.id || 'guest'}`, JSON.stringify(updated))
      }
      
      return updated
    })
  }, [user?.id])

  // 콘텐츠 검색 (RPC 함수 사용)
  const useContentSearch = (
    query: string,
    filter: SearchFilter = {},
    pageSize = 20
  ) => {
    const result = useInfiniteQuery({
      queryKey: ['search-content-v2', query, filter],
      queryFn: async ({ pageParam = 0 }) => {
        if (!query.trim()) return { results: [], nextCursor: 0, hasMore: false, totalCount: 0 }

        const { data, error } = await supabaseClient
          .rpc('search_content_v2', {
            p_query: query.trim(),
            p_content_type: filter.contentType || undefined,
            p_limit: pageSize,
            p_offset: pageParam
          })

        if (error) throw error

        let results = data || []

        // 추가 필터 적용 (클라이언트 사이드)
        if (filter.minRelevance) {
          results = results.filter((r: SearchResult) => r.relevance >= filter.minRelevance!)
        }

        if (filter.dateFrom) {
          results = results.filter((r: SearchResult) => r.created_at >= filter.dateFrom!)
        }

        if (filter.dateTo) {
          results = results.filter((r: SearchResult) => r.created_at <= filter.dateTo!)
        }

        // 정렬
        if (filter.sortBy === 'created_at') {
          results.sort((a: SearchResult, b: SearchResult) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        } else if (filter.sortBy === 'relevance') {
          results.sort((a: SearchResult, b: SearchResult) => b.relevance - a.relevance)
        }

        return {
          results: results as SearchResult[],
          nextCursor: pageParam + pageSize,
          hasMore: results.length === pageSize,
          totalCount: results.length + pageParam
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      enabled: query.trim().length > 0,
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
      initialPageParam: 0
    })

    // Track search history when search succeeds
    useEffect(() => {
      if (result.isSuccess && result.data) {
        const totalResults = result.data.pages.reduce((sum, page) => sum + page.results.length, 0)
        if (query.trim() && totalResults >= 0) {
          saveSearchHistory({
            query: query.trim(),
            filters: filter,
            resultCount: totalResults,
            searchedAt: new Date().toISOString()
          })
        }
      }
    }, [result.isSuccess, result.data, query, filter, saveSearchHistory])

    return result
  }

  // 통합 검색 (콘텐츠 + 사용자 + 태그)
  const useUnifiedSearch = (query: string, pageSize = 15) => {
    return useQuery({
      queryKey: ['unified-search-v2', query],
      queryFn: async () => {
        if (!query.trim()) return []

        const results: UnifiedSearchResult[] = []

        try {
          // 1. 콘텐츠 검색
          const { data: contentResults } = await supabaseClient
            .rpc('search_content_v2', {
              p_query: query.trim(),
              p_limit: Math.ceil(pageSize * 0.6) // 60%
            })

          if (contentResults) {
            contentResults.forEach((item: SearchResult) => {
              results.push({
                type: 'content',
                id: item.id,
                title: item.title,
                subtitle: item.author_name,
                description: item.summary,
                relevance: item.relevance,
                metadata: { content_type: item.content_type },
                created_at: item.created_at
              })
            })
          }

          // 2. 사용자 검색
          const { data: userResults } = await supabaseClient
            .from('users_v2')
            .select('id, name, email, bio, avatar_url, role, department')
            .or(`name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%,bio.ilike.%${query.trim()}%`)
            .is('deleted_at', null)
            .limit(Math.ceil(pageSize * 0.25)) // 25%

          if (userResults) {
            userResults.forEach((user: any) => {
              const relevance = calculateUserRelevance(user, query.trim())
              results.push({
                type: 'user',
                id: user.id,
                title: user.name,
                subtitle: user.department || user.role,
                description: user.bio,
                avatar: user.avatar_url,
                relevance,
                metadata: { role: user.role, department: user.department }
              })
            })
          }

          // 3. 태그 검색
          const { data: tagResults } = await supabaseClient
            .from('tags_v2')
            .select('*')
            .ilike('name', `%${query.trim()}%`)
            .limit(Math.ceil(pageSize * 0.15)) // 15%

          if (tagResults) {
            tagResults.forEach((tag: TagV2) => {
              const relevance = calculateTagRelevance(tag, query.trim())
              results.push({
                type: 'tag',
                id: tag.id,
                title: `#${tag.name}`,
                subtitle: `${tag.usage_count}개 게시물`,
                description: `${tag.name} 태그가 포함된 콘텐츠`,
                relevance,
                metadata: { usage_count: tag.usage_count, slug: tag.slug }
              })
            })
          }

          // 관련도순 정렬
          return results.sort((a, b) => b.relevance - a.relevance)
        } catch (error) {
          console.error('Unified search error:', error)
          return []
        }
      },
      enabled: query.trim().length > 0,
      staleTime: 10 * 1000, // 10초 (빠른 응답)
      gcTime: 2 * 60 * 1000, // 2분
    })
  }

  // 검색 제안 (실시간)
  const useSearchSuggestions = (query: string, limit = 10) => {
    return useQuery({
      queryKey: ['search-suggestions-v2', query],
      queryFn: async () => {
        if (!query.trim() || query.trim().length < 2) return []

        const suggestions: SearchSuggestion[] = []

        try {
          // 1. 인기 태그 제안
          const { data: tags } = await supabaseClient
            .from('tags_v2')
            .select('name, usage_count')
            .ilike('name', `%${query.trim()}%`)
            .order('usage_count', { ascending: false })
            .limit(Math.ceil(limit * 0.4))

          if (tags) {
            tags.forEach((tag: any) => {
              suggestions.push({
                type: 'tag',
                value: tag.name,
                label: `#${tag.name}`,
                count: tag.usage_count
              })
            })
          }

          // 2. 사용자 제안
          const { data: users } = await supabaseClient
            .from('users_v2')
            .select('id, name, avatar_url, role')
            .ilike('name', `%${query.trim()}%`)
            .is('deleted_at', null)
            .limit(Math.ceil(limit * 0.3))

          if (users) {
            users.forEach((user: any) => {
              suggestions.push({
                type: 'user',
                value: user.name,
                label: user.name,
                metadata: { id: user.id, avatar_url: user.avatar_url, role: user.role }
              })
            })
          }

          // 3. 최근 검색 제안
          const recentQueries = searchHistory
            .filter(h => h.query.toLowerCase().includes(query.toLowerCase()))
            .slice(0, Math.ceil(limit * 0.3))

          recentQueries.forEach(history => {
            suggestions.push({
              type: 'query',
              value: history.query,
              label: history.query,
              count: history.resultCount,
              metadata: { searchedAt: history.searchedAt }
            })
          })

          return suggestions.slice(0, limit)
        } catch (error) {
          console.error('Search suggestions error:', error)
          return []
        }
      },
      enabled: query.trim().length >= 2,
      staleTime: 5 * 1000, // 5초
      gcTime: 30 * 1000, // 30초
    })
  }

  // 인기 검색어 조회
  const usePopularSearches = (limit = 10) => {
    return useQuery({
      queryKey: ['popular-searches-v2', limit],
      queryFn: async () => {
        // 로컬 히스토리에서 인기 검색어 추출
        const queryCount = new Map<string, number>()
        
        searchHistory.forEach(item => {
          const current = queryCount.get(item.query) || 0
          queryCount.set(item.query, current + 1)
        })

        return Array.from(queryCount.entries())
          .map(([query, count]) => ({ query, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
      },
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
    })
  }

  // 검색 히스토리 삭제
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`search-history-${user?.id || 'guest'}`)
    }
  }, [user?.id])

  // 특정 검색 히스토리 항목 삭제
  const removeSearchHistoryItem = useCallback((id: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(item => item.id !== id)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`search-history-${user?.id || 'guest'}`, JSON.stringify(updated))
      }
      return updated
    })
  }, [user?.id])

  // 디바운스된 검색 함수
  const debouncedSearch = useMemo(
    () => debounce((query: string, callback: (query: string) => void) => {
      callback(query)
    }, 300),
    []
  )

  // 검색 분석 데이터 생성
  const generateSearchAnalytics = useCallback((): SearchAnalytics => {
    const queryCount = new Map<string, number>()
    const dateCount = new Map<string, number>()

    searchHistory.forEach(item => {
      // 쿼리 카운트
      const current = queryCount.get(item.query) || 0
      queryCount.set(item.query, current + 1)

      // 날짜별 카운트
      const date = new Date(item.searchedAt).toISOString().split('T')[0]
      const dateCountCurrent = dateCount.get(date) || 0
      dateCount.set(date, dateCountCurrent + 1)
    })

    return {
      totalSearches: searchHistory.length,
      uniqueQueries: queryCount.size,
      popularQueries: Array.from(queryCount.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      popularTags: [], // 태그 분석은 추후 구현
      searchTrends: Array.from(dateCount.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }
  }, [searchHistory])

  return {
    // Query Hooks
    useContentSearch,
    useUnifiedSearch,
    useSearchSuggestions,
    usePopularSearches,

    // 검색 히스토리
    searchHistory,
    clearSearchHistory,
    removeSearchHistoryItem,
    generateSearchAnalytics,

    // 유틸리티
    debouncedSearch,
  }
}

// 헬퍼 함수들

// 사용자 관련도 계산
function calculateUserRelevance(user: any, query: string): number {
  const q = query.toLowerCase()
  let relevance = 0

  // 이름 일치도
  if (user.name.toLowerCase().includes(q)) {
    relevance += user.name.toLowerCase() === q ? 100 : 80
  }

  // 이메일 일치도
  if (user.email && user.email.toLowerCase().includes(q)) {
    relevance += 60
  }

  // 바이오 일치도
  if (user.bio && user.bio.toLowerCase().includes(q)) {
    relevance += 40
  }

  // 부서 일치도
  if (user.department && user.department.toLowerCase().includes(q)) {
    relevance += 30
  }

  return Math.min(relevance, 100)
}

// 태그 관련도 계산
function calculateTagRelevance(tag: TagV2, query: string): number {
  const q = query.toLowerCase()
  let relevance = 0

  // 태그명 일치도
  if (tag.name.toLowerCase().includes(q)) {
    relevance += tag.name.toLowerCase() === q ? 100 : 80
  }

  // 사용량에 따른 가중치
  relevance += Math.min(tag.usage_count * 2, 20)

  return Math.min(relevance, 100)
}

// 검색 타입별 설정
export const SEARCH_TYPE_CONFIG = {
  content: {
    icon: '📄',
    label: '콘텐츠',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  user: {
    icon: '👤',
    label: '사용자',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  tag: {
    icon: '#️⃣',
    label: '태그',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  query: {
    icon: '🔍',
    label: '검색어',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  }
} as const