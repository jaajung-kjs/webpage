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
import { useCallback, useMemo, useEffect, useRef } from 'react'
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
  tag_objects?: TagV2[] // tags는 이미 string[]로 존재하므로 별도 프로퍼티 사용
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

// 프론트엔드 정렬 키를 DB 컬럼명으로 매핑하는 함수
const mapSortBy = (sortBy: string): ContentSortBy => {
  switch (sortBy) {
    case 'latest': return 'created_at'
    case 'updated': return 'updated_at'
    case 'popular': return 'like_count'
    case 'views': return 'view_count'
    case 'comments': return 'comment_count'
    default: return 'created_at'
  }
}

export function useContentV2() {
  const supabase = supabaseClient()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 단일 콘텐츠 조회 (관계 포함)
  const useContent = (contentId: string, options?: { incrementView?: boolean }) => {
    const { incrementView = true } = options || {}
    
    // 조회수 증가 처리 - useRef로 한 번만 실행 보장
    const hasIncrementedRef = useRef(false)
    
    useEffect(() => {
      // 서버 사이드에서는 실행하지 않음
      if (typeof window === 'undefined') {
        return
      }
      
      if (!incrementView || !contentId || hasIncrementedRef.current) {
        return
      }
      
      const incrementViewCount = async () => {
        try {
          // 즉시 플래그 설정하여 중복 실행 방지
          hasIncrementedRef.current = true
          
          
          const { data, error } = await supabase.rpc('increment_view_count_v2', {
            p_content_id: contentId,
            p_user_id: user?.id
          })
          
          if (error) {
            console.error('View count increment error:', error)
            hasIncrementedRef.current = false // 에러 시 재시도 가능
          } else {
            
            // 조회수 증가 후 캐시의 view_count와 interaction_counts.views 모두 업데이트
            const currentData = queryClient.getQueryData<ContentWithRelations>(['content-v2', contentId])
            if (currentData) {
              const newViewCount = (currentData.view_count || 0) + 1
              queryClient.setQueryData<ContentWithRelations>(['content-v2', contentId], {
                ...currentData,
                view_count: newViewCount,
                interaction_counts: {
                  ...currentData.interaction_counts,
                  views: newViewCount,
                  likes: currentData.interaction_counts?.likes || 0,
                  bookmarks: currentData.interaction_counts?.bookmarks || 0,
                  reports: currentData.interaction_counts?.reports || 0,
                }
              })
            }
            
            // 목록 캐시도 업데이트 (ContentCard에서 사용)
            queryClient.setQueriesData({ queryKey: ['contents-v2'] }, (oldData: any) => {
              if (!oldData?.pages) return oldData
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  contents: page.contents?.map((content: any) => 
                    content.id === contentId 
                      ? {
                          ...content,
                          view_count: (content.view_count || 0) + 1,
                          interaction_counts: {
                            ...content.interaction_counts,
                            views: (content.interaction_counts?.views || 0) + 1
                          }
                        }
                      : content
                  )
                }))
              }
            })
          }
        } catch (err) {
          console.error('View count increment failed:', err)
        }
      }
      
      incrementViewCount()
      
    }, [contentId]) // contentId만 의존성으로 (incrementView는 옵션이므로 제외)
    
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
        
        // 카테고리는 content_v2.category 필드에서 직접 사용
        const categories: CategoryV2[] = [] // content_categories_v2 테이블 제거됨
        
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
          views: content.view_count || 0, // content_v2.view_count 컬럼 사용 (interactions_v2가 아님)
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
        
        return {
          ...content,
          categories: [], // content_categories_v2 테이블 제거됨, content.category 직접 사용
          tag_objects: tags?.map(t => t.tag).filter(Boolean) || [],
          interaction_counts: interactionCounts,
          user_interactions: userInteractions,
        } as ContentWithRelations
      },
      staleTime: 2 * 60 * 1000, // 2분
      gcTime: 5 * 60 * 1000, // 5분
      retry: (failureCount, error: any) => {
        // DB 스키마 에러나 컬럼 존재하지 않음 에러는 재시도하지 않음
        if (error?.code === 'PGRST116' || error?.message?.includes('does not exist')) {
          return false
        }
        // 일반적인 네트워크 에러만 최대 1번 재시도
        return failureCount < 1
      },
      retryDelay: 1000, // 1초 고정 지연
      throwOnError: false
    })
  }

  // 콘텐츠 목록 조회 (무한 스크롤)
  const useInfiniteContents = (
    filter: ContentFilter = {},
    sortBy: string | ContentSortBy = 'created_at',
    sortOrder: SortOrder = 'desc',
    pageSize = 20
  ) => {
    return useInfiniteQuery({
      queryKey: ['contents-v2', filter, sortBy, sortOrder],
      queryFn: async ({ pageParam = 0 }) => {
        // 매핑된 정렬 키 사용
        const mappedSortBy = mapSortBy(sortBy as string)
        
        let query = supabase
          .from('content_v2')
          .select(`
            *,
            author:users_v2!author_id(id, name, avatar_url),
            comments:comments_v2!content_id(id)
          `, { count: 'exact' })
          .is('deleted_at', null)
          .eq('status', 'published')
          .range(pageParam, pageParam + pageSize - 1)
          .order(mappedSortBy, { ascending: sortOrder === 'asc' })
        
        // 필터 적용
        if (filter.type) query = query.eq('content_type', filter.type)
        if (filter.authorId) query = query.eq('author_id', filter.authorId)
        if (filter.isPinned !== undefined) query = query.eq('is_pinned', filter.isPinned)
        if (filter.searchQuery) {
          query = query.or(`title.ilike.%${filter.searchQuery}%,content.ilike.%${filter.searchQuery}%`)
        }
        
        // 댓글 필터 - deleted_at이 null인 것만
        query = query.is('comments.deleted_at', null)
        
        // 카테고리 필터 (content_v2.category 필드 사용)
        if (filter.categoryId) {
          // categoryId가 실제로는 category slug일 가능성이 높음
          query = query.eq('category', filter.categoryId)
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
          // 실제 댓글 수 계산 (deleted_at이 null인 댓글만)
          const realCommentCount = Array.isArray(content.comments) 
            ? content.comments.filter((c: any) => c && c.id).length 
            : 0
          
          // 디버깅 로그 제거 (프로덕션에서는 불필요)
          // if (content.title?.includes('GPT') || content.title?.includes('PPT')) {
          //   console.log('[useInfiniteContents] Real comment count:', {
          //     title: content.title,
          //     stored_count: content.comment_count,
          //     real_count: realCommentCount,
          //     comments: content.comments
          //   })
          // }
          const { data: interactions } = await supabase
            .from('interactions_v2')
            .select('interaction_type')
            .eq('target_id', content.id)
            .eq('target_type', 'content')
          
          const interactionCounts = {
            likes: interactions?.filter(i => i.interaction_type === 'like').length || 0,
            bookmarks: interactions?.filter(i => i.interaction_type === 'bookmark').length || 0,
            views: content.view_count || 0, // content_v2.view_count 컬럼 사용 (interactions_v2가 아님)
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
          
          // content.comments 배열 제거하고 실제 댓글 수 사용
          const { comments, ...contentWithoutComments } = content
          
          // 최종 반환 데이터 - 실제 댓글 수로 덮어씌우기
          const result = {
            ...contentWithoutComments,
            comment_count: realCommentCount,  // 실제 댓글 수 사용
            interaction_counts: interactionCounts,
            user_interactions: userInteractions,
          }
          
          // 디버깅 로그 제거 (프로덕션에서는 불필요)
          // if (content.title?.includes('GPT') || content.title?.includes('PPT')) {
          //   console.log('[useInfiniteContents] Final content:', {
          //     title: content.title,
          //     stored_count: content.comment_count,
          //     real_count: realCommentCount,
          //     final_count: result.comment_count
          //   })
          // }
          
          return result
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
      staleTime: 1 * 60 * 1000, // 1분 (적절한 캐시 활용)
      gcTime: 5 * 60 * 1000, // 5분
      refetchOnWindowFocus: false, // Realtime이 처리하므로 비활성화
      refetchOnMount: true, // 캐시 무효화 후 페이지 이동 시 새 데이터 가져오기
      retry: (failureCount, error: any) => {
        // DB 스키마 에러나 컬럼 존재하지 않음 에러는 재시도하지 않음
        if (error?.code === 'PGRST116' || error?.message?.includes('does not exist')) {
          return false
        }
        // 일반적인 네트워크 에러만 최대 1번 재시도
        return failureCount < 1
      },
      retryDelay: 1000, // 1초 고정 지연
      throwOnError: false, // 에러를 조용히 처리하여 UI에 빈 상태 표시
    })
  }

  // 콘텐츠 생성
  const createContent = useMutation({
    mutationFn: async (input: ContentV2Insert & { categories?: string[], tags?: string[] }) => {
      const { categories, tags, ...contentData } = input
      
      // 콘텐츠 생성 (author 정보 포함하여 반환)
      const { data: content, error } = await supabase
        .from('content_v2')
        .insert({
          ...contentData,
          author_id: user?.id!,
          status: contentData.status || 'draft',
        })
        .select(`
          *,
          author:users_v2!author_id(id, name, avatar_url)
        `)
        .single()
      
      if (error) throw error
      
      // 카테고리는 content_v2.category 필드에서 직접 관리
      // content_categories_v2 테이블 제거됨
      
      // 태그 연결
      if (tags && tags.length > 0) {
        await supabase.from('content_tags_v2').insert(
          tags.map(tagId => ({
            content_id: content.id,
            tag_id: tagId,
          }))
        )
      }
      
      // 완전한 데이터 반환 (author 정보 포함)
      return {
        ...content,
        interaction_counts: {
          likes: 0,
          bookmarks: 0,
          views: 0,
          reports: 0
        },
        user_interactions: {
          liked: false,
          bookmarked: false,
          reported: false
        }
      } as ContentWithRelations
    },
    onSuccess: (data) => {
      console.log('[useContentV2] Content created successfully:', data.id)
      
      // 새로 생성된 콘텐츠의 상세 페이지를 미리 캐시
      if (data) {
        queryClient.setQueryData<ContentWithRelations>(['content-v2', data.id], data)
      }
      
      // 간단한 캐시 무효화만 사용 (추후 Realtime이 실제 업데이트 처리)
      queryClient.invalidateQueries({ 
        queryKey: ['contents-v2'],
        exact: false
      })
      
      console.log('[useContentV2] Cache invalidated for contents-v2')
      
      // Realtime이 작동하는지 확인을 위해 약간의 지연 후 다시 확인
      setTimeout(() => {
        const cachedData = queryClient.getQueryData(['contents-v2'])
        console.log('[useContentV2] Checking cache after 500ms:', cachedData ? 'Cache exists' : 'Cache empty')
      }, 500)
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
      // 모든 콘텐츠 목록 관련 쿼리 무효화 - 부분 매칭 활성화
      queryClient.invalidateQueries({ queryKey: ['contents-v2'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['infinite-contents-v2'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['trending-contents-v2'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['user-contents-v2'], exact: false })
      
      console.log('Content updated and cache invalidated:', data?.id)
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
      // 삭제된 콘텐츠 관련 모든 쿼리 무효화 - 부분 매칭 활성화
      queryClient.invalidateQueries({ queryKey: ['content-v2', id] })
      queryClient.invalidateQueries({ queryKey: ['contents-v2'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['infinite-contents-v2'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['trending-contents-v2'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['user-contents-v2'], exact: false })
      
      console.log('Content deleted and cache invalidated:', id)
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