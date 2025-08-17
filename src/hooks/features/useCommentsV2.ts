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
    // V2 RPC 함수 사용하여 계층형 댓글 트리 가져오기
    const { data: commentTree, error } = await supabaseClient()
        .rpc('get_comment_tree_v2', {
        p_content_id: contentId,
        p_max_depth: maxDepth
      })

    if (error) throw error
    if (!commentTree) return []

    // RPC 함수가 반환한 데이터를 CommentWithAuthorV2 형식으로 변환
    // get_comment_tree_v2는 평면 배열로 반환하므로 트리 구조로 재구성 필요
    const buildCommentTree = (flatComments: any[]): CommentWithAuthorV2[] => {
      const commentMap = new Map<string, CommentWithAuthorV2>()
      const rootComments: CommentWithAuthorV2[] = []
      
      // 먼저 모든 댓글을 CommentWithAuthorV2 형식으로 변환하고 맵에 저장
      flatComments.forEach(comment => {
        const transformed: CommentWithAuthorV2 = {
          // CommentV2 필드들 (RPC가 content_id를 반환하지 않으므로 contentId 사용)
          id: comment.id,
          content_id: contentId,
          author_id: comment.author_id,
          comment_text: comment.comment_text,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          deleted_at: null, // RPC는 삭제된 댓글을 반환하지 않음
          parent_id: comment.parent_id || null,
          path: comment.path,
          depth: comment.depth,
          like_count: comment.like_count || 0, // CommentV2에 필수 필드
          // 추가 필드들
          author: {
            id: comment.author_id,
            name: comment.author_name || 'Unknown',
            avatar_url: comment.author_avatar || null,
            role: comment.author_role || 'member' // RPC에서 반환하는 실제 role 사용
          },
          interaction_counts: {
            likes: comment.like_count || 0
          },
          user_interactions: {
            is_liked: false // 나중에 업데이트
          },
          children: []
        }
        commentMap.set(comment.id, transformed)
      })
      
      // 부모-자식 관계 설정
      flatComments.forEach(comment => {
        const currentComment = commentMap.get(comment.id)!
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          const parent = commentMap.get(comment.parent_id)!
          parent.children!.push(currentComment)
        } else if (!comment.parent_id) {
          rootComments.push(currentComment)
        }
      })
      
      return rootComments
    }

    // 트리 구조 생성
    const commentTreeStructure = buildCommentTree(commentTree || [])
    
    // 사용자의 좋아요 상태 조회 및 업데이트
    if (user && commentTree && commentTree.length > 0) {
      const commentIds = commentTree.map((c: any) => c.id)
      const { data: userLikes } = await supabaseClient()
        .from('interactions_v2')
        .select('target_id')
        .in('target_id', commentIds)
        .eq('target_type', 'comment')
        .eq('user_id', user.id)
        .eq('interaction_type', 'like')

      const likedCommentIds = new Set((userLikes || []).map(l => l.target_id))
      
      // 재귀적으로 좋아요 상태 업데이트
      const updateLikeStatus = (comments: CommentWithAuthorV2[]): void => {
        comments.forEach(comment => {
          comment.user_interactions.is_liked = likedCommentIds.has(comment.id)
          if (comment.children && comment.children.length > 0) {
            updateLikeStatus(comment.children)
          }
        })
      }
      
      updateLikeStatus(commentTreeStructure)
    }

    return commentTreeStructure
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

// buildCommentTree 함수 제거 - get_comment_tree_v2 RPC가 이미 트리 구조로 반환

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
        const { data: parent, error: parentError } = await supabaseClient()
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

      const { data, error } = await supabaseClient()
        .rpc('create_comment_v2', {
          p_content_id: contentId,
          p_content: comment,
          p_parent_id: parentId || undefined
        })

      if (error) throw error
      return data as unknown as CommentV2
    },
    onMutate: async (variables) => {
      // Optimistic Update 제거 - 중복 댓글 수 증가 방지
      // RPC 완료 후에만 업데이트하도록 변경
      console.log('🚀 댓글 생성 시작:', variables.comment.substring(0, 20) + '...')
      return null
    },
    onError: (error, variables, context: any) => {
      // Optimistic Update가 없으므로 롤백 불필요
      console.error('❌ 댓글 생성 실패:', error)
    },
    onSuccess: (data, variables) => {
      // 활동 점수는 이미 create_comment_v2 RPC 함수에서 처리됨
      // 중복 호출 제거
    },
    onSettled: async (data, error, variables) => {
      if (error) {
        console.error('❌ 댓글 생성 최종 실패:', error)
        return
      }
      
      console.log('✅ 댓글 생성 완료, 캐시 갱신 중...')
      
      // 관련 쿼리 무효화만 하고 즉시 refetch는 하지 않음 (중복 방지)
      await queryClient.invalidateQueries({ 
        queryKey: ['comments-v2', variables.contentId] 
      })
      
      // 콘텐츠의 댓글 수 업데이트를 위해 무효화만 (refetch 대신 invalidate)
      await queryClient.invalidateQueries({ 
        queryKey: ['content-v2', variables.contentId] 
      })
      
      console.log('🔄 댓글 캐시 무효화 완료')
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
      const { data, error } = await supabaseClient()
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
      // 댓글 수 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comment-count-v2', variables.contentId] 
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
      const { error } = await supabaseClient()
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
      // 댓글 수 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comment-count-v2', variables.contentId] 
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
      const { data: existing } = await supabaseClient()
        .from('interactions_v2')
        .select('id')
        .eq('target_id', commentId)
        .eq('target_type', 'comment')
        .eq('user_id', user.id)
        .eq('interaction_type', 'like')
        .single()

      if (existing) {
        // 좋아요 취소
        const { error } = await supabaseClient()
        .from('interactions_v2')
          .delete()
          .eq('id', existing.id)

        if (error) throw error
        return false
      } else {
        // 좋아요 추가
        const { error } = await supabaseClient()
        .from('interactions_v2')
          .insert({
            target_id: commentId,
            target_type: 'comment',
            user_id: user.id,
            interaction_type: 'like',
            created_at: new Date().toISOString()
          })

        if (error) throw error
        
        // 활동 점수는 필요시 서버사이드에서 처리하도록 변경
        // 클라이언트에서 중복 호출 제거
        
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
      // 댓글 수 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comment-count-v2', variables.contentId] 
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
      const { count, error } = await supabaseClient()
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
      const { data, error } = await supabaseClient()
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