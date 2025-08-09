/**
 * useComments - 댓글 관련 Hook들
 * 
 * 새로운 아키텍처를 활용한 댓글 기능 구현
 */

'use client'

import { useCallback } from 'react'
import { useAuth } from '@/providers'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealtimeQuery } from '@/hooks/core/useRealtimeQuery'
import { supabaseClient } from '@/lib/core/connection-core'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import type { CommentMutationContext } from '@/lib/types'

// 댓글 타입 (author 정보 포함)
interface CommentWithAuthor extends Tables<'comments'> {
  author: Pick<Tables<'users'>, 'id' | 'name' | 'avatar_url' | 'role'>
  author_name: string
  author_avatar_url?: string | null
  author_role?: string | null
  likes_count?: number
  is_liked?: boolean
}

/**
 * 댓글 목록 조회 Hook (실시간 업데이트)
 */
export function useComments(contentId: string) {
  const { user } = useAuth()
  
  return useRealtimeQuery<CommentWithAuthor[]>({
    queryKey: ['comments', contentId],
    queryFn: async () => {
      // 댓글 기본 데이터 조회
      const { data: comments, error } = await supabaseClient
        .from('comments')
        .select(`
          *,
          author:users!comments_author_id_fkey (
            id,
            name,
            avatar_url,
            role
          )
        `)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // 각 댓글의 좋아요 수와 사용자의 좋아요 여부 조회
      const commentsWithLikes = await Promise.all(
        (comments || []).map(async (comment) => {
          // 좋아요 수 조회
          const { count: likesCount } = await supabaseClient
            .from('interactions')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id)
            .eq('type', 'comment_like')
          
          // 현재 사용자가 좋아요 했는지 확인
          let isLiked = false
          if (user) {
            const { data: userLike } = await supabaseClient
              .from('interactions')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .eq('type', 'comment_like')
              .single()
            
            isLiked = !!userLike
          }
          
          return {
            ...comment,
            author_name: comment.author?.name || '익명',
            author_avatar_url: comment.author?.avatar_url,
            author_role: comment.author?.role,
            likes_count: likesCount || 0,
            is_liked: isLiked
          }
        })
      )
      
      return commentsWithLikes as CommentWithAuthor[]
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // 5분
    realtime: {
      enabled: true,
      table: 'comments',
      filter: `content_id=eq.${contentId}`,
      updateStrategy: 'invalidate' // 새 댓글 추가 시 전체 리페치
    }
  })
}

/**
 * 댓글 생성 Hook
 */
export function useCreateComment() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'comments'>, Error, { contentId: string; content: string; parentId?: string }>({
    mutationFn: async ({ contentId, content, parentId }) => {
      if (!user) throw new Error('User not authenticated')
      
      const { data, error } = await supabaseClient
        .from('comments')
        .insert({
          content_id: contentId,
          author_id: user.id,
          comment: content,
          parent_id: parentId || null
        })
        .select()
        .single()
      
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(error.message || 'Failed to create comment')
      }
      return data
    },
    onMutate: async (variables) => {
      if (!user) return { previous: null }
      
      // Cancel queries and do optimistic update
      await queryClient.cancelQueries({ queryKey: ['comments', variables.contentId] })
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(['comments', variables.contentId])
      
      const optimisticComment: CommentWithAuthor = {
        id: `temp-${Date.now()}`,
        content_id: variables.contentId,
        author_id: user.id,
        comment: variables.content,
        parent_id: variables.parentId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        like_count: 0,
        author: {
          id: user.id,
          name: profile?.name || user.email?.split('@')[0] || '익명',
          avatar_url: profile?.avatar_url || null,
          role: profile?.role || 'member'
        },
        author_name: profile?.name || user.email?.split('@')[0] || '익명',
        author_avatar_url: profile?.avatar_url || null,
        author_role: profile?.role || 'member',
        likes_count: 0,
        is_liked: false
      }
      
      queryClient.setQueryData(
        ['comments', variables.contentId],
        (old: CommentWithAuthor[] = []) => [optimisticComment, ...old]
      )
      
      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previous' in context) {
        const typedContext = context as CommentMutationContext
        queryClient.setQueryData(['comments', variables.contentId], typedContext.previous)
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['comments', variables.contentId] })
      // 댓글 수만 업데이트하고 전체 content 재조회는 하지 않음 (조회수 버그 방지)
      // queryClient.invalidateQueries({ queryKey: ['content', variables.contentId] })
    }
  })
}

/**
 * 댓글 수정 Hook
 */
export function useUpdateComment() {
  const queryClient = useQueryClient()
  
  return useMutation<Tables<'comments'>, Error, { id: string; content: string; contentId: string }>({
    mutationFn: async ({ id, content }) => {
      const { data, error } = await supabaseClient
        .from('comments')
        .update({
          comment: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async (variables) => {
      // Cancel queries and do optimistic update
      await queryClient.cancelQueries({ queryKey: ['comments', variables.contentId] })
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(['comments', variables.contentId])
      
      queryClient.setQueryData(
        ['comments', variables.contentId],
        (old: CommentWithAuthor[] = []) => 
          old.map(comment => 
            comment.id === variables.id
              ? { ...comment, comment: variables.content, updated_at: new Date().toISOString() }
              : comment
          )
      )
      
      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previous' in context) {
        const typedContext = context as CommentMutationContext
        queryClient.setQueryData(['comments', variables.contentId], typedContext.previous)
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['comments', variables.contentId] })
    }
  })
}

/**
 * 댓글 삭제 Hook
 */
export function useDeleteComment() {
  const queryClient = useQueryClient()
  
  return useMutation<void, Error, { id: string; contentId: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabaseClient
        .from('comments')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onMutate: async (variables) => {
      // Cancel queries and do optimistic update
      await queryClient.cancelQueries({ queryKey: ['comments', variables.contentId] })
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(['comments', variables.contentId])
      
      queryClient.setQueryData(
        ['comments', variables.contentId],
        (old: CommentWithAuthor[] = []) => old.filter(comment => comment.id !== variables.id)
      )
      
      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previous' in context) {
        const typedContext = context as CommentMutationContext
        queryClient.setQueryData(['comments', variables.contentId], typedContext.previous)
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['comments', variables.contentId] })
      // 댓글 수만 업데이트하고 전체 content 재조회는 하지 않음 (조회수 버그 방지)
      // queryClient.invalidateQueries({ queryKey: ['content', variables.contentId] })
    }
  })
}

/**
 * 댓글 좋아요 토글 Hook
 */
export function useToggleCommentLike() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  return useMutation<boolean, Error, { commentId: string; contentId: string }>({
    mutationFn: async ({ commentId }) => {
      // 기존 좋아요 확인
      const { data: existing } = await supabaseClient
        .from('interactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user!.id)
        .eq('type', 'comment_like')
        .single()
      
      if (existing) {
        // 좋아요 취소
        const { error } = await supabaseClient
          .from('interactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user!.id)
          .eq('type', 'comment_like')
        
        if (error) throw error
        return false
      } else {
        // 좋아요 추가
        const { error } = await supabaseClient
          .from('interactions')
          .insert({
            comment_id: commentId,
            user_id: user!.id,
            type: 'comment_like' as const
          })
        
        if (error) throw error
        return true
      }
    },
    onMutate: async (variables) => {
      // Cancel queries and do optimistic update
      await queryClient.cancelQueries({ queryKey: ['comments', variables.contentId] })
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(['comments', variables.contentId])
      
      queryClient.setQueryData(
        ['comments', variables.contentId],
        (old: CommentWithAuthor[] = []) => 
          old.map(comment => {
            if (comment.id === variables.commentId) {
              const isCurrentlyLiked = comment.is_liked || false
              return {
                ...comment,
                is_liked: !isCurrentlyLiked,
                likes_count: isCurrentlyLiked 
                  ? (comment.likes_count || 1) - 1 
                  : (comment.likes_count || 0) + 1
              }
            }
            return comment
          })
      )
      
      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previous' in context) {
        const typedContext = context as CommentMutationContext
        queryClient.setQueryData(['comments', variables.contentId], typedContext.previous)
      }
    },
    onSettled: (data, error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['comments', variables.contentId] })
    }
  })
}

/**
 * 댓글 수 조회 Hook
 */
export function useCommentCount(contentId: string) {
  return useQuery<number>({
    queryKey: ['comment-count', contentId],
    queryFn: async () => {
      const { count, error } = await supabaseClient
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', contentId)
      
      if (error) throw error
      return count || 0
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000 // 5분
  })
}

/**
 * 내 댓글 목록 조회 Hook
 */
export function useMyComments() {
  const { user } = useAuth()
  
  return useQuery<CommentWithAuthor[]>({
    queryKey: ['comments', 'my', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabaseClient
        .from('comments')
        .select(`
          *,
          author:users!comments_author_id_fkey (
            id,
            name,
            avatar_url,
            role
          )
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // 데이터 플래튼화
      const flattenedComments = (data || []).map(comment => ({
        ...comment,
        author_name: comment.author?.name || '익명',
        author_avatar_url: comment.author?.avatar_url,
        author_role: comment.author?.role,
        likes_count: 0,
        is_liked: false
      }))
      
      return flattenedComments as CommentWithAuthor[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000 // 5분
  })
}