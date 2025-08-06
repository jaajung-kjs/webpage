/**
 * Search Hooks
 * 
 * 통합 검색 기능을 위한 TanStack Query 기반 hooks
 */

import { useQuery } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables } from '@/lib/database.types'

// 검색 결과 타입
export interface SearchResult {
  type: 'post' | 'announcement' | 'case' | 'resource' | 'user'
  id: string
  title?: string
  name?: string
  content?: string
  description?: string
  author_name?: string
  created_at: string
  view_count?: number
  like_count?: number
  comment_count?: number
  avatar_url?: string
  department?: string
  role?: string
}

/**
 * 통합 검색 Hook
 */
export function useSearch(query: string, options?: {
  type?: 'all' | 'post' | 'announcement' | 'case' | 'resource' | 'user'
  limit?: number
}) {
  const searchType = options?.type || 'all'
  const limit = options?.limit || 20
  
  return useQuery<SearchResult[], Error>({
    queryKey: ['search', query, searchType, limit],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return []
      }
      
      const results: SearchResult[] = []
      
      // 콘텐츠 검색 (게시글, 공지사항, 활용사례, 학습자료)
      if (searchType === 'all' || searchType !== 'user') {
        const contentTypes = searchType === 'all' 
          ? ['post', 'announcement', 'case', 'resource'] 
          : [searchType]
        
        const { data: contentData, error: contentError } = await supabaseClient
          .from('content_with_author')
          .select('*')
          .in('content_type', contentTypes)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        if (contentError) throw contentError
        
        if (contentData) {
          results.push(...contentData
            .filter(item => item.id !== null) // null ID 필터링
            .map(item => ({
              type: (item.type || 'post') as 'post' | 'announcement' | 'case' | 'resource',
              id: item.id!,
              title: item.title || undefined,
              content: item.content || undefined,
              author_name: item.author_name || undefined,
              created_at: item.created_at || new Date().toISOString(),
              view_count: item.view_count || 0,
              like_count: item.like_count || 0,
              comment_count: item.comment_count || 0
            })))
        }
      }
      
      // 사용자 검색
      if (searchType === 'all' || searchType === 'user') {
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('*')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%,department.ilike.%${query}%`)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        if (userError) throw userError
        
        if (userData) {
          results.push(...userData.map(user => ({
            type: 'user' as const,
            id: user.id,
            name: user.name || undefined,
            description: user.bio || undefined,
            avatar_url: user.avatar_url || undefined,
            created_at: user.created_at || new Date().toISOString()
          })))
        }
      }
      
      // 결과 정렬 (최신순)
      return results.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    },
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2분
    refetchOnWindowFocus: false,
  })
}

/**
 * 콘텐츠 검색 Hook
 */
export function useSearchContent(query: string, contentType?: string) {
  return useQuery<any[], Error>({
    queryKey: ['search-content', query, contentType],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return []
      }
      
      let searchQuery = supabaseClient
        .from('content_with_author')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`)
      
      if (contentType) {
        searchQuery = searchQuery.eq('content_type', contentType)
      }
      
      const { data, error } = await searchQuery
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      return data || []
    },
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2분
  })
}

/**
 * 사용자 검색 Hook (메시지 전송 등에서 사용)
 */
export function useSearchUsers(query: string, options?: {
  excludeCurrentUser?: boolean
  onlyMembers?: boolean
  limit?: number
}) {
  return useQuery<Tables<'users'>[], Error>({
    queryKey: ['search-users', query, options],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return []
      }
      
      let searchQuery = supabaseClient
        .from('users')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      
      // 현재 사용자 제외
      if (options?.excludeCurrentUser) {
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (user) {
          searchQuery = searchQuery.neq('id', user.id)
        }
      }
      
      // 정회원만 필터링
      if (options?.onlyMembers) {
        searchQuery = searchQuery.in('role', ['member', 'vice-leader', 'leader', 'admin'])
      }
      
      const { data, error } = await searchQuery
        .order('name')
        .limit(options?.limit || 10)
      
      if (error) throw error
      return data || []
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 인기 검색어 Hook
 */
export function usePopularSearches() {
  return useQuery<string[], Error>({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      // 인기 태그를 인기 검색어로 사용
      const { data, error } = await supabaseClient
        .from('content')
        .select('tags')
        .not('tags', 'is', null)
        .limit(100)
      
      if (error) throw error
      
      // 태그 집계
      const tagCounts = new Map<string, number>()
      
      data?.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          })
        }
      })
      
      // 상위 10개 태그 반환
      return Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag)
    },
    staleTime: 30 * 60 * 1000, // 30분
  })
}

/**
 * 최근 검색 기록 Hook (로컬 스토리지 활용)
 */
export function useRecentSearches() {
  return useQuery<string[], Error>({
    queryKey: ['recent-searches'],
    queryFn: async () => {
      if (typeof window === 'undefined') return []
      
      const stored = localStorage.getItem('recent-searches')
      if (!stored) return []
      
      try {
        const searches = JSON.parse(stored)
        return Array.isArray(searches) ? searches.slice(0, 10) : []
      } catch {
        return []
      }
    },
    staleTime: Infinity, // 로컬 데이터이므로 캐시 유지
  })
}

/**
 * 검색 기록 저장 함수
 */
export function saveSearchHistory(query: string) {
  if (typeof window === 'undefined' || !query) return
  
  const stored = localStorage.getItem('recent-searches')
  let searches: string[] = []
  
  if (stored) {
    try {
      searches = JSON.parse(stored)
    } catch {
      searches = []
    }
  }
  
  // 중복 제거 및 최신 검색어를 앞에 추가
  searches = [query, ...searches.filter(s => s !== query)].slice(0, 10)
  
  localStorage.setItem('recent-searches', JSON.stringify(searches))
}