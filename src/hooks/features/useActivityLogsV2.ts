/**
 * useActivityLogsV2 - V2 스키마 기반 사용자 활동 로그 관리 Hook
 * 
 * 주요 기능:
 * - log_activity_v2 RPC 함수를 통한 활동 로깅
 * - 사용자별 활동 추적 및 통계
 * - 활동 타입별 필터링
 * - 실시간 활동 피드
 * - 활동 점수 연동
 * - Optimistic Updates
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { supabaseClient } from '@/lib/core/connection-core'
import type { Database } from '@/lib/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/providers'

type Tables = Database['public']['Tables']
type UserV2 = Tables['users_v2']['Row']

// 활동 로그 타입 (log_activity_v2 RPC 함수와 연동)
export type ActivityType = 
  | 'login'           // 로그인
  | 'logout'          // 로그아웃
  | 'create_content'  // 콘텐츠 생성
  | 'edit_content'    // 콘텐츠 수정
  | 'delete_content'  // 콘텐츠 삭제
  | 'like_content'    // 콘텐츠 좋아요
  | 'unlike_content'  // 콘텐츠 좋아요 취소
  | 'comment'         // 댓글 작성
  | 'edit_comment'    // 댓글 수정
  | 'delete_comment'  // 댓글 삭제
  | 'bookmark'        // 북마크
  | 'unbookmark'      // 북마크 해제
  | 'follow_user'     // 사용자 팔로우
  | 'unfollow_user'   // 사용자 언팔로우
  | 'join_activity'   // 활동 참가
  | 'leave_activity'  // 활동 참가 취소
  | 'report_content'  // 콘텐츠 신고
  | 'report_user'     // 사용자 신고
  | 'profile_update'  // 프로필 업데이트
  | 'search'          // 검색
  | 'view_content'    // 콘텐츠 조회
  | 'download'        // 다운로드
  | 'upload'          // 업로드

// 활동 로그 인터페이스 (RPC 함수 기반)
export interface ActivityLog {
  id: string
  user_id: string
  action: ActivityType
  table_name: string
  record_id?: string
  metadata?: any
  created_at: string
  user?: Pick<UserV2, 'id' | 'name' | 'avatar_url'>
}

// 확장된 활동 로그 (관계 포함)
export interface ActivityLogWithRelations extends ActivityLog {
  user: Pick<UserV2, 'id' | 'name' | 'avatar_url' | 'department'>
  target?: {
    id: string
    title?: string
    name?: string
    type: string
  }
}

// 활동 필터
export interface ActivityLogFilter {
  action?: ActivityType
  tableName?: string
  dateFrom?: string
  dateTo?: string
  userId?: string
}

// 활동 로그 통계
export interface ActivityLogStats {
  user_id: string
  total_activities: number
  today_activities: number
  this_week_activities: number
  this_month_activities: number
  by_action: Record<ActivityType, number>
  most_active_hours: number[]
  activity_streak: number
}

// 활동 요약
export interface ActivitySummary {
  action: ActivityType
  count: number
  last_activity: string
  target_info?: {
    type: string
    title?: string
    name?: string
  }
}

export function useActivityLogsV2() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 실시간 활동 로그 구독 (현재 사용자용)
  useEffect(() => {
    if (!user?.id) return

    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = () => {
      // audit_logs_v2 테이블을 통해 활동 로그를 구독
      // (log_activity_v2 RPC 함수가 audit_logs_v2에 기록한다고 가정)
      channel = supabaseClient
        .channel('user_activity_logs')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_logs_v2',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newLog = payload.new as any
            
            // 새 활동을 캐시에 추가
            queryClient.setQueryData<{ pages: any[] }>(['activity-logs-v2', user.id], (old) => {
              if (!old) return old
              
              const firstPage = old.pages[0]
              if (firstPage) {
                firstPage.logs = [newLog, ...firstPage.logs]
                firstPage.totalCount += 1
              }
              
              return old
            })
            
            // 활동 통계 무효화
            queryClient.invalidateQueries({ queryKey: ['activity-stats-v2', user.id] })
            queryClient.invalidateQueries({ queryKey: ['recent-activities-v2', user.id] })
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabaseClient.removeChannel(channel)
      }
    }
  }, [user?.id, supabaseClient, queryClient])

  // 사용자 활동 로그 목록 조회 (무한 스크롤)
  const useActivityLogs = (filter: ActivityLogFilter = {}, pageSize = 50) => {
    return useInfiniteQuery({
      queryKey: ['activity-logs-v2', filter],
      queryFn: async ({ pageParam = 0 }) => {
        // audit_logs_v2 테이블에서 사용자 활동 로그 조회
        let query = supabaseClient
          .from('audit_logs_v2')
          .select(`
            *,
            user:users_v2!user_id(id, name, avatar_url, department)
          `, { count: 'exact' })
          .range(pageParam, pageParam + pageSize - 1)
          .order('created_at', { ascending: false })

        // 필터 적용
        if (filter.userId) query = query.eq('user_id', filter.userId)
        if (filter.action) query = query.eq('action', filter.action)
        if (filter.tableName) query = query.eq('table_name', filter.tableName)
        if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom)
        if (filter.dateTo) query = query.lte('created_at', filter.dateTo)

        const { data, error, count } = await query

        if (error) throw error

        const logs = (data || []).map(log => ({
          id: log.id.toString(),
          user_id: log.user_id || '',
          action: log.action as ActivityType,
          table_name: log.table_name,
          record_id: log.record_id || undefined,
          metadata: log.new_values,
          created_at: log.created_at,
          user: log.user
        }))

        return {
          logs: logs as ActivityLogWithRelations[],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      enabled: true,
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
      initialPageParam: 0
    })
  }

  // 현재 사용자 활동 로그 조회
  const useMyActivityLogs = (limit = 50) => {
    return useActivityLogs(
      { userId: user?.id }, 
      limit
    )
  }

  // 최근 활동 요약 조회
  const useRecentActivities = (limit = 10) => {
    return useQuery({
      queryKey: ['recent-activities-v2', user?.id, limit],
      queryFn: async () => {
        if (!user?.id) return []

        const { data, error } = await supabaseClient
          .from('audit_logs_v2')
          .select(`
            action,
            table_name,
            record_id,
            new_values,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) throw error

        // 액션별로 그룹화하여 요약
        const activityMap = new Map<ActivityType, ActivitySummary>()
        
        data?.forEach(log => {
          const action = log.action as ActivityType
          const existing = activityMap.get(action)
          
          if (existing) {
            existing.count += 1
            // 더 최근 활동이면 업데이트
            if (new Date(log.created_at) > new Date(existing.last_activity)) {
              existing.last_activity = log.created_at
            }
          } else {
            activityMap.set(action, {
              action,
              count: 1,
              last_activity: log.created_at,
              target_info: {
                type: log.table_name,
                title: (log.new_values as any)?.title || (log.new_values as any)?.name
              }
            })
          }
        })

        return Array.from(activityMap.values())
          .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
      },
      enabled: !!user?.id,
      staleTime: 1 * 60 * 1000, // 1분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 사용자 활동 통계 조회
  const useActivityStats = (userId?: string) => {
    const targetUserId = userId || user?.id

    return useQuery({
      queryKey: ['activity-stats-v2', targetUserId],
      queryFn: async () => {
        if (!targetUserId) throw new Error('User ID required')

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        // 전체 활동 조회
        const { data, error } = await supabaseClient
          .from('audit_logs_v2')
          .select('action, created_at')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })

        if (error) throw error

        const activities = data || []
        
        const stats: ActivityLogStats = {
          user_id: targetUserId,
          total_activities: activities.length,
          today_activities: activities.filter(a => new Date(a.created_at) >= today).length,
          this_week_activities: activities.filter(a => new Date(a.created_at) >= thisWeek).length,
          this_month_activities: activities.filter(a => new Date(a.created_at) >= thisMonth).length,
          by_action: {} as Record<ActivityType, number>,
          most_active_hours: [],
          activity_streak: 0
        }

        // 액션별 통계
        const actionTypes: ActivityType[] = [
          'login', 'logout', 'create_content', 'edit_content', 'delete_content',
          'like_content', 'unlike_content', 'comment', 'edit_comment', 'delete_comment',
          'bookmark', 'unbookmark', 'follow_user', 'unfollow_user',
          'join_activity', 'leave_activity', 'report_content', 'report_user',
          'profile_update', 'search', 'view_content', 'download', 'upload'
        ]

        actionTypes.forEach(action => {
          stats.by_action[action] = activities.filter(a => a.action === action).length
        })

        // 가장 활발한 시간대 계산
        const hourCounts = new Array(24).fill(0)
        activities.forEach(activity => {
          const hour = new Date(activity.created_at).getHours()
          hourCounts[hour] += 1
        })
        
        const maxCount = Math.max(...hourCounts)
        stats.most_active_hours = hourCounts
          .map((count, hour) => ({ hour, count }))
          .filter(({ count }) => count === maxCount)
          .map(({ hour }) => hour)

        // 연속 활동 일수 계산 (단순화된 버전)
        const activityDates = Array.from(
          new Set(activities.map(a => new Date(a.created_at).toDateString()))
        ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

        let streak = 0
        let currentDate = new Date()
        
        for (const dateStr of activityDates) {
          const activityDate = new Date(dateStr)
          const daysDiff = Math.floor((currentDate.getTime() - activityDate.getTime()) / (24 * 60 * 60 * 1000))
          
          if (daysDiff <= streak + 1) {
            streak = daysDiff + 1
            currentDate = activityDate
          } else {
            break
          }
        }
        
        stats.activity_streak = streak

        return stats
      },
      enabled: !!targetUserId,
      staleTime: 2 * 60 * 1000, // 2분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 활동 로깅 (log_activity_v2 RPC 함수 사용)
  const logActivity = useMutation({
    mutationFn: async ({
      action,
      tableName,
      recordId,
      metadata
    }: {
      action: ActivityType
      tableName: string
      recordId?: string
      metadata?: any
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabaseClient
        .rpc('log_activity_v2', {
          p_user_id: user.id,
          p_action: action,
          p_table_name: tableName,
          p_record_id: recordId,
          p_metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
        })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // 활동 로그와 통계 무효화
      queryClient.invalidateQueries({ queryKey: ['activity-logs-v2'] })
      queryClient.invalidateQueries({ queryKey: ['activity-stats-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities-v2', user?.id] })
    }
  })

  // 편의 메서드들
  const logContentView = useCallback((contentId: string, contentTitle?: string) => {
    logActivity.mutate({
      action: 'view_content',
      tableName: 'content_v2',
      recordId: contentId,
      metadata: { title: contentTitle }
    })
  }, [logActivity])

  const logContentLike = useCallback((contentId: string, liked: boolean) => {
    logActivity.mutate({
      action: liked ? 'like_content' : 'unlike_content',
      tableName: 'content_v2',
      recordId: contentId
    })
  }, [logActivity])

  const logComment = useCallback((contentId: string, commentId: string) => {
    logActivity.mutate({
      action: 'comment',
      tableName: 'comments_v2',
      recordId: commentId,
      metadata: { content_id: contentId }
    })
  }, [logActivity])

  const logSearch = useCallback((query: string, resultsCount: number) => {
    logActivity.mutate({
      action: 'search',
      tableName: 'search_logs',
      metadata: { query, results_count: resultsCount }
    })
  }, [logActivity])

  const logLogin = useCallback(() => {
    logActivity.mutate({
      action: 'login',
      tableName: 'auth.users'
    })
  }, [logActivity])

  const logProfileUpdate = useCallback((updates: any) => {
    logActivity.mutate({
      action: 'profile_update',
      tableName: 'users_v2',
      recordId: user?.id,
      metadata: updates
    })
  }, [logActivity, user?.id])

  return {
    // Query Hooks
    useActivityLogs,
    useMyActivityLogs,
    useRecentActivities,
    useActivityStats,

    // Mutations
    logActivity: logActivity.mutate,
    logActivityAsync: logActivity.mutateAsync,

    // 편의 메서드
    logContentView,
    logContentLike,
    logComment,
    logSearch,
    logLogin,
    logProfileUpdate,

    // 상태
    isLogging: logActivity.isPending,
  }
}

// 활동 타입별 설정
export const ACTIVITY_TYPE_CONFIG = {
  login: {
    icon: '🔐',
    label: '로그인',
    color: 'text-green-600',
    description: '시스템에 로그인'
  },
  logout: {
    icon: '👋',
    label: '로그아웃',
    color: 'text-gray-600',
    description: '시스템에서 로그아웃'
  },
  create_content: {
    icon: '✏️',
    label: '콘텐츠 생성',
    color: 'text-blue-600',
    description: '새 콘텐츠 작성'
  },
  edit_content: {
    icon: '📝',
    label: '콘텐츠 수정',
    color: 'text-orange-600',
    description: '콘텐츠 편집'
  },
  delete_content: {
    icon: '🗑️',
    label: '콘텐츠 삭제',
    color: 'text-red-600',
    description: '콘텐츠 삭제'
  },
  like_content: {
    icon: '👍',
    label: '좋아요',
    color: 'text-red-500',
    description: '콘텐츠에 좋아요'
  },
  unlike_content: {
    icon: '👎',
    label: '좋아요 취소',
    color: 'text-gray-500',
    description: '좋아요 취소'
  },
  comment: {
    icon: '💬',
    label: '댓글 작성',
    color: 'text-blue-500',
    description: '댓글 작성'
  },
  edit_comment: {
    icon: '📝',
    label: '댓글 수정',
    color: 'text-orange-500',
    description: '댓글 수정'
  },
  delete_comment: {
    icon: '🗑️',
    label: '댓글 삭제',
    color: 'text-red-500',
    description: '댓글 삭제'
  },
  bookmark: {
    icon: '🔖',
    label: '북마크',
    color: 'text-yellow-600',
    description: '콘텐츠 북마크'
  },
  unbookmark: {
    icon: '📌',
    label: '북마크 해제',
    color: 'text-gray-500',
    description: '북마크 해제'
  },
  follow_user: {
    icon: '👤',
    label: '팔로우',
    color: 'text-green-500',
    description: '사용자 팔로우'
  },
  unfollow_user: {
    icon: '👥',
    label: '언팔로우',
    color: 'text-gray-500',
    description: '사용자 언팔로우'
  },
  join_activity: {
    icon: '🎯',
    label: '활동 참가',
    color: 'text-purple-600',
    description: '활동에 참가'
  },
  leave_activity: {
    icon: '🚪',
    label: '활동 취소',
    color: 'text-gray-600',
    description: '활동 참가 취소'
  },
  report_content: {
    icon: '🚨',
    label: '콘텐츠 신고',
    color: 'text-red-700',
    description: '부적절한 콘텐츠 신고'
  },
  report_user: {
    icon: '⚠️',
    label: '사용자 신고',
    color: 'text-red-700',
    description: '사용자 신고'
  },
  profile_update: {
    icon: '👤',
    label: '프로필 업데이트',
    color: 'text-blue-500',
    description: '프로필 정보 수정'
  },
  search: {
    icon: '🔍',
    label: '검색',
    color: 'text-gray-600',
    description: '콘텐츠 검색'
  },
  view_content: {
    icon: '👁️',
    label: '콘텐츠 조회',
    color: 'text-gray-500',
    description: '콘텐츠 열람'
  },
  download: {
    icon: '⬇️',
    label: '다운로드',
    color: 'text-indigo-600',
    description: '파일 다운로드'
  },
  upload: {
    icon: '⬆️',
    label: '업로드',
    color: 'text-green-600',
    description: '파일 업로드'
  }
} as const