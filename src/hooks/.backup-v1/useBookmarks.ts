/**
 * Bookmarks Management Hooks
 * 
 * 북마크 기능을 위한 TanStack Query 기반 hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { Tables } from '@/lib/database.types'
import { useAuth } from '@/providers'
import { toast } from 'sonner'

// 북마크된 콘텐츠 타입
export interface BookmarkedContent {
  id: string
  content_id: string | null
  created_at: string
  content: {
    id: string
    title: string
    content_type: string
    author_name: string
    created_at: string
    view_count: number
    like_count: number
    comment_count: number
  }
}

/**
 * 북마크 여부 확인 Hook
 */
export function useIsBookmarked(contentId: string | undefined) {
  const { user } = useAuth()
  
  return useQuery<boolean, Error>({
    queryKey: ['bookmark-status', contentId, user?.id],
    queryFn: async () => {
      if (!user || !contentId) return false
      
      const { data, error } = await supabaseClient
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .eq('type', 'bookmark')
        .maybeSingle()
      
      if (error) throw error
      return !!data
    },
    enabled: !!user && !!contentId,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 북마크 토글 Hook
 */
export function useToggleBookmark() {
  const queryClient = useQueryClient()
  const { user, isMember } = useAuth()
  
  return useMutation<boolean, Error, string>({
    mutationFn: async (contentId) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      if (!isMember) throw new Error('동아리 회원만 북마크할 수 있습니다.')
      
      // 현재 북마크 상태 확인
      const { data: existing } = await supabaseClient
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .eq('type', 'bookmark')
        .maybeSingle()
      
      if (existing) {
        // 북마크 제거
        const { error } = await supabaseClient
          .from('interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', contentId)
          .eq('type', 'bookmark')
        
        if (error) throw error
        return false
      } else {
        // 북마크 추가
        const { error } = await supabaseClient
          .from('interactions')
          .insert({
            user_id: user.id,
            content_id: contentId,
            type: 'bookmark'
          })
        
        if (error) throw error
        return true
      }
    },
    onMutate: async (contentId) => {
      // 낙관적 업데이트
      await queryClient.cancelQueries({ queryKey: ['bookmark-status', contentId, user?.id] })
      
      const previousStatus = queryClient.getQueryData<boolean>(['bookmark-status', contentId, user?.id])
      
      queryClient.setQueryData(['bookmark-status', contentId, user?.id], !previousStatus)
      
      return { previousStatus }
    },
    onError: (err, contentId, context: any) => {
      // 에러 시 롤백
      if (context?.previousStatus !== undefined) {
        queryClient.setQueryData(['bookmark-status', contentId, user?.id], context.previousStatus)
      }
      toast.error(err.message || '북마크 처리에 실패했습니다.')
    },
    onSuccess: (isBookmarked) => {
      toast.success(isBookmarked ? '북마크에 추가되었습니다.' : '북마크에서 제거되었습니다.')
    },
    onSettled: (_, __, contentId) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['bookmark-status', contentId] })
      queryClient.invalidateQueries({ queryKey: ['my-bookmarks'] })
    }
  })
}

/**
 * 내 북마크 목록 조회 Hook
 */
export function useMyBookmarks(options?: {
  contentType?: string
  limit?: number
  offset?: number
}) {
  const { user } = useAuth()
  
  return useQuery<BookmarkedContent[], Error>({
    queryKey: ['my-bookmarks', user?.id, options],
    queryFn: async () => {
      if (!user) return []
      
      let query = supabaseClient
        .from('interactions')
        .select(`
          id,
          content_id,
          created_at,
          content:content_with_author!inner (
            id,
            title,
            content_type,
            author_name,
            created_at,
            view_count,
            like_count,
            comment_count
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'bookmark')
      
      // 콘텐츠 타입 필터링
      if (options?.contentType) {
        query = query.eq('content.content_type', options.contentType)
      }
      
      // 페이지네이션
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }
      
      // 최신순 정렬
      query = query.order('created_at', { ascending: false })
      
      const { data, error } = await query
      
      if (error) throw error
      
      // 타입 변환
      return (data || []).map(item => ({
        id: item.id,
        content_id: item.content_id,
        created_at: item.created_at,
        content: (item as any).content
      }))
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2분
  })
}

/**
 * 북마크 통계 조회 Hook
 */
export function useBookmarkStats() {
  const { user } = useAuth()
  
  return useQuery<{
    totalBookmarks: number
    byContentType: Record<string, number>
    recentBookmarks: BookmarkedContent[]
  }, Error>({
    queryKey: ['bookmark-stats', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          totalBookmarks: 0,
          byContentType: {},
          recentBookmarks: []
        }
      }
      
      // 전체 북마크 수 조회
      const { count: totalBookmarks, error: countError } = await supabaseClient
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'bookmark')
      
      if (countError) throw countError
      
      // 콘텐츠 타입별 북마크 조회
      const { data: bookmarks, error: bookmarksError } = await supabaseClient
        .from('interactions')
        .select(`
          content:content_with_author!inner (
            content_type
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'bookmark')
      
      if (bookmarksError) throw bookmarksError
      
      // 타입별 집계
      const byContentType = (bookmarks || []).reduce((acc, item) => {
        const type = (item as any).content?.content_type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // 최근 북마크 5개 조회
      const { data: recentData, error: recentError } = await supabaseClient
        .from('interactions')
        .select(`
          id,
          content_id,
          created_at,
          content:content_with_author!inner (
            id,
            title,
            content_type,
            author_name,
            created_at,
            view_count,
            like_count,
            comment_count
          )
        `)
        .eq('user_id', user.id)
        .eq('type', 'bookmark')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (recentError) throw recentError
      
      const recentBookmarks = (recentData || []).map(item => ({
        id: item.id,
        content_id: item.content_id,
        created_at: item.created_at,
        content: (item as any).content
      }))
      
      return {
        totalBookmarks: totalBookmarks || 0,
        byContentType,
        recentBookmarks
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * 북마크 일괄 삭제 Hook
 */
export function useDeleteBookmarks() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation<void, Error, string[]>({
    mutationFn: async (bookmarkIds) => {
      if (!user) throw new Error('로그인이 필요합니다.')
      
      const { error } = await supabaseClient
        .from('interactions')
        .delete()
        .eq('user_id', user.id)
        .eq('type', 'bookmark')
        .in('id', bookmarkIds)
      
      if (error) throw error
    },
    onSuccess: (_, bookmarkIds) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['my-bookmarks'] })
      queryClient.invalidateQueries({ queryKey: ['bookmark-stats'] })
      queryClient.invalidateQueries({ queryKey: ['bookmark-status'] })
      
      toast.success(`${bookmarkIds.length}개의 북마크가 삭제되었습니다.`)
    },
    onError: (error) => {
      console.error('Bookmarks delete error:', error)
      toast.error('북마크 삭제에 실패했습니다.')
    }
  })
}