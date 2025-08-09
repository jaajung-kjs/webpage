/**
 * useCommentsV2 - V2 스키마 기반 댓글 Hook
 * 
 * comments_v2 + ltree 기반 최적화된 중첩 댓글 시스템
 * - ltree path로 효율적인 중첩 구조 관리
 * - Soft delete 지원
 * - 대댓글 깊이 제한
 * - 실시간 업데이트
 * - Optimistic Updates
 */

'use client'

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRealtimeQueryV2 } from '@/hooks/core/useRealtimeQueryV2'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuth } from '@/providers'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

// V2 댓글 타입
type CommentV2 = Tables<'comments_v2'>
type CommentV2Insert = TablesInsert<'comments_v2'>
type CommentV2Update = TablesUpdate<'comments_v2'>

// 확장된 댓글 타입 (작성자 정보 + 상호작용 정보 포함)
interface CommentWithAuthorV2 extends CommentV2 {
  author: Pick<Tables<'users_v2'>, 'id' | 'name' | 'avatar_url' | 'role'>
  interaction_counts: {
    likes: number
  }
  user_interactions: {
    is_liked: boolean
  }
  children?: CommentWithAuthorV2[] // 중첩 댓글
  has_more_children?: boolean // 더 많은 자식 댓글 존재 여부
}

// 댓글 정렬 옵션
type CommentSortOption = 'created_at' | 'like_count' | 'path'

/**
 * 댓글 목록 조회 Hook (ltree 기반 중첩 구조)
 */
export function useCommentsV2(
  contentId: string,
  options?: {
    sortBy?: CommentSortOption
    sortOrder?: 'asc' | 'desc'
    maxDepth?: number
    includeDeleted?: boolean
    realtime?: boolean
  }
) {
  const { user } = useAuth()
  const {
    sortBy = 'path',
    sortOrder = 'asc',
    maxDepth = 5,
    includeDeleted = false,
    realtime = true
  } = options || {}

  const queryFn = async (): Promise<CommentWithAuthorV2[]> => {
    let query = supabaseClient
      .from('comments_v2')
      .select(`
        *,
        author:users_v2!comments_v2_author_id_fkey (
          id,
          name,
          avatar_url,
          role
        )
      `)
      .eq('content_id', contentId)

    // Soft delete 처리
    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    // 깊이 제한
    if (maxDepth > 0) {
      query = query.lte('depth', maxDepth)
    }

    // 정렬 (ltree path 기본)
    if (sortBy === 'path') {
      query = query.order('path', { ascending: true })
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    }

    const { data: comments, error } = await query

    if (error) throw error

    // 각 댓글의 상호작용 정보 가져오기 (배치 처리로 최적화)
    const commentIds = comments?.map(c => c.id) || []
    
    // 모든 댓글의 좋아요 정보를 한 번에 가져오기
    const [allInteractions, userInteractions] = await Promise.all([
      supabaseClient
        .from('interactions_v2')
        .select('target_id, interaction_type')
        .in('target_id', commentIds)
        .eq('target_type', 'comment'),
      
      user ? supabaseClient
        .from('interactions_v2')
        .select('target_id, interaction_type')
        .in('target_id', commentIds)
        .eq('target_type', 'comment')
        .eq('user_id', user.id)
      : Promise.resolve({ data: [] })
    ])

    // 상호작용 정보를 댓글별로 그룹화
    const interactionsByComment = (allInteractions.data || []).reduce((acc, interaction) => {
      if (!acc[interaction.target_id]) {
        acc[interaction.target_id] = { likes: 0 }
      }
      if (interaction.interaction_type === 'like') {
        acc[interaction.target_id].likes++
      }
      return acc
    }, {} as Record<string, { likes: number }>)

    const userInteractionsByComment = (userInteractions.data || []).reduce((acc, interaction) => {
      if (!acc[interaction.target_id]) {
        acc[interaction.target_id] = { is_liked: false }
      }
      if (interaction.interaction_type === 'like') {
        acc[interaction.target_id].is_liked = true
      }
      return acc
    }, {} as Record<string, { is_liked: boolean }>)

    // 댓글 데이터 병합
    const enhancedComments: CommentWithAuthorV2[] = (comments || []).map(comment => ({
      ...comment,
      interaction_counts: interactionsByComment[comment.id] || { likes: 0 },
      user_interactions: userInteractionsByComment[comment.id] || { is_liked: false }
    }))

    // ltree path를 활용한 중첩 구조 생성
    return buildCommentTree(enhancedComments)
  }

  // 실시간 업데이트가 필요한 경우
  if (realtime) {
    return useRealtimeQueryV2<CommentWithAuthorV2[]>({
      queryKey: ['comments-v2', contentId, sortBy, sortOrder, maxDepth, user?.id],
      queryFn,
      enabled: !!contentId,
      staleTime: 2 * 60 * 1000, // 2분
      realtime: {
        enabled: true,
        table: 'comments_v2',
        filter: `content_id=eq.${contentId}`,
        updateStrategy: 'invalidate'
      }
    })
  }

  // 일반 쿼리
  return useQuery<CommentWithAuthorV2[], Error>({
    queryKey: ['comments-v2', contentId, sortBy, sortOrder, maxDepth, user?.id],
    queryFn,
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false
  })
}

/**
 * ltree path를 활용한 중첩 댓글 트리 구성
 */
function buildCommentTree(comments: CommentWithAuthorV2[]): CommentWithAuthorV2[] {
  const commentMap = new Map<string, CommentWithAuthorV2>()
  const rootComments: CommentWithAuthorV2[] = []

  // 모든 댓글을 맵에 저장
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, children: [] })
  })

  // ltree path를 기반으로 부모-자식 관계 설정
  comments.forEach(comment => {
    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      const parent = commentMap.get(comment.parent_id)!
      const child = commentMap.get(comment.id)!
      parent.children!.push(child)
    } else if (!comment.parent_id) {
      // 루트 레벨 댓글
      rootComments.push(commentMap.get(comment.id)!)
    }
  })

  return rootComments
}

/**
 * 댓글 생성 Hook
 */
export function useCreateCommentV2() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<CommentV2, Error, {
    contentId: string
    comment: string
    parentId?: string
  }>({
    mutationFn: async ({ contentId, comment, parentId }) => {
      if (!user) throw new Error('User not authenticated')

      // 부모 댓글의 path 정보 가져오기 (중첩 레벨 계산용)
      let parentPath = ''
      let depth = 0

      if (parentId) {
        const { data: parent, error: parentError } = await supabaseClient
          .from('comments_v2')
          .select('path, depth')
          .eq('id', parentId)
          .single()

        if (parentError) throw parentError

        parentPath = parent.path as string
        depth = parent.depth + 1

        // 최대 깊이 체크
        if (depth > 5) {
          throw new Error('Maximum comment depth exceeded')
        }
      }

      const { data, error } = await supabaseClient
        .rpc('create_comment_v2', {
          p_content_id: contentId,
          p_author_id: user.id,
          p_comment_text: comment,
          p_parent_id: parentId || undefined
        })

      if (error) throw error
      return data as CommentV2
    },
    onMutate: async (variables) => {
      // Optimistic Update
      await queryClient.cancelQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })

      const previousComments = queryClient.getQueryData<CommentWithAuthorV2[]>([
        'comments-v2', 
        variables.contentId
      ])

      // 임시 댓글 생성
      const tempComment: CommentWithAuthorV2 = {
        id: `temp-${Date.now()}`,
        content_id: variables.contentId,
        author_id: user!.id,
        comment_text: variables.comment,
        parent_id: variables.parentId || null,
        path: null, // ltree는 서버에서 생성
        depth: variables.parentId ? 1 : 0, // 임시값
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        author: {
          id: user!.id,
          name: user!.email?.split('@')[0] || '익명',
          avatar_url: null,
          role: 'member'
        },
        interaction_counts: { likes: 0 },
        user_interactions: { is_liked: false },
        children: []
      }

      // 부모 댓글을 찾아 자식으로 추가하거나 루트에 추가
      const addCommentToTree = (comments: CommentWithAuthorV2[]): CommentWithAuthorV2[] => {
        if (!variables.parentId) {
          return [tempComment, ...comments]
        }

        return comments.map(comment => {
          if (comment.id === variables.parentId) {
            return {
              ...comment,
              children: [...(comment.children || []), tempComment]
            }
          } else if (comment.children) {
            return {
              ...comment,
              children: addCommentToTree(comment.children)
            }
          }
          return comment
        })
      }

      const newComments = addCommentToTree(previousComments || [])
      queryClient.setQueryData(['comments-v2', variables.contentId], newComments)

      return { previousComments }
    },
    onError: (error, variables, context: any) => {
      // 롤백
      if (context?.previousComments) {
        queryClient.setQueryData(
          ['comments-v2', variables.contentId], 
          context.previousComments
        )
      }
    },
    onSuccess: (data, variables) => {
      // 댓글 생성 성공 시 활동 점수 업데이트
      supabaseClient.rpc('increment_activity_score_v2', {
        p_user_id: user!.id,
        p_points: 5 // 댓글 작성 시 5점
      })
    },
    onSettled: (data, error, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })
      // 콘텐츠의 댓글 수 업데이트
      queryClient.invalidateQueries({ 
        queryKey: ['content-v2', variables.contentId] 
      })
    }
  })
}

/**
 * 댓글 수정 Hook
 */
export function useUpdateCommentV2() {
  const queryClient = useQueryClient()

  return useMutation<CommentV2, Error, {
    commentId: string
    contentId: string
    comment: string
  }>({
    mutationFn: async ({ commentId, comment }) => {
      const { data, error } = await supabaseClient
        .from('comments_v2')
        .update({
          comment_text: comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .is('deleted_at', null)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (variables) => {
      // Optimistic Update
      await queryClient.cancelQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })

      const previousComments = queryClient.getQueryData<CommentWithAuthorV2[]>([
        'comments-v2',
        variables.contentId
      ])

      // 댓글 트리에서 해당 댓글 찾아 업데이트
      const updateCommentInTree = (comments: CommentWithAuthorV2[]): CommentWithAuthorV2[] => {
        return comments.map(comment => {
          if (comment.id === variables.commentId) {
            return {
              ...comment,
              comment_text: variables.comment,
              updated_at: new Date().toISOString()
            }
          } else if (comment.children) {
            return {
              ...comment,
              children: updateCommentInTree(comment.children)
            }
          }
          return comment
        })
      }

      const newComments = updateCommentInTree(previousComments || [])
      queryClient.setQueryData(['comments-v2', variables.contentId], newComments)

      return { previousComments }
    },
    onError: (error, variables, context: any) => {
      // 롤백
      if (context?.previousComments) {
        queryClient.setQueryData(
          ['comments-v2', variables.contentId],
          context.previousComments
        )
      }
    },
    onSettled: (data, error, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })
    }
  })
}

/**
 * 댓글 삭제 Hook (Soft Delete)
 */
export function useDeleteCommentV2() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, {
    commentId: string
    contentId: string
  }>({
    mutationFn: async ({ commentId }) => {
      const { error } = await supabaseClient
        .from('comments_v2')
        .update({ 
          deleted_at: new Date().toISOString(),
          comment_text: '[삭제된 댓글입니다]'
        })
        .eq('id', commentId)

      if (error) throw error
    },
    onMutate: async (variables) => {
      // Optimistic Update
      await queryClient.cancelQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })

      const previousComments = queryClient.getQueryData<CommentWithAuthorV2[]>([
        'comments-v2',
        variables.contentId
      ])

      // 댓글 트리에서 해당 댓글 찾아 삭제 마크
      const deleteCommentInTree = (comments: CommentWithAuthorV2[]): CommentWithAuthorV2[] => {
        return comments.map(comment => {
          if (comment.id === variables.commentId) {
            return {
              ...comment,
              comment_text: '[삭제된 댓글입니다]',
              deleted_at: new Date().toISOString()
            }
          } else if (comment.children) {
            return {
              ...comment,
              children: deleteCommentInTree(comment.children)
            }
          }
          return comment
        })
      }

      const newComments = deleteCommentInTree(previousComments || [])
      queryClient.setQueryData(['comments-v2', variables.contentId], newComments)

      return { previousComments }
    },
    onError: (error, variables, context: any) => {
      // 롤백
      if (context?.previousComments) {
        queryClient.setQueryData(
          ['comments-v2', variables.contentId],
          context.previousComments
        )
      }
    },
    onSettled: (data, error, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })
    }
  })
}

/**
 * 댓글 좋아요 토글 Hook
 */
export function useToggleCommentLikeV2() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<boolean, Error, {
    commentId: string
    contentId: string
  }>({
    mutationFn: async ({ commentId }) => {
      if (!user) throw new Error('User not authenticated')

      // 기존 좋아요 확인
      const { data: existing } = await supabaseClient
        .from('interactions_v2')
        .select('id')
        .eq('target_id', commentId)
        .eq('target_type', 'comment')
        .eq('user_id', user.id)
        .eq('interaction_type', 'like')
        .single()

      if (existing) {
        // 좋아요 취소
        const { error } = await supabaseClient
          .from('interactions_v2')
          .delete()
          .eq('id', existing.id)

        if (error) throw error
        return false
      } else {
        // 좋아요 추가
        const { error } = await supabaseClient
          .from('interactions_v2')
          .insert({
            target_id: commentId,
            target_type: 'comment',
            user_id: user.id,
            interaction_type: 'like',
            created_at: new Date().toISOString()
          })

        if (error) throw error

        // 활동 점수 업데이트
        supabaseClient.rpc('increment_activity_score_v2', {
          p_user_id: user.id,
          p_points: 1
        })

        return true
      }
    },
    onMutate: async (variables) => {
      // Optimistic Update
      await queryClient.cancelQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })

      const previousComments = queryClient.getQueryData<CommentWithAuthorV2[]>([
        'comments-v2',
        variables.contentId
      ])

      // 댓글 트리에서 해당 댓글 찾아 좋아요 상태 업데이트
      const updateLikeInTree = (comments: CommentWithAuthorV2[]): CommentWithAuthorV2[] => {
        return comments.map(comment => {
          if (comment.id === variables.commentId) {
            const isCurrentlyLiked = comment.user_interactions.is_liked
            return {
              ...comment,
              user_interactions: {
                ...comment.user_interactions,
                is_liked: !isCurrentlyLiked
              },
              interaction_counts: {
                ...comment.interaction_counts,
                likes: isCurrentlyLiked 
                  ? Math.max(0, comment.interaction_counts.likes - 1)
                  : comment.interaction_counts.likes + 1
              }
            }
          } else if (comment.children) {
            return {
              ...comment,
              children: updateLikeInTree(comment.children)
            }
          }
          return comment
        })
      }

      const newComments = updateLikeInTree(previousComments || [])
      queryClient.setQueryData(['comments-v2', variables.contentId], newComments)

      return { previousComments }
    },
    onError: (error, variables, context: any) => {
      // 롤백
      if (context?.previousComments) {
        queryClient.setQueryData(
          ['comments-v2', variables.contentId],
          context.previousComments
        )
      }
    },
    onSettled: (data, error, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })
    }
  })
}

/**
 * 댓글 수 조회 Hook
 */
export function useCommentCountV2(contentId: string) {
  return useQuery<number, Error>({
    queryKey: ['comment-count-v2', contentId],
    queryFn: async () => {
      const { count, error } = await supabaseClient
        .from('comments_v2')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', contentId)
        .is('deleted_at', null)

      if (error) throw error
      return count || 0
    },
    enabled: !!contentId,
    staleTime: 2 * 60 * 1000, // 2분
    refetchOnWindowFocus: false
  })
}

/**
 * 특정 댓글의 자식 댓글들을 추가로 로드하는 Hook
 */
export function useLoadMoreChildCommentsV2() {
  const queryClient = useQueryClient()

  return useMutation<CommentWithAuthorV2[], Error, {
    contentId: string
    parentPath: string
    currentChildCount: number
    limit?: number
  }>({
    mutationFn: async ({ contentId, parentPath, currentChildCount, limit = 10 }) => {
      const { data, error } = await supabaseClient
        .from('comments_v2')
        .select(`
          *,
          author:users_v2!comments_v2_author_id_fkey (
            id,
            name,
            avatar_url,
            role
          )
        `)
        .eq('content_id', contentId)
        .like('path', `${parentPath}.%`)
        .is('deleted_at', null)
        .order('path', { ascending: true })
        .range(currentChildCount, currentChildCount + limit - 1)

      if (error) throw error
      return data as CommentWithAuthorV2[] || []
    },
    onSuccess: (newComments, variables) => {
      // 기존 댓글 트리에 새로운 댓글들을 추가
      // 구현 복잡성으로 인해 전체 댓글 목록 무효화로 대체
      queryClient.invalidateQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })
    }
  })
}