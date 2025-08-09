/**
 * useBookmarksV2 - 북마크 시스템 V2 Hook
 * 
 * 주요 기능:
 * - interactions_v2 테이블 기반 북마크 시스템 (interaction_type='bookmark')
 * - 실시간 북마크 상태 업데이트
 * - 낙관적 업데이트 지원
 * - 북마크 검색 및 필터링
 * - 북마크 통계 및 분석
 * - TanStack Query v5 패턴 적용
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useRealtimeQueryV2 } from '@/hooks/core/useRealtimeQueryV2'
import { useAuthV2 } from './useAuthV2'
import { toast } from 'sonner'
import type { Tables, TablesInsert, Json } from '@/lib/database.types'

// 북마크 메타데이터 타입
export interface BookmarkMetadata {
  bookmarkedAt: string
  contentType: 'content' | 'comment' | 'activity' | 'resource'
  tags?: string[]
  notes?: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
}

// 북마크된 콘텐츠 정보
export interface BookmarkedContentV2 {
  bookmark: Tables<'interactions_v2'> & {
    metadata: BookmarkMetadata
  }
  content: {
    id: string
    title: string
    content_type: string
    author_name: string
    author_id: string
    created_at: string
    view_count: number
    like_count: number
    comment_count: number
    description?: string
    thumbnail_url?: string
  }
  author: {
    id: string
    name: string
    avatar_url: string | null
    role: string
  }
}

// 북마크 통계
export interface BookmarkStatsV2 {
  totalBookmarks: number
  byContentType: Record<string, number>
  byCategory: Record<string, number>
  byPriority: Record<string, number>
  recentBookmarks: BookmarkedContentV2[]
  topCategories: Array<{
    category: string
    count: number
  }>
  monthlyBookmarks: Array<{
    month: string
    count: number
  }>
}

// 북마크 생성 파라미터
export interface CreateBookmarkParams {
  targetId: string
  targetType: 'content' | 'comment' | 'activity' | 'resource'
  tags?: string[]
  notes?: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
}

// 북마크 업데이트 파라미터
export interface UpdateBookmarkParams {
  bookmarkId: string
  tags?: string[]
  notes?: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
}

/**
 * 북마크 여부 확인 Hook
 */
export function useIsBookmarkedV2(targetId?: string, targetType?: string) {
  const { user } = useAuthV2()
  
  return useQuery<boolean>({
    queryKey: ['bookmarks-v2', 'status', targetId, targetType, user?.id],
    queryFn: async () => {
      if (!user || !targetId || !targetType) return false
      
      const { data, error } = await supabaseClient
        .from('interactions_v2')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('interaction_type', 'bookmark')
        .maybeSingle()
      
      if (error) throw error
      return !!data
    },
    enabled: !!user && !!targetId && !!targetType,
    gcTime: 5 * 60 * 1000, // 5분
    staleTime: 2 * 60 * 1000 // 2분
  })
}

/**
 * 북마크 토글 Hook
 */
export function useToggleBookmarkV2() {
  const { user, isMember } = useAuthV2()
  const queryClient = useQueryClient()
  
  return useMutation<boolean, Error, CreateBookmarkParams>({
    mutationFn: async ({ targetId, targetType, tags, notes, category, priority }) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      if (!isMember) throw new Error('동아리 회원만 북마크할 수 있습니다.')
      
      // 현재 북마크 상태 확인
      const { data: existing } = await supabaseClient
        .from('interactions_v2')
        .select('id')
        .eq('user_id', user.id)
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .eq('interaction_type', 'bookmark')
        .maybeSingle()
      
      if (existing) {
        // 북마크 제거
        const { error } = await supabaseClient
          .from('interactions_v2')
          .delete()
          .eq('id', existing.id)
        
        if (error) throw error
        return false
      } else {
        // 북마크 추가
        const metadata: BookmarkMetadata = {
          bookmarkedAt: new Date().toISOString(),
          contentType: targetType as BookmarkMetadata['contentType'],
          tags,
          notes,
          category,
          priority: priority || 'medium'
        }
        
        const bookmarkData: TablesInsert<'interactions_v2'> = {
          user_id: user.id,
          target_id: targetId,
          target_type: targetType,
          interaction_type: 'bookmark',
          metadata: metadata as any
        }
        
        const { error } = await supabaseClient
          .from('interactions_v2')
          .insert(bookmarkData)
        
        if (error) throw error
        return true
      }
    },
    onMutate: async (variables) => {
      // 낙관적 업데이트
      await queryClient.cancelQueries({ 
        queryKey: ['bookmarks-v2', 'status', variables.targetId, variables.targetType, user?.id] 
      })
      
      const previous = queryClient.getQueryData<boolean>([
        'bookmarks-v2', 'status', variables.targetId, variables.targetType, user?.id
      ])
      
      queryClient.setQueryData([
        'bookmarks-v2', 'status', variables.targetId, variables.targetType, user?.id
      ], !previous)
      
      return { previous }
    },
    onError: (err, variables, context: any) => {
      // 에러 시 롤백
      if (context?.previous !== undefined) {
        queryClient.setQueryData([
          'bookmarks-v2', 'status', variables.targetId, variables.targetType, user?.id
        ], context.previous)
      }
      toast.error(err.message || '북마크 처리에 실패했습니다.')
    },
    onSuccess: (isBookmarked, variables) => {
      toast.success(isBookmarked ? '북마크에 추가되었습니다.' : '북마크에서 제거되었습니다.')
      
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['bookmarks-v2'] })
    }
  })
}

/**
 * 내 북마크 목록 조회 Hook
 */
export function useMyBookmarksV2(options?: {
  targetType?: string
  category?: string
  priority?: 'low' | 'medium' | 'high'
  tags?: string[]
  limit?: number
  offset?: number
}) {
  const { user } = useAuthV2()
  
  return useRealtimeQueryV2<BookmarkedContentV2[]>({
    queryKey: ['bookmarks-v2', 'my-bookmarks', user?.id, options],
    queryFn: async () => {
      if (!user) return []
      
      let query = supabaseClient
        .from('interactions_v2')
        .select('*')
        .eq('user_id', user.id)
        .eq('interaction_type', 'bookmark')
      
      // 필터링
      if (options?.targetType) {
        query = query.eq('target_type', options.targetType)
      }
      
      // 페이지네이션
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }
      
      query = query.order('created_at', { ascending: false })
      
      const { data: bookmarks, error } = await query
      
      if (error) throw error
      if (!bookmarks || bookmarks.length === 0) return []
      
      // 북마크된 콘텐츠 정보 조회
      const bookmarkedContents: BookmarkedContentV2[] = []
      
      for (const bookmark of bookmarks) {
        const metadata = bookmark.metadata as any
        
        // 메타데이터 필터링
        if (options?.category && metadata.category !== options.category) continue
        if (options?.priority && metadata.priority !== options.priority) continue
        if (options?.tags && options.tags.length > 0) {
          const hasMatchingTag = options.tags.some(tag => metadata.tags?.includes(tag))
          if (!hasMatchingTag) continue
        }
        
        // 콘텐츠 정보 조회 (target_type에 따라 다른 테이블 조회)
        let contentInfo = null
        let authorInfo = null
        
        try {
          if (bookmark.target_type === 'content') {
            const { data: content } = await supabaseClient
              .from('content_v2')
              .select(`
                id, title, content_type, author_id, created_at, 
                view_count, like_count, comment_count, summary,
                author:users_v2!content_v2_author_id_fkey (id, name, avatar_url, role)
              `)
              .eq('id', bookmark.target_id)
              .single()
            
            if (content) {
              contentInfo = {
                id: content.id,
                title: content.title,
                content_type: content.content_type,
                author_name: (content as any).author?.name || 'Unknown',
                author_id: content.author_id,
                created_at: content.created_at,
                view_count: content.view_count || 0,
                like_count: content.like_count || 0,
                comment_count: content.comment_count || 0,
                description: (content as any).summary
              }
              authorInfo = (content as any).author
            }
          } else if (bookmark.target_type === 'comment') {
            const { data: comment } = await supabaseClient
              .from('comments_v2')
              .select(`
                id, comment_text, author_id, created_at,
                author:users_v2!comments_v2_author_id_fkey (id, name, avatar_url, role)
              `)
              .eq('id', bookmark.target_id)
              .single()
            
            if (comment) {
              contentInfo = {
                id: comment.id,
                title: (comment as any).comment_text.substring(0, 100) + '...',
                content_type: 'comment',
                author_name: (comment as any).author?.name || 'Unknown',
                author_id: comment.author_id,
                created_at: comment.created_at,
                view_count: 0,
                like_count: 0,
                comment_count: 0
              }
              authorInfo = (comment as any).author
            }
          } else if (bookmark.target_type === 'activity') {
            const { data: activity } = await supabaseClient
              .from('activities_v2')
              .select(`
                id, event_type, event_date, location,
                content:content_v2!activities_v2_content_id_fkey (
                  title, author_id,
                  author:users_v2!content_v2_author_id_fkey (id, name, avatar_url, role)
                )
              `)
              .eq('id', bookmark.target_id)
              .single()
            
            if (activity && activity.content) {
              contentInfo = {
                id: activity.id,
                title: (activity.content as any)?.title || `${activity.event_type} 활동`,
                content_type: 'activity',
                author_name: (activity.content as any)?.author?.name || 'Unknown',
                author_id: (activity.content as any)?.author_id || '',
                created_at: activity.event_date,
                view_count: 0,
                like_count: 0,
                comment_count: 0,
                description: `${activity.event_type} - ${activity.location || '장소 미정'}`
              }
              authorInfo = (activity.content as any)?.author
            }
          }
          
          if (contentInfo && authorInfo) {
            bookmarkedContents.push({
              bookmark: {
                ...bookmark,
                metadata
              },
              content: contentInfo,
              author: authorInfo
            })
          }
        } catch (err) {
          console.warn(`북마크된 콘텐츠 조회 실패: ${bookmark.target_id}`, err)
        }
      }
      
      return bookmarkedContents
    },
    enabled: !!user,
    gcTime: 5 * 60 * 1000, // 5분
    staleTime: 2 * 60 * 1000, // 2분
    realtime: {
      enabled: !!user,
      table: 'interactions_v2',
      filter: `user_id=eq.${user?.id},interaction_type=eq.bookmark`
    }
  })
}

/**
 * 북마크 통계 조회 Hook
 */
export function useBookmarkStatsV2() {
  const { user } = useAuthV2()
  
  return useQuery<BookmarkStatsV2>({
    queryKey: ['bookmarks-v2', 'stats', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          totalBookmarks: 0,
          byContentType: {},
          byCategory: {},
          byPriority: {},
          recentBookmarks: [],
          topCategories: [],
          monthlyBookmarks: []
        }
      }
      
      // 전체 북마크 조회
      const { data: bookmarks, error } = await supabaseClient
        .from('interactions_v2')
        .select('*, metadata')
        .eq('user_id', user.id)
        .eq('interaction_type', 'bookmark')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const totalBookmarks = bookmarks?.length || 0
      const byContentType: Record<string, number> = {}
      const byCategory: Record<string, number> = {}
      const byPriority: Record<string, number> = {}
      const monthlyData: Record<string, number> = {}
      
      bookmarks?.forEach(bookmark => {
        const metadata = bookmark.metadata as any
        
        // 콘텐츠 타입별 집계
        byContentType[bookmark.target_type] = (byContentType[bookmark.target_type] || 0) + 1
        
        // 카테고리별 집계
        if (metadata.category) {
          byCategory[metadata.category] = (byCategory[metadata.category] || 0) + 1
        }
        
        // 우선순위별 집계
        const priority = metadata.priority || 'medium'
        byPriority[priority] = (byPriority[priority] || 0) + 1
        
        // 월별 집계
        const month = new Date(bookmark.created_at).toISOString().substring(0, 7)
        monthlyData[month] = (monthlyData[month] || 0) + 1
      })
      
      // 상위 카테고리 (최대 5개)
      const topCategories = Object.entries(byCategory)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }))
      
      // 월별 데이터 변환
      const monthlyBookmarks = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }))
      
      // 최근 북마크 (useMyBookmarksV2에서 가져오기)
      const recentBookmarks: BookmarkedContentV2[] = []
      
      return {
        totalBookmarks,
        byContentType,
        byCategory,
        byPriority,
        recentBookmarks,
        topCategories,
        monthlyBookmarks
      }
    },
    enabled: !!user,
    gcTime: 5 * 60 * 1000, // 5분
    staleTime: 2 * 60 * 1000 // 2분
  })
}

/**
 * 북마크 업데이트 Hook (메타데이터)
 */
export function useUpdateBookmarkV2() {
  const { user } = useAuthV2()
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, UpdateBookmarkParams>({
    mutationFn: async ({ bookmarkId, tags, notes, category, priority }) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      
      // 기존 북마크 정보 조회
      const { data: bookmark, error: fetchError } = await supabaseClient
        .from('interactions_v2')
        .select('metadata')
        .eq('id', bookmarkId)
        .eq('user_id', user.id)
        .eq('interaction_type', 'bookmark')
        .single()
      
      if (fetchError) throw fetchError
      
      const currentMetadata = bookmark.metadata as unknown as BookmarkMetadata
      const updatedMetadata: BookmarkMetadata = {
        ...currentMetadata,
        ...(tags !== undefined && { tags }),
        ...(notes !== undefined && { notes }),
        ...(category !== undefined && { category }),
        ...(priority !== undefined && { priority })
      }
      
      const { error } = await supabaseClient
        .from('interactions_v2')
        .update({ metadata: updatedMetadata as unknown as Json })
        .eq('id', bookmarkId)
        .eq('user_id', user.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('북마크 정보가 업데이트되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['bookmarks-v2'] })
    },
    onError: (error) => {
      console.error('북마크 업데이트 실패:', error)
      toast.error('북마크 업데이트에 실패했습니다.')
    }
  })
}

/**
 * 북마크 일괄 삭제 Hook
 */
export function useDeleteBookmarksV2() {
  const { user } = useAuthV2()
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, string[]>({
    mutationFn: async (bookmarkIds) => {
      if (!user || bookmarkIds.length === 0) throw new Error('삭제할 북마크가 없습니다.')
      
      const { error } = await supabaseClient
        .from('interactions_v2')
        .delete()
        .eq('user_id', user.id)
        .eq('interaction_type', 'bookmark')
        .in('id', bookmarkIds)
      
      if (error) throw error
    },
    onSuccess: (_, bookmarkIds) => {
      toast.success(`${bookmarkIds.length}개의 북마크가 삭제되었습니다.`)
      queryClient.invalidateQueries({ queryKey: ['bookmarks-v2'] })
    },
    onError: (error) => {
      console.error('북마크 삭제 실패:', error)
      toast.error('북마크 삭제에 실패했습니다.')
    }
  })
}

/**
 * 북마크 검색 Hook
 */
export function useSearchBookmarksV2(query: string, options?: {
  targetType?: string
  category?: string
  limit?: number
}) {
  const { user } = useAuthV2()
  
  return useQuery<BookmarkedContentV2[]>({
    queryKey: ['bookmarks-v2', 'search', query, options, user?.id],
    queryFn: async () => {
      if (!user || !query.trim()) return []
      
      let searchQuery = supabaseClient
        .from('interactions_v2')
        .select('*')
        .eq('user_id', user.id)
        .eq('interaction_type', 'bookmark')
      
      if (options?.targetType) {
        searchQuery = searchQuery.eq('target_type', options.targetType)
      }
      
      if (options?.limit) {
        searchQuery = searchQuery.limit(options.limit)
      }
      
      searchQuery = searchQuery.order('created_at', { ascending: false })
      
      const { data: bookmarks, error } = await searchQuery
      
      if (error) throw error
      if (!bookmarks) return []
      
      // 메타데이터와 콘텐츠에서 검색어 매칭
      const matchingBookmarks = bookmarks.filter(bookmark => {
        const metadata = bookmark.metadata as any
        const searchLower = query.toLowerCase()
        
        // 카테고리, 태그, 노트에서 검색
        const categoryMatch = metadata.category?.toLowerCase().includes(searchLower)
        const tagsMatch = metadata.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
        const notesMatch = metadata.notes?.toLowerCase().includes(searchLower)
        
        return categoryMatch || tagsMatch || notesMatch
      })
      
      // TODO: 실제 콘텐츠 내용에서도 검색하려면 추가 쿼리 필요
      
      return [] // 일단 빈 배열 반환, 향후 구현 필요
    },
    enabled: !!user && !!query.trim(),
    gcTime: 5 * 60 * 1000,
    staleTime: 30 * 1000
  })
}