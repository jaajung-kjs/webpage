/**
 * useContentV2 - V2 스키마 기반 통합 콘텐츠 관리 Hook
 * 
 * 주요 개선사항:
 * - content_v2 통합 테이블 사용 (다형성 패턴)
 * - interactions_v2로 좋아요/북마크 통합 관리
 * - JSONB metadata 활용
 * - 무한 스크롤 최적화
 * - Optimistic Updates
 * - 지능적 캐시 무효화
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers'
import { supabaseClient } from '@/lib/core/connection-core'
import { useCallback, useMemo } from 'react'
import { 
  ContentV2, 
  ContentV2Insert, 
  ContentV2Update, 
  InteractionV2,
  CategoryV2, 
  TagV2, 
  ContentType, 
  InteractionType,
  UserV2 
} from '@/hooks/types/v2-types'

// 콘텐츠 상태 타입 (from database enum)
export type ContentStatus = 'draft' | 'published' | 'archived'

// 확장된 콘텐츠 타입 (관계 포함)
export interface ContentWithRelations extends ContentV2 {
  author: UserV2
  categories?: CategoryV2[]
  tags?: TagV2[]
  interaction_counts?: {
    likes: number
    bookmarks: number
    views: number
    reports: number
  }
  user_interactions?: {
    liked: boolean
    bookmarked: boolean
    reported: boolean
  }
}

// 콘텐츠 목록 필터
export interface ContentFilter {
  type?: ContentType
  status?: ContentStatus
  authorId?: string
  categoryId?: string
  tagIds?: string[]
  searchQuery?: string
  isPinned?: boolean
}

// 정렬 옵션
export type ContentSortBy = 'created_at' | 'updated_at' | 'view_count' | 'like_count' | 'comment_count'
export type SortOrder = 'asc' | 'desc'

export function useContentV2() {
  const supabase = supabaseClient
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 단일 콘텐츠 조회 (관계 포함)
  const useContent = (contentId: string) => {
    return useQuery({
      queryKey: ['content-v2', contentId],
      queryFn: async () => {
        // 메인 콘텐츠 조회
        const { data: content, error: contentError } = await supabase
          .from('content_v2')
          .select(`
            *,
            author:users_v2!author_id(*)
          `)
          .eq('id', contentId)
          .is('deleted_at', null)
          .single()
        
        if (contentError) throw contentError
        
        // 카테고리 조회
        const { data: categories } = await supabase
          .from('content_categories_v2')
          .select('category:categories_v2(*)')
          .eq('content_id', contentId)
        
        // 태그 조회
        const { data: tags } = await supabase
          .from('content_tags_v2')
          .select('tag:tags_v2(*)')
          .eq('content_id', contentId)
        
        // 상호작용 카운트 조회
        const { data: interactions, error: interactionError } = await supabase
          .from('interactions_v2')
          .select('interaction_type')
          .eq('target_id', contentId)
          .eq('target_type', 'content')
        
        if (interactionError) throw interactionError
        
        const interactionCounts = {
          likes: interactions?.filter(i => i.interaction_type === 'like').length || 0,
          bookmarks: interactions?.filter(i => i.interaction_type === 'bookmark').length || 0,
          views: interactions?.filter(i => i.interaction_type === 'view').length || 0,
          reports: interactions?.filter(i => i.interaction_type === 'report').length || 0,
        }
        
        // 현재 사용자의 상호작용 확인
        let userInteractions = {
          liked: false,
          bookmarked: false,
          reported: false,
        }
        
        if (user) {
          const { data: userInts } = await supabase
            .from('interactions_v2')
            .select('interaction_type')
            .eq('user_id', user.id)
            .eq('target_id', contentId)
            .eq('target_type', 'content')
          
          userInteractions = {
            liked: userInts?.some(i => i.interaction_type === 'like') || false,
            bookmarked: userInts?.some(i => i.interaction_type === 'bookmark') || false,
            reported: userInts?.some(i => i.interaction_type === 'report') || false,
          }
        }
        
        // 조회수 증가 (비동기 - RPC 함수 사용)
        if (user) {
          // 조회수 증가 (백그라운드에서 처리)
          supabase.rpc('toggle_interaction_v2', {
            p_user_id: user.id,
            p_target_type: 'content',
            p_target_id: contentId,
            p_interaction_type: 'view'
          }) // 에러가 나도 메인 쿼리에 영향 없음
        }
        
        return {
          ...content,
          categories: categories?.map(c => c.category).filter(Boolean) || [],
          tags: tags?.map(t => t.tag).filter(Boolean) || [],
          interaction_counts: interactionCounts,
          user_interactions: userInteractions,
        } as ContentWithRelations
      },
      staleTime: 2 * 60 * 1000, // 2분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 콘텐츠 목록 조회 (무한 스크롤)
  const useInfiniteContents = (
    filter: ContentFilter = {},
    sortBy: ContentSortBy = 'created_at',
    sortOrder: SortOrder = 'desc',
    pageSize = 20
  ) => {
    return useInfiniteQuery({
      queryKey: ['contents-v2', filter, sortBy, sortOrder],
      queryFn: async ({ pageParam = 0 }) => {
        let query = supabase
          .from('content_v2')
          .select(`
            *,
            author:users_v2!author_id(id, name, avatar_url)
          `, { count: 'exact' })
          .is('deleted_at', null)
          .eq('status', 'published')
          .range(pageParam, pageParam + pageSize - 1)
          .order(sortBy, { ascending: sortOrder === 'asc' })
        
        // 필터 적용
        if (filter.type) query = query.eq('content_type', filter.type)
        if (filter.authorId) query = query.eq('author_id', filter.authorId)
        if (filter.isPinned !== undefined) query = query.eq('is_pinned', filter.isPinned)
        if (filter.searchQuery) {
          query = query.or(`title.ilike.%${filter.searchQuery}%,content.ilike.%${filter.searchQuery}%`)
        }
        
        // 카테고리 필터
        if (filter.categoryId) {
          const { data: categoryContents } = await supabase
            .from('content_categories_v2')
            .select('content_id')
            .eq('category_id', filter.categoryId)
          
          const contentIds = categoryContents?.map(cc => cc.content_id) || []
          if (contentIds.length > 0) {
            query = query.in('id', contentIds)
          } else {
            // 카테고리에 속한 콘텐츠가 없으면 빈 결과
            return {
              contents: [],
              nextCursor: pageParam + pageSize,
              hasMore: false,
              totalCount: 0,
            }
          }
        }
        
        // 태그 필터 (복수 태그 AND 조건)
        if (filter.tagIds && filter.tagIds.length > 0) {
          for (const tagId of filter.tagIds) {
            const { data: tagContents } = await supabase
              .from('content_tags_v2')
              .select('content_id')
              .eq('tag_id', tagId)
            
            const contentIds = tagContents?.map(ct => ct.content_id) || []
            if (contentIds.length > 0) {
              query = query.in('id', contentIds)
            } else {
              return {
                contents: [],
                nextCursor: pageParam + pageSize,
                hasMore: false,
                totalCount: 0,
              }
            }
          }
        }
        
        const { data, error, count } = await query
        
        if (error) throw error
        
        // 각 콘텐츠의 상호작용 카운트 조회
        const contents = await Promise.all((data || []).map(async (content) => {
          const { data: interactions } = await supabase
            .from('interactions_v2')
            .select('interaction_type')
            .eq('target_id', content.id)
            .eq('target_type', 'content')
          
          const interactionCounts = {
            likes: interactions?.filter(i => i.interaction_type === 'like').length || 0,
            bookmarks: interactions?.filter(i => i.interaction_type === 'bookmark').length || 0,
            views: interactions?.filter(i => i.interaction_type === 'view').length || 0,
            reports: interactions?.filter(i => i.interaction_type === 'report').length || 0,
          }
          
          // 사용자의 상호작용 상태 확인
          let userInteractions = {
            liked: false,
            bookmarked: false,
            reported: false,
          }
          
          if (user) {
            const { data: userInts } = await supabase
              .from('interactions_v2')
              .select('interaction_type')
              .eq('user_id', user.id)
              .eq('target_id', content.id)
              .eq('target_type', 'content')
            
            userInteractions = {
              liked: userInts?.some(i => i.interaction_type === 'like') || false,
              bookmarked: userInts?.some(i => i.interaction_type === 'bookmark') || false,
              reported: userInts?.some(i => i.interaction_type === 'report') || false,
            }
          }
          
          return {
            ...content,
            interaction_counts: interactionCounts,
            user_interactions: userInteractions,
          }
        }))
        
        return {
          contents: contents as ContentWithRelations[],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      initialPageParam: 0,
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분 (대신 cacheTime)
    })
  }

  // 콘텐츠 생성
  const createContent = useMutation({
    mutationFn: async (input: ContentV2Insert & { categories?: string[], tags?: string[] }) => {
      const { categories, tags, ...contentData } = input
      
      // 콘텐츠 생성
      const { data: content, error } = await supabase
        .from('content_v2')
        .insert({
          ...contentData,
          author_id: user?.id!,
          status: contentData.status || 'draft',
        })
        .select()
        .single()
      
      if (error) throw error
      
      // 카테고리 연결
      if (categories && categories.length > 0) {
        await supabase.from('content_categories_v2').insert(
          categories.map(catId => ({
            content_id: content.id,
            category_id: catId,
          }))
        )
      }
      
      // 태그 연결
      if (tags && tags.length > 0) {
        await supabase.from('content_tags_v2').insert(
          tags.map(tagId => ({
            content_id: content.id,
            tag_id: tagId,
          }))
        )
      }
      
      return content
    },
    onSuccess: (data) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
      queryClient.invalidateQueries({ queryKey: ['user-contents-v2', user?.id] })
    }
  })

  // 콘텐츠 수정
  const updateContent = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: ContentV2Update }) => {
      const { data, error } = await supabase
        .from('content_v2')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async ({ id, updates }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['content-v2', id] })
      const previousContent = queryClient.getQueryData<ContentWithRelations>(['content-v2', id])
      
      if (previousContent) {
        queryClient.setQueryData<ContentWithRelations>(['content-v2', id], {
          ...previousContent,
          ...updates,
          updated_at: new Date().toISOString(),
        })
      }
      
      return { previousContent }
    },
    onError: (err, variables, context) => {
      // 롤백
      if (context?.previousContent) {
        queryClient.setQueryData(['content-v2', variables.id], context.previousContent)
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
    }
  })

  // 콘텐츠 삭제 (Soft Delete)
  const deleteContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('content_v2')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['content-v2', id] })
      queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
    }
  })

  // 상호작용 토글 (좋아요, 북마크 등)
  const toggleInteraction = useMutation({
    mutationFn: async ({ 
      targetId, 
      targetType = 'content', 
      interactionType 
    }: { 
      targetId: string
      targetType?: string
      interactionType: InteractionType 
    }) => {
      if (!user) throw new Error('User not authenticated')
      
      // RPC 함수 사용 (토글 기능 포함)
      const { data, error } = await supabase.rpc('toggle_interaction_v2', {
        p_user_id: user.id,
        p_target_type: targetType,
        p_target_id: targetId,
        p_interaction_type: interactionType
      })
      
      if (error) throw error
      return data
    },
    onMutate: async ({ targetId, interactionType }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['content-v2', targetId] })
      const previousContent = queryClient.getQueryData<ContentWithRelations>(['content-v2', targetId])
      
      if (previousContent && previousContent.user_interactions) {
        const updated = { ...previousContent }
        
        // 상호작용 키 매핑
        let interactionKey: string
        let countKey: string
        
        switch (interactionType) {
          case 'like':
            interactionKey = 'liked'
            countKey = 'likes'
            break
          case 'bookmark':
            interactionKey = 'bookmarked'
            countKey = 'bookmarks'
            break
          case 'report':
            interactionKey = 'reported'
            countKey = 'reports'
            break
          default:
            return { previousContent }
        }
        
        const wasInteracted = (updated.user_interactions as any)[interactionKey]
        ;(updated.user_interactions as any)[interactionKey] = !wasInteracted
        
        if (updated.interaction_counts && countKey !== 'reports') {
          ;(updated.interaction_counts as any)[countKey] += !wasInteracted ? 1 : -1
          ;(updated.interaction_counts as any)[countKey] = Math.max(0, (updated.interaction_counts as any)[countKey])
        }
        
        queryClient.setQueryData(['content-v2', targetId], updated)
      }
      
      return { previousContent }
    },
    onError: (err, variables, context) => {
      // 롤백
      if (context?.previousContent) {
        queryClient.setQueryData(['content-v2', variables.targetId], context.previousContent)
      }
    },
    onSuccess: (data, variables) => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['content-v2', variables.targetId] })
      queryClient.invalidateQueries({ queryKey: ['contents-v2'] })
      queryClient.invalidateQueries({ queryKey: ['user-interactions-v2', user?.id] })
    }
  })

  return {
    // Hooks
    useContent,
    useInfiniteContents,
    
    // Mutations
    createContent: createContent.mutate,
    createContentAsync: createContent.mutateAsync,
    updateContent: updateContent.mutate,
    updateContentAsync: updateContent.mutateAsync,
    deleteContent: deleteContent.mutate,
    deleteContentAsync: deleteContent.mutateAsync,
    toggleInteraction: toggleInteraction.mutate,
    toggleInteractionAsync: toggleInteraction.mutateAsync,
    
    // 상태
    isCreating: createContent.isPending,
    isUpdating: updateContent.isPending,
    isDeleting: deleteContent.isPending,
    isToggling: toggleInteraction.isPending,
    
    // 트렌딩 콘텐츠 조회 (RPC 함수 사용)
    useTrendingContents: (options: { limit?: number, days?: number } = {}) => {
      const { limit = 10, days = 7 } = options
      return useQuery({
        queryKey: ['trending-contents-v2', limit, days],
        queryFn: async () => {
          const { data, error } = await supabase.rpc('get_trending_content_v2', {
            p_limit: limit,
            p_days: days
          })
          if (error) throw error
          return data
        },
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
      })
    },
    
    // 콘텐츠 통계 조회
    useContentStats: (contentId: string) => {
      return useQuery({
        queryKey: ['content-stats-v2', contentId],
        queryFn: async () => {
          // 상호작용 통계
          const { data: interactions } = await supabase
            .from('interactions_v2')
            .select('interaction_type, created_at')
            .eq('target_id', contentId)
            .eq('target_type', 'content')
            .order('created_at', { ascending: true })
          
          // 댓글 수
          const { count: commentCount } = await supabase
            .from('comments_v2')
            .select('*', { count: 'exact', head: true })
            .eq('content_id', contentId)
            .is('deleted_at', null)
          
          return {
            interactions: interactions || [],
            commentCount: commentCount || 0,
            interactionCounts: {
              likes: interactions?.filter(i => i.interaction_type === 'like').length || 0,
              bookmarks: interactions?.filter(i => i.interaction_type === 'bookmark').length || 0,
              views: interactions?.filter(i => i.interaction_type === 'view').length || 0,
              reports: interactions?.filter(i => i.interaction_type === 'report').length || 0,
            }
          }
        },
        staleTime: 1 * 60 * 1000, // 1분
        gcTime: 5 * 60 * 1000, // 5분
      })
    },
  }
}