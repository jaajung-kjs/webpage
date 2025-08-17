/**
 * useNotificationsV2 - V2 스키마 기반 알림 관리 Hook
 * 
 * 주요 개선사항:
 * - notifications_v2 테이블 사용
 * - 실시간 알림 구독
 * - 읽음 상태 관리 최적화
 * - Optimistic Updates
 * - 알림 타입별 필터링
 * - 대량 읽음 처리
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers'
import { supabaseClient } from '@/lib/core/connection-core'
import { useEffect, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { 
  NotificationV2, 
  NotificationV2Insert, 
  NotificationV2Update,
  NotificationType 
} from '@/hooks/types/v2-types'

// 확장된 알림 타입 (관계 포함)
export interface NotificationWithRelations extends NotificationV2 {
  sender?: {
    id: string
    name: string
    avatar_url?: string
  }
  related_content?: {
    id: string
    title: string
    type: string
  }
}

// 알림 필터
export interface NotificationFilter {
  type?: NotificationType
  isRead?: boolean
  dateFrom?: string
  dateTo?: string
}

// 알림 통계
export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
}

export function useNotificationsV2() {
  const supabase = supabaseClient()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 실시간 알림 구독
  useEffect(() => {
    if (!user?.id) return

    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel('notifications_v2')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications_v2',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as NotificationV2
            
            // 새 알림을 캐시에 추가
            queryClient.setQueryData<{ pages: any[] }>(['notifications-v2', user.id], (old) => {
              if (!old) return old
              
              const firstPage = old.pages[0]
              if (firstPage) {
                firstPage.notifications = [newNotification, ...firstPage.notifications]
                firstPage.totalCount += 1
              }
              
              return old
            })
            
            // 읽지 않은 알림 수 증가
            queryClient.invalidateQueries({ queryKey: ['unread-notification-count-v2', user.id] })
            
            // 선택적: 브라우저 알림 표시
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message || undefined,
                icon: '/favicon.ico',
              })
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications_v2',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updatedNotification = payload.new as NotificationV2
            
            // 알림 목록 업데이트
            queryClient.setQueryData<{ pages: any[] }>(['notifications-v2', user.id], (old) => {
              if (!old) return old
              
              return {
                ...old,
                pages: old.pages.map(page => ({
                  ...page,
                  notifications: page.notifications.map((notification: NotificationV2) =>
                    notification.id === updatedNotification.id ? updatedNotification : notification
                  )
                }))
              }
            })
            
            // 읽음 상태 변경 시 읽지 않은 알림 수 업데이트
            if (payload.old && (payload.old as NotificationV2).is_read !== updatedNotification.is_read) {
              queryClient.invalidateQueries({ queryKey: ['unread-notification-count-v2', user.id] })
            }
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [user?.id]) // supabase, queryClient 제거 - 싱글톤 인스턴스

  // 알림 목록 조회 (무한 스크롤)
  const useNotifications = (filter: NotificationFilter = {}, pageSize = 20) => {
    return useInfiniteQuery({
      queryKey: ['notifications-v2', user?.id, filter],
      queryFn: async ({ pageParam = 0 }) => {
        if (!user?.id) throw new Error('User not authenticated')

        let query = supabase
          .from('notifications_v2')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .range(pageParam, pageParam + pageSize - 1)
          .order('created_at', { ascending: false })

        // 필터 적용
        if (filter.type) query = query.eq('type', filter.type)
        if (filter.isRead !== undefined) query = query.eq('is_read', filter.isRead)
        if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom)
        if (filter.dateTo) query = query.lte('created_at', filter.dateTo)

        const { data, error, count } = await query

        if (error) throw error

        return {
          notifications: data || [],
          nextCursor: pageParam + pageSize,
          hasMore: (count || 0) > pageParam + pageSize,
          totalCount: count || 0,
        }
      },
      getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
      initialPageParam: 0,
      enabled: !!user?.id,
      staleTime: 30 * 1000, // 30초
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 읽지 않은 알림 수 조회
  const useUnreadCount = () => {
    return useQuery({
      queryKey: ['unread-notification-count-v2', user?.id],
      queryFn: async () => {
        if (!user?.id) return 0

        const { data, error } = await supabase
          .rpc('get_unread_notification_count_v2', {
            p_user_id: user.id
          })

        if (error) throw error
        return data || 0
      },
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000, // 2 minutes (Real-time handles updates)
      gcTime: 5 * 60 * 1000, // 5분
      refetchOnWindowFocus: false, // Real-time handles updates
    })
  }

  // 알림 통계 조회
  const useNotificationStats = () => {
    return useQuery({
      queryKey: ['notification-stats-v2', user?.id],
      queryFn: async () => {
        if (!user?.id) throw new Error('User not authenticated')

        const { data, error } = await supabase
          .from('notifications_v2')
          .select('type, is_read')
          .eq('user_id', user.id)

        if (error) throw error

        const stats: NotificationStats = {
          total: data?.length || 0,
          unread: data?.filter(n => !n.is_read).length || 0,
          byType: {} as Record<NotificationType, number>
        }

        // 타입별 통계 계산
        const types: NotificationType[] = [
          'comment', 'like', 'mention', 'activity', 'system'
        ]

        types.forEach(type => {
          stats.byType[type] = data?.filter(n => n.type === type).length || 0
        })

        return stats
      },
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000, // 2분
      gcTime: 5 * 60 * 1000, // 5분
    })
  }

  // 알림 읽음 처리 (단일)
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('notifications_v2')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (notificationId) => {
      // Optimistic Update
      queryClient.setQueryData<{ pages: any[] }>(['notifications-v2', user?.id], (old) => {
        if (!old) return old
        
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            notifications: page.notifications.map((notification: NotificationV2) =>
              notification.id === notificationId
                ? { ...notification, is_read: true, read_at: new Date().toISOString() }
                : notification
            )
          }))
        }
      })

      // 읽지 않은 알림 수 감소
      queryClient.setQueryData<number>(['unread-notification-count-v2', user?.id], (old) => {
        return Math.max(0, (old || 1) - 1)
      })

      return { notificationId }
    },
    onError: (err, variables, context) => {
      // 롤백
      queryClient.invalidateQueries({ queryKey: ['notifications-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count-v2', user?.id] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-stats-v2', user?.id] })
    }
  })

  // 여러 알림 읽음 처리 (RPC 함수 사용)
  const markMultipleAsRead = useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .rpc('mark_notifications_read_v2', {
          p_user_id: user.id,
          p_notification_ids: notificationIds || undefined
        })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // 모든 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['notifications-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats-v2', user?.id] })
    }
  })

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(() => {
    markMultipleAsRead.mutate([])
  }, [markMultipleAsRead])

  // 알림 삭제
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('notifications_v2')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onMutate: async (notificationId) => {
      // Optimistic Update
      queryClient.setQueryData<{ pages: any[] }>(['notifications-v2', user?.id], (old) => {
        if (!old) return old
        
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            notifications: page.notifications.filter((n: NotificationV2) => n.id !== notificationId),
            totalCount: Math.max(0, page.totalCount - 1)
          }))
        }
      })

      return { notificationId }
    },
    onError: (err, variables, context) => {
      // 롤백
      queryClient.invalidateQueries({ queryKey: ['notifications-v2', user?.id] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats-v2', user?.id] })
    }
  })

  // 읽은 알림 일괄 삭제
  const deleteReadNotifications = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('notifications_v2')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true)

      if (error) throw error
    },
    onSuccess: () => {
      // 모든 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['notifications-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['unread-notification-count-v2', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats-v2', user?.id] })
    }
  })

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission
    }
    return 'denied'
  }, [])

  // 알림 설정 조회 (사용자 설정에서 알림 타입별 on/off)
  const useNotificationSettings = () => {
    return useQuery({
      queryKey: ['notification-settings-v2', user?.id],
      queryFn: async () => {
        if (!user?.id) throw new Error('User not authenticated')

        // 사용자 설정에서 알림 설정 조회 (예시)
        const { data, error } = await supabase
          .from('users_v2')
          .select('notification_settings, metadata')
          .eq('id', user.id)
          .single()

        if (error) throw error

        // 기본 설정
        const defaultSettings: Record<NotificationType, boolean> = {
          comment: true,
          like: true,
          mention: true,
          activity: true,
          system: true,
        }

        // 현재는 기본 설정만 사용
        return { ...defaultSettings }
      },
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
    })
  }

  return {
    // Query Hooks
    useNotifications,
    useUnreadCount,
    useNotificationStats,
    useNotificationSettings,

    // Mutations
    markAsRead: markAsRead.mutate,
    markAsReadAsync: markAsRead.mutateAsync,
    markMultipleAsRead: markMultipleAsRead.mutate,
    markMultipleAsReadAsync: markMultipleAsRead.mutateAsync,
    markAllAsRead,
    deleteNotification: deleteNotification.mutate,
    deleteNotificationAsync: deleteNotification.mutateAsync,
    deleteReadNotifications: deleteReadNotifications.mutate,
    deleteReadNotificationsAsync: deleteReadNotifications.mutateAsync,

    // 브라우저 알림
    requestNotificationPermission,

    // 상태
    isMarkingAsRead: markAsRead.isPending,
    isMarkingMultiple: markMultipleAsRead.isPending,
    isDeleting: deleteNotification.isPending,
    isDeletingRead: deleteReadNotifications.isPending,
  }
}

// 알림 타입별 설정
export const NOTIFICATION_CONFIG = {
  comment: {
    icon: '💬',
    title: '댓글',
    description: '내 게시물에 댓글이 달렸을 때',
    color: 'text-blue-500'
  },
  like: {
    icon: '👍',
    title: '좋아요',
    description: '내 게시물에 좋아요가 눌렸을 때',
    color: 'text-red-500'
  },
  follow: {
    icon: '👤',
    title: '팔로우',
    description: '다른 사용자가 나를 팔로우했을 때',
    color: 'text-green-500'
  },
  mention: {
    icon: '@',
    title: '멘션',
    description: '다른 사용자가 나를 멘션했을 때',
    color: 'text-purple-500'
  },
  content_approved: {
    icon: '✅',
    title: '콘텐츠 승인',
    description: '내 콘텐츠가 승인되었을 때',
    color: 'text-green-600'
  },
  content_rejected: {
    icon: '❌',
    title: '콘텐츠 거절',
    description: '내 콘텐츠가 거절되었을 때',
    color: 'text-red-600'
  },
  membership_approved: {
    icon: '🎉',
    title: '멤버십 승인',
    description: '멤버십 신청이 승인되었을 때',
    color: 'text-green-600'
  },
  membership_rejected: {
    icon: '🚫',
    title: '멤버십 거절',
    description: '멤버십 신청이 거절되었을 때',
    color: 'text-red-600'
  },
  system: {
    icon: '⚙️',
    title: '시스템',
    description: '시스템 관련 알림',
    color: 'text-gray-500'
  },
  announcement: {
    icon: '📢',
    title: '공지사항',
    description: '새로운 공지사항이 등록되었을 때',
    color: 'text-orange-500'
  }
} as const