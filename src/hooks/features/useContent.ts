/**
 * useContent - 콘텐츠 관련 Hook들
 * 
 * TanStack Query를 활용한 콘텐츠 기능 구현
 */

'use client'

import { useCallback } from 'react'
import { useAuth } from '@/providers'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/lib/database.types'

// ContentWithAuthor 타입 정의 (Views에서 가져옴)
type ContentWithAuthor = Database['public']['Views']['content_with_author']['Row']

/**
 * 콘텐츠 목록 조회 Hook
 */
export function useContentList(contentType: string, category?: string) {
  return useQuery<ContentWithAuthor[], Error>({
    queryKey: ['content', contentType, category],
    queryFn: async () => {
      console.log(`[useContentList] Fetching content for type: ${contentType}, category: ${category}`)
      
      let query = supabaseClient
        .from('content_with_author')
        .select('*')
        .eq('type', contentType as 'post' | 'case' | 'announcement' | 'resource' | 'activity')
        .order('created_at', { ascending: false })
      
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error(`[useContentList] Error fetching ${contentType}:`, error)
        throw error
      }
      
      console.log(`[useContentList] Fetched ${data?.length || 0} items for ${contentType}`)
      return data || []
    },
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

/**
 * 단일 콘텐츠 조회 Hook
 */
export function useContent(id: string | undefined) {
  return useQuery<ContentWithAuthor, Error>({
    queryKey: ['content', id],
    queryFn: async () => {
      if (!id) throw new Error('Content ID is required')
      
      const { data, error } = await supabaseClient
        .from('content_with_author')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false, // 편집 중 자동 리페치 비활성화
  })
}

/**
 * 콘텐츠 생성 Hook
 */
export function useCreateContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'content'>, Error, TablesInsert<'content'>>({
    mutationFn: async (newContent) => {
      const { data, error } = await supabaseClient
        .from('content')
        .insert({
          ...newContent,
          author_id: user!.id
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['content', data.type] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['content', 'recent'] 
      })
    }
  })
}

/**
 * 콘텐츠 수정 Hook
 */
export function useUpdateContent() {
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'content'>, Error, { id: string; updates: TablesUpdate<'content'> }>({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabaseClient
        .from('content')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async ({ id, updates }) => {
      // 이전 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['content', id] })
      
      // 이전 값 스냅샷
      const previousContent = queryClient.getQueryData<ContentWithAuthor>(['content', id])
      
      // 낙관적 업데이트
      if (previousContent) {
        queryClient.setQueryData(['content', id], {
          ...previousContent,
          ...updates,
          updated_at: new Date().toISOString()
        })
      }
      
      return { previousContent }
    },
    onError: (err, variables, context: any) => {
      // 에러 시 롤백
      if (context?.previousContent) {
        queryClient.setQueryData(['content', variables.id], context.previousContent)
      }
    },
    onSettled: (data, error, variables) => {
      // 성공/실패 관계없이 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['content', variables.id] })
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['content', data.type] })
      }
    }
  })
}

/**
 * 콘텐츠 삭제 Hook
 */
export function useDeleteContent() {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, { id: string; contentType: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabaseClient
        .from('content')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['content', variables.contentType] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['content', variables.id] 
      })
    }
  })
}

/**
 * 조회수 증가 Hook
 */
export function useIncrementView() {
  return useMutation<void, Error, string>({
    mutationFn: async (contentId) => {
      const { error } = await supabaseClient
        .rpc('increment_view_count', { content_id: contentId })
      
      if (error) throw error
    }
  })
}

/**
 * 좋아요 토글 Hook
 */
export function useToggleLike() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<boolean, Error, string>({
    mutationFn: async (contentId) => {
      // 기존 좋아요 확인
      const { data: existing } = await supabaseClient
        .from('interactions')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', user!.id)
        .eq('type', 'like')
        .single()
      
      if (existing) {
        // 좋아요 취소
        const { error } = await supabaseClient
          .from('interactions')
          .delete()
          .eq('content_id', contentId)
          .eq('user_id', user!.id)
          .eq('type', 'like')
        
        if (error) throw error
        return false
      } else {
        // 좋아요 추가
        const { error } = await supabaseClient
          .from('interactions')
          .insert({
            content_id: contentId,
            user_id: user!.id,
            type: 'like' as const
          })
        
        if (error) throw error
        return true
      }
    },
    onSettled: (data, error, contentId) => {
      // 콘텐츠 정보 리페치
      queryClient.invalidateQueries({ 
        queryKey: ['content', contentId] 
      })
      // 좋아요 상태도 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['likes', user?.id, contentId] 
      })
    }
  })
}

/**
 * 최근 콘텐츠 조회 Hook
 */
export function useRecentContent(limit = 10) {
  return useQuery<ContentWithAuthor[], Error>({
    queryKey: ['content', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('content_with_author')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    },
    staleTime: 5 * 60 * 1000 // 5분
  })
}

/**
 * 인기 콘텐츠 조회 Hook
 */
export function usePopularContent(contentType?: string, limit = 10) {
  return useQuery<ContentWithAuthor[], Error>({
    queryKey: ['content', 'popular', contentType, limit],
    queryFn: async () => {
      let query = supabaseClient
        .from('content_with_author')
        .select('*')
        .order('view_count', { ascending: false })
        .limit(limit)
      
      if (contentType) {
        query = query.eq('type', contentType as 'post' | 'case' | 'announcement' | 'resource' | 'activity')
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000 // 10분
  })
}

/**
 * 콘텐츠 좋아요 여부 확인 Hook
 */
export function useIsLiked(contentId: string) {
  const { user } = useAuth()
  
  return useQuery<boolean, Error>({
    queryKey: ['likes', user?.id, contentId],
    queryFn: async () => {
      if (!user?.id) return false
      
      const { data, error } = await supabaseClient
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .eq('type', 'like')
        .single()
      
      // 에러가 있으면 좋아요하지 않은 것으로 처리
      if (error) return false
      return !!data
    },
    enabled: !!user?.id && !!contentId,
    staleTime: 5 * 60 * 1000 // 5분
  })
}